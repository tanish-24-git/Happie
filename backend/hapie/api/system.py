"""System information and hardware API endpoints"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional
import psutil
from datetime import datetime

from hapie.hardware import HardwareDetector
from hapie.policy import PolicyEngine
from hapie.db import get_db
from hapie.db.models import SystemProfile

router = APIRouter()

# Global instances
detector = HardwareDetector()
policy_engine = PolicyEngine()

class SystemCapabilityResponse(BaseModel):
    """System capability response model"""
    cpu_cores: int
    cpu_threads: int
    cpu_arch: str
    cpu_brand: str
    total_ram_gb: float
    available_ram_gb: float
    gpu_vendor: str
    gpu_name: Optional[str]
    gpu_vram_gb: Optional[float]
    gpu_count: int
    platform_system: str
    platform_release: str

class ExecutionPolicyResponse(BaseModel):
    """Execution policy response model"""
    backend: str
    max_batch_size: int
    max_context_length: int
    use_quantization: bool
    quantization_bits: int
    gpu_layers: int
    max_threads: int

@router.get("/metrics")
async def get_system_metrics():
    """Get real-time system metrics (CPU, memory, disk)"""
    try:
        vm = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        return {
            "cpu_percent": psutil.cpu_percent(interval=None),
            "memory_percent": vm.percent,
            "disk_percent": disk.percent,
            "memory_used_gb": round(vm.used / (1024**3), 2),
            "memory_total_gb": round(vm.total / (1024**3), 2),
            "timestamp": int(datetime.now().timestamp())
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get system metrics: {str(e)}"
        )

@router.get("/capability", response_model=SystemCapabilityResponse)
async def get_capability():
    """Get current hardware capability profile"""
    capability = detector.detect()
    return capability.to_dict()

@router.post("/capability/refresh", response_model=SystemCapabilityResponse)
async def refresh_capability():
    """Force refresh hardware detection"""
    capability = detector.detect(force_refresh=True)
    policy = policy_engine.evaluate(capability)
    db = get_db()
    session = db.get_session()
    try:
        profile = SystemProfile(
            capability_json=capability.to_dict(),
            policy_json=policy.to_dict(),
            updated_at=int(datetime.now().timestamp())
        )
        session.add(profile)
        session.commit()
    finally:
        session.close()
    return capability.to_dict()

@router.get("/policy", response_model=ExecutionPolicyResponse)
async def get_policy():
    """Get current execution policy"""
    capability = detector.detect()
    policy = policy_engine.evaluate(capability)
    return policy.to_dict()

@router.get("/info")
async def get_system_info():
    """Get complete system information (capability + policy) with live RAM metrics"""
    capability = detector.detect()
    policy = policy_engine.evaluate(capability)
    cap_dict = capability.to_dict()

    # psutil inside Docker only sees Docker's allocated max (e.g., 7.4GB).
    # capability.total_ram_gb already has the accurate Host PC total (e.g., 15.2GB) via env vars.
    # We will use psutil to find out how much RAM Docker is actively consuming,
    # and calculate the available based on the TRUE host total.
    vm = psutil.virtual_memory()
    docker_used_gb = vm.used / (1024**3)
    
    cap_dict["available_ram_gb"] = round(cap_dict["total_ram_gb"] - docker_used_gb, 2)

    return {
        "capability": cap_dict,
        "policy": policy.to_dict()
    }

@router.get("/status/full")
async def get_system_full_status():
    """Complete system status for the dashboard"""
    from hapie.models import ModelManager, InferenceEngine
    
    model_manager = ModelManager()
    inference_engine = InferenceEngine()
    capability = detector.detect()
    policy = policy_engine.evaluate(capability)
    active_model = model_manager.get_active_model()
    loaded_models = inference_engine.get_loaded_models()
    vm = psutil.virtual_memory()
    
    return {
        "status": "running",
        "hardware": {
            "cpu": {
                "brand": capability.cpu_brand,
                "cores_physical": capability.cpu_cores,
                "threads": capability.cpu_threads,
                "architecture": capability.cpu_arch,
                "load_percent": psutil.cpu_percent(interval=None)
            },
            "memory": {
                "total_gb": round(capability.total_ram_gb, 2),
                "available_gb": round(capability.total_ram_gb - (vm.used / 1024**3), 2),
                "used_percent": round(((vm.used / 1024**3) / capability.total_ram_gb) * 100, 1)
            },
            "gpu": {
                "vendor": capability.gpu_vendor.value if hasattr(capability.gpu_vendor, 'value') else str(capability.gpu_vendor),
                "name": capability.gpu_name,
                "vram_gb": capability.gpu_vram_gb,
                "count": capability.gpu_count
            }
        },
        "inference": {
            "backend": policy.backend.value if hasattr(policy.backend, 'value') else str(policy.backend),
            "gpu_layers": policy.gpu_layers,
            "max_context": policy.max_context_length,
            "quantization_bits": policy.quantization_bits if policy.use_quantization else None,
            "max_threads": policy.max_threads
        },
        "models": {
            "active": active_model["name"] if active_model else None,
            "active_id": active_model["id"] if active_model else None,
            "loaded_count": len(loaded_models),
            "loaded_ids": loaded_models,
            "active_quantization": _extract_quantization(active_model) if active_model else None,
        }
    }

def _extract_quantization(model: dict) -> Optional[str]:
    """Helper to find quantization tag in active model"""
    if not model: return None
    meta = model.get("metadata") or {}
    if meta.get("quantization"): return meta["quantization"]
    
    source = (meta.get("filename") or str(model.get("model_path") or "") or model.get("name") or "").lower()
    QUANT_PATTERNS = ["q8_0", "q6_k", "q5_k_m", "q5_k_s", "q4_k_m", "q4_k_s", "q4_0", "q3_k", "q2_k", "f16", "int8", "int4"]
    for p in QUANT_PATTERNS:
        if p in source.replace(".", "_").replace("-", "_"): return p
    return None
