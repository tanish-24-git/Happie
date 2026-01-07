"""Model management API endpoints"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional

from hapie.models import ModelManager

router = APIRouter()

# Global model manager
model_manager = ModelManager()


class ModelResponse(BaseModel):
    """Model information response"""
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
    cloud_model_name: Optional[str] = None  # Actual model ID for provider (e.g., "grok-beta")
    api_key: Optional[str] = None


class ValidateCloudModelRequest(BaseModel):
    """Request to validate a cloud model without saving"""
    provider: str
    api_key: str
    model_id: Optional[str] = None
    base_url: Optional[str] = None


class RegisterModelRequest(BaseModel):
    """Request to register a local model"""
    model_id: str
    name: str
    model_type: str
    provider: str
    backend: str
    model_path: str
    size_mb: float = 0
    is_base_model: bool = False
    metadata: Optional[Dict] = None


@router.get("/", response_model=List[ModelResponse])
async def list_models():
    """List all registered models"""
    models = model_manager.list_models()
    return models


@router.get("/{model_id}", response_model=ModelResponse)
async def get_model(model_id: str):
    """Get model by ID"""
    model = model_manager.get_model(model_id)
    if not model:
        raise HTTPException(status_code=404, detail=f"Model {model_id} not found")
    return model


@router.get("/active/current", response_model=Optional[ModelResponse])
async def get_active_model():
    """Get currently active model"""
    model = model_manager.get_active_model()
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
    """
    Pull a GGUF model from HuggingFace
    
    Example:
    {
        "repo_id": "TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF",
        "filename": "tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf",
        "model_id": "tinyllama-1.1b",
        "name": "TinyLlama 1.1B Chat"
    }
    """
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
    """Add a cloud API model (OpenAI, Anthropic, etc.)"""
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
    """
    Validate cloud model API key without persisting.
    
    Returns validation status and error details if invalid.
    """
    try:
        from hapie.cloud import ProviderRegistry
        
        provider = ProviderRegistry.get(request.provider)
        is_valid = await provider.validate_key(request.api_key)
        
        return {
            "valid": is_valid,
            "provider": request.provider,
            "model_id": request.model_id or getattr(provider, "default_model", "")
        }
    except ValueError as e:
        return {
            "valid": False,
            "error": f"Unknown provider: {request.provider}"
        }
    except Exception as e:
        return {
            "valid": False,
            "error": str(e)
        }
class PullCustomModelRequest(BaseModel):
    repo_id: str  # e.g., "bartowski/Qwen2-Deita-500m-GGUF"
    filename: str  # e.g., "Qwen2-Deita-500m-Q4_K_M.gguf"
    model_id: Optional[str] = None
    name: Optional[str] = None


class PullIntentResponse(BaseModel):
    status: str
    model: Dict
    now_active: bool
    message: str


@router.post("/pull-custom", response_model=PullIntentResponse)
async def pull_custom_model(request: PullCustomModelRequest):
    """Pull ANY GGUF model from HuggingFace without MODELCATALOG restriction"""
    try:
        from hapie.hardware import HardwareDetector
        
        detector = HardwareDetector()
        
        model_id = request.model_id or f"{request.repo_id.split('/')[-1].lower()}"
        name = request.name or request.filename.replace('.gguf', '')
        
        # Check hardware capability (optional, for logging or future checks)
        detector.detect()
        
        pulled_model = model_manager.pull_huggingface_model(
            repo_id=request.repo_id,
            filename=request.filename,
            model_id=model_id,
            name=name
        )
        
        model_manager.set_active_model(model_id)
        
        return {
            "status": "success",
            "model": pulled_model,
            "now_active": True,
            "message": f"Custom model '{name}' pulled and activated!"
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to pull custom model: {str(e)}"
        )


@router.post("/pull-intent", response_model=PullIntentResponse)
async def pull_model_intent(request: dict):
    """
    Smart model pulling with 3-tier fallback:
    Tier 1: MODELCATALOG (Popular curated models)
    Tier 2: TASKMAP shortcuts (Best for 'coding', 'chat' etc)
    Tier 3: Custom syntax (repo_id:filename) for ANY GGUF
    """
    from hapie.api.recommend import MODEL_CATALOG, TASK_MAP
    import re
    
    query = request.get("query", "").strip()
    clean_query = query.lower().replace("hapie pull ", "").replace("hapie ", "").strip()
    
    model_id = None
    model_info = None

    # 🌟 TIER 1: MODELCATALOG DIRECT MATCH
    # Check if user typed "phi3", "mistral", "llama3" etc directly
    if clean_query in MODEL_CATALOG:
        model_id = clean_query
        model_info = MODEL_CATALOG[model_id]

    # 🌟 TIER 2: TASKMAP SHORTCUTS
    # Check if user typed "coding", "fast", "uncensored" etc
    if not model_id and clean_query in TASK_MAP:
        model_id = TASK_MAP[clean_query]
        model_info = MODEL_CATALOG[model_id]
        
    if model_id and model_info:
        try:
            pulled_model = model_manager.pull_huggingface_model(
                repo_id=model_info["repo_id"],
                filename=model_info["filename"],
                model_id=model_id,
                name=model_info["name"]
            )
            model_manager.set_active_model(model_id)
            return {
                "status": "success",
                "model": pulled_model,
                "now_active": True,
                "message": f"{model_info['name']} pulled and activated!"
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    # 🌟 TIER 3: CUSTOM SYNTAX (repo:filename)
    # Allows pulling ANY file: "bartowski/Phi-3:Q4_K_M.gguf"
    # Regex to capture repo (anything before last colon) and filename (anything after)
    # We use last colon as separator because repo might not have colons, but filename usage here implies separation
    # A cleaner syntax might be "repo/name:filename" or space based. 
    # User requested: "bartowski/Phi-3:Q4_K_M.gguf" -> likely split by colon or assume filename is last part if full path?
    # User example: "hapie pull repo:filename" -> "bartowski/Phi-3:Q4_K_M.gguf"
    # Actually the user prompt said: "repo:filename -> ANY GGUF (bartowski/Phi-3:Q4_K_M.gguf)"
    # Wait, the example "bartowski/Phi-3:Q4_K_M.gguf" looks like colon usage "bartowski/Phi-3 : Q4_K_M.gguf"? 
    # Or is it "bartowski/Phi-3/Q4_K_M.gguf" ? 
    # Standard HF is `repo_id` `filename`. 
    # Let's support `repo_id:filename` explicitly as requested.
    
    # Check for direct repo/file match pattern
    if ":" in query:
        parts = query.replace("hapie pull ", "").strip().split(":", 1)
        if len(parts) == 2:
            repo_id = parts[0].strip()
            filename = parts[1].strip()
            
            try:
                pulled_model = model_manager.pull_huggingface_model(
                    repo_id=repo_id,
                    filename=filename
                )
                model_manager.set_active_model(pulled_model['id'])
                return {
                    "status": "success",
                    "model": pulled_model,
                    "now_active": True,
                    "message": f"Custom model from {repo_id} pulled!"
                }
            except Exception as e:
                 raise HTTPException(status_code=500, detail=str(e))

    # 🌟 TIER 4: HELP / FAIL
    available = ", ".join(list(MODEL_CATALOG.keys())[:8])
    raise HTTPException(
        status_code=400,
        detail=f"Unknown model '{clean_query}'. Try: {available}... OR use 'repo_id:filename'"
    )


from fastapi.responses import StreamingResponse
import json
import asyncio

@router.post("/pull-stream")
async def pull_model_stream_endpoint(request: dict):
    """
    Stream download progress via SSE.
    Client should listen to 'progress' events.
    """
    from hapie.api.recommend import MODEL_CATALOG, TASK_MAP
    from pathlib import Path
    
    query = request.get("query", "").strip()
    clean_query = query.lower().replace("hapie pull ", "").replace("hapie ", "").strip()
    
    # 1. Resolve Model Intent (Reuse logic)
    repo_id = None
    filename = None
    model_id = None
    name = None
    
    # Check Catalog/Task
    if clean_query in MODEL_CATALOG:
        m = MODEL_CATALOG[clean_query]
        repo_id, filename, model_id, name = m["repo_id"], m["filename"], clean_query, m["name"]
    elif clean_query in TASK_MAP:
        mid = TASK_MAP[clean_query]
        m = MODEL_CATALOG[mid]
        repo_id, filename, model_id, name = m["repo_id"], m["filename"], mid, m["name"]
    elif ":" in query:
        # Custom
        parts = query.replace("hapie pull ", "").strip().split(":", 1)
        if len(parts) == 2:
            repo_id, filename = parts[0].strip(), parts[1].strip()
            model_id = Path(filename).stem.lower()
            name = filename
            
    if not repo_id:
        # Return error stream
        async def err_gen():
            yield json.dumps({"status": "error", "error": "Unknown model. Try 'repo:file.gguf'"}) + "\n"
        return StreamingResponse(err_gen(), media_type="application/x-ndjson")

    # 2. Stream Generator
    async def event_generator():
        try:
            # We assume manager.pull_model_stream is async generator
            async for progress in model_manager.pull_model_stream(repo_id, filename, model_id, name):
                yield json.dumps(progress) + "\n"
        except Exception as e:
            yield json.dumps({"status": "error", "error": str(e)}) + "\n"

    return StreamingResponse(event_generator(), media_type="application/x-ndjson")


@router.post("/pull/cancel")
async def cancel_pull(request: dict):
    model_id = request.get("model_id")
    if not model_id:
        raise HTTPException(status_code=400, detail="model_id required")
    model_manager.cancel_download(model_id)
    return {"status": "success"}
