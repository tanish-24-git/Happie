"""Model management API endpoints"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Optional
import json
import asyncio
from pathlib import Path
import re
import time
from concurrent.futures import ThreadPoolExecutor

from hapie.models import ModelManager

router = APIRouter()

# Global model manager
model_manager = ModelManager()


class ModelResponse(BaseModel):
    """Model information response"""
    model_config = {"protected_namespaces": ()}
    id: str
    name: str
    type: str
    provider: Optional[str] = None
    size_mb: Optional[float] = None
    backend: str
    is_active: bool
    is_base_model: bool
    model_path: Optional[str] = None
    metadata: Optional[Dict] = None
    created_at: int


class PullModelRequest(BaseModel):
    """Request to pull a model from HuggingFace"""
    model_config = {"protected_namespaces": ()}
    repo_id: str
    filename: str
    model_id: Optional[str] = None
    name: Optional[str] = None


class AddCloudModelRequest(BaseModel):
    """Request to add a cloud API model"""
    model_id: str
    name: str
    provider: str
    api_endpoint: str
    cloud_model_name: Optional[str] = None
    api_key: Optional[str] = None


class ValidateCloudModelRequest(BaseModel):
    """Request to validate a cloud model without saving"""
    provider: str
    api_key: str
    model_id: Optional[str] = None
    base_url: Optional[str] = None


class RegisterModelRequest(BaseModel):
    """Request to register a local model"""
    model_config = {"protected_namespaces": ()}
    model_id: str
    name: str
    model_type: str
    provider: str
    backend: str
    model_path: str
    size_mb: float = 0
    is_base_model: bool = False
    metadata: Optional[Dict] = None


@router.get("/catalog")
async def get_model_catalog():
    """Return MODEL_CATALOG and TASK_MAP keys for frontend routing decisions."""
    from hapie.api.recommend import MODEL_CATALOG, TASK_MAP
    return {"MODEL_CATALOG": MODEL_CATALOG, "TASK_MAP": TASK_MAP}


@router.get("/", response_model=List[ModelResponse])
async def list_models():
    """List all registered models"""
    return model_manager.list_models()


@router.get("/active/current", response_model=Optional[ModelResponse])
async def get_active_model():
    """Get currently active model"""
    return model_manager.get_active_model()


@router.get("/hardware-check")
async def check_hardware():
    """Detect GPU availability for runtime quantization."""
    try:
        from hapie.hardware import HardwareDetector
        detector = HardwareDetector()
        cap = detector.detect()
        gv = (cap.gpu_vendor or "").lower()
        has_gpu = gv not in ("none", "unknown", "cpu", "") and bool(cap.gpu_vram_gb) and cap.gpu_vram_gb > 0.5
        return {
            "has_gpu": has_gpu, "gpu_vendor": cap.gpu_vendor or "None",
            "gpu_name": cap.gpu_name or "None", "vram_gb": round(cap.gpu_vram_gb or 0, 1),
            "total_ram_gb": round(cap.total_ram_gb or 0, 1),
            "recommended": "bitsandbytes" if has_gpu else "cpu_quant"
        }
    except:
        return {"has_gpu": False, "recommended": "cpu_quant"}


@router.get("/{model_id}", response_model=ModelResponse)
async def get_model(model_id: str):
    """Get model by ID"""
    model = model_manager.get_model(model_id)
    if not model:
        raise HTTPException(status_code=404, detail=f"Model {model_id} not found")
    return model


@router.post("/active/{model_id}")
async def set_active_model(model_id: str):
    """Set a model as active"""
    success = model_manager.set_active_model(model_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Model {model_id} not found")
    return {"status": "success", "active_model": model_id}


@router.post("/pull", response_model=ModelResponse)
async def pull_model(request: PullModelRequest):
    """Pull a GGUF model from HuggingFace (legacy blocking endpoint)"""
    try:
        model = model_manager.pull_huggingface_model(
            repo_id=request.repo_id,
            filename=request.filename,
            model_id=request.model_id,
            name=request.name
        )
        return model
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to pull model: {str(e)}")


@router.post("/cloud", response_model=ModelResponse)
async def add_cloud_model(request: AddCloudModelRequest):
    """Add a cloud API model"""
    try:
        model = model_manager.add_cloud_model(
            model_id=request.model_id,
            name=request.name,
            provider=request.provider,
            api_endpoint=request.api_endpoint,
            api_key=request.api_key
        )
        return model
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add cloud model: {str(e)}")


@router.post("/register", response_model=ModelResponse)
async def register_model(request: RegisterModelRequest):
    """Register a local model manually"""
    try:
        model = model_manager.register_model(
            model_id=request.model_id,
            name=request.name,
            model_type=request.model_type,
            provider=request.provider,
            backend=request.backend,
            model_path=request.model_path,
            size_mb=request.size_mb,
            is_base_model=request.is_base_model,
            metadata=request.metadata
        )
        return model
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to register model: {str(e)}")


@router.delete("/{model_id}")
async def remove_model(model_id: str):
    """Remove a model from registry and delete files"""
    try:
        success = model_manager.remove_model(model_id)
        if not success:
            raise HTTPException(status_code=404, detail=f"Model {model_id} not found")
        return {"status": "success", "message": f"Model {model_id} removed"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to remove model: {str(e)}")


@router.post("/cloud/validate")
async def validate_cloud_model(request: ValidateCloudModelRequest):
    """Validate cloud model API key"""
    try:
        from hapie.cloud import ProviderRegistry
        provider = ProviderRegistry.get(request.provider)
        is_valid = await provider.validate_key(request.api_key)
        return {
            "valid": is_valid,
            "provider": request.provider,
            "model_id": request.model_id or getattr(provider, "default_model", "")
        }
    except Exception as e:
        return {"valid": False, "error": str(e)}


# ============================================================
# RESOLVE: List GGUF files from any HuggingFace repo
# ============================================================

QUANT_INFO = {
    "q8_0": {"bits": 8, "quality": "High quality, near-lossless", "practical": True, "note": "Best for systems with plenty of RAM"},
    "q6_k": {"bits": 6, "quality": "Very high quality", "practical": True, "note": "Excellent balance of size and quality"},
    "q5_k_m": {"bits": 5, "quality": "Good quality", "practical": True, "note": "Solid choice for mid-range hardware"},
    "q4_k_m": {"bits": 4, "quality": "Best balance", "practical": True, "note": "Recommended for most users"},
    "q4_k_s": {"bits": 4, "quality": "Compact 4-bit", "practical": True, "note": "Smaller, slightly lower quality"},
    "q2_k": {"bits": 2, "quality": "Very degraded", "practical": None, "note": "For extreme memory constraints"},
}

@router.post("/resolve-hf")
async def resolve_hf_repo(request: dict):
    """List available GGUF files from a HuggingFace repo."""
    from huggingface_hub import list_repo_files
    from hapie.cloud import ApiKeyManager
    
    repo_id = request.get("repo_id", "").strip()
    if not repo_id or "/" not in repo_id:
        raise HTTPException(status_code=400, detail="Invalid repo_id. Must be 'owner/model'.")

    from hapie.cloud import ApiKeyManager
    db_conn = model_manager.db
    session = db_conn.get_session()
    token = None
    try:
        mgr = ApiKeyManager(session)
        token = mgr.get_key("huggingface")
    except: pass
    finally: session.close()

    try:
        all_files = list(list_repo_files(repo_id, token=token))
    except Exception as e:
        if "401" in str(e) or "403" in str(e):
            raise HTTPException(status_code=401, detail="Repo requires authentication. Check Settings.")
        raise HTTPException(status_code=404, detail=str(e))

    gguf_files = [f for f in all_files if f.lower().endswith(".gguf")]
    if not gguf_files:
        raise HTTPException(status_code=422, detail="No GGUF files found.")

    annotated = []
    for fname in sorted(gguf_files):
        fname_l = fname.lower()
        detected_quant, quant_meta = None, None
        for qkey in sorted(QUANT_INFO.keys(), key=len, reverse=True):
            if qkey in fname_l.replace("_", "") or qkey in fname_l:
                detected_quant, quant_meta = qkey, QUANT_INFO[qkey]
                break
        annotated.append({
            "filename": fname,
            "quant": detected_quant,
            "quant_bits": quant_meta["bits"] if quant_meta else None,
            "quality": quant_meta["quality"] if quant_meta else "Unknown",
            "practical": quant_meta["practical"] if quant_meta else None,
            "note": quant_meta["note"] if quant_meta else "",
        })
    return {"repo_id": repo_id, "files": annotated, "total": len(annotated)}


@router.post("/pull-stream")
async def pull_model_stream_endpoint(request: dict):
    """Stream GGUF download progress."""
    from hapie.api.recommend import MODEL_CATALOG, TASK_MAP
    
    query = request.get("query", "").strip()
    direct_repo = request.get("repo_id", "").strip()
    direct_filename = request.get("filename", "").strip()

    repo_id, filename, model_id, name = None, None, None, None

    if direct_repo and direct_filename:
        repo_id, filename = direct_repo, direct_filename
        model_id = Path(filename).stem.lower().replace(" ", "-")
        name = request.get("name") or f"{direct_repo.split('/')[-1]} ({Path(filename).stem})"
    else:
        raw = query
        for prefix in ["hapie pull ", "/pull ", "pull "]:
            if raw.lower().startswith(prefix):
                raw = raw[len(prefix):].strip(); break
        
        cq = raw.lower()
        if cq in MODEL_CATALOG:
            m = MODEL_CATALOG[cq]
            repo_id, filename, model_id, name = m["repo_id"], m["filename"], cq, m["name"]
        elif cq in TASK_MAP:
            mid = TASK_MAP[cq]
            m = MODEL_CATALOG[mid]
            repo_id, filename, model_id, name = m["repo_id"], m["filename"], mid, m["name"]
        elif ":" in raw:
            p = raw.split(":", 1)
            repo_id, filename = p[0].strip(), p[1].strip()
            model_id = Path(filename).stem.lower()
            name = filename
        elif re.match(r'^[\w.-]+/[\w.-][\w./-]*$', raw) and ".gguf" not in raw.lower():
            async def q_gen():
                yield json.dumps({"status": "needs_quant_selection", "repo_id": raw}) + "\n"
            return StreamingResponse(q_gen(), media_type="application/x-ndjson")

    if not repo_id or not filename:
        async def err(): yield json.dumps({"status": "error", "error": "Could not resolve model."}) + "\n"
        return StreamingResponse(err(), media_type="application/x-ndjson")

    async def event_gen():
        try:
            async for prog in model_manager.pull_model_stream(repo_id, filename, model_id, name):
                yield json.dumps(prog) + "\n"
        except Exception as e:
            yield json.dumps({"status": "error", "error": str(e)}) + "\n"

    return StreamingResponse(event_gen(), media_type="application/x-ndjson")


@router.post("/pull/cancel")
async def cancel_pull(request: dict):
    model_id = request.get("model_id")
    if not model_id: raise HTTPException(status_code=400, detail="model_id required")
    model_manager.cancel_download(model_id)
    return {"status": "success"}




@router.post("/pull-full-stream")
async def pull_full_model_stream_endpoint(request: dict):
    """Stream full HF model download (snapshot_download) with tag for runtime quantization."""
    repo_id = request.get("repo_id", "").strip()
    runtime_quant = request.get("runtime_quant") or "full"

    if not repo_id or "/" not in repo_id:
        async def err(): yield json.dumps({"status": "error", "error": "repo_id required"}) + "\n"
        return StreamingResponse(err(), media_type="application/x-ndjson")

    model_slug = repo_id.split("/")[-1]
    name = f"{model_slug} ({runtime_quant})"
    model_id = f"{model_slug.lower().replace('-', '_')}_{runtime_quant}"

    from hapie.cloud import ApiKeyManager
    db_conn = model_manager.db
    session = db_conn.get_session()
    token = None
    try:
        mgr = ApiKeyManager(session); token = mgr.get_key("huggingface")
    except: pass
    finally: session.close()

    async def event_stream():
        executor = ThreadPoolExecutor(max_workers=1)
        loop = asyncio.get_event_loop()
        
        total_size_bytes = 0
        try:
            from huggingface_hub import model_info
            info = model_info(repo_id, token=token)
            total_size_bytes = sum(getattr(f, "size", 0) for f in info.siblings if f.rfilename not in (".gitattributes", "README.md"))
        except: pass

        yield json.dumps({"status": "downloading", "modelId": model_id, "progress": 0, "totalSize": total_size_bytes, "downloaded": 0, "speed": "Metadata...", "eta": "..."}) + "\n"

        local_dir = Path.home() / ".hapie" / "models" / repo_id.replace("/", "_")

        def do_download():
            from huggingface_hub import snapshot_download
            return snapshot_download(repo_id=repo_id, local_dir=str(local_dir), local_dir_use_symlinks=False, token=token)

        future = loop.run_in_executor(executor, do_download)
        try:
            while not future.done():
                await asyncio.sleep(2)
                dl = 0
                if local_dir.exists():
                    dl = sum(f.stat().st_size for f in local_dir.rglob("*") if f.is_file())
                
                prog = min(98, int((dl / total_size_bytes * 100))) if total_size_bytes > 0 else 50
                yield json.dumps({"status": "downloading", "modelId": model_id, "progress": prog, "totalSize": total_size_bytes, "downloaded": dl, "speed": "Downloading snapshot...", "eta": "..."}) + "\n"

            result_path = await future
            size_mb = sum(f.stat().st_size for f in Path(result_path).rglob("*") if f.is_file()) / (1024*1024)

            model_manager.register_model(
                model_id=model_id, name=name, model_type="local", provider="huggingface",
                backend="transformers", model_path=result_path, size_mb=size_mb,
                metadata={"repo_id": repo_id, "runtime_quant": runtime_quant, "download_type": "snapshot"}
            )
            yield json.dumps({"status": "complete", "modelId": model_id, "progress": 100, "totalSize": int(size_mb*1024*1024), "speed": "Done", "eta": "0s"}) + "\n"
        except Exception as e:
            yield json.dumps({"status": "error", "error": str(e)}) + "\n"

    return StreamingResponse(event_stream(), media_type="application/x-ndjson")
