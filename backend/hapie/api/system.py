"""System information and hardware API endpoints"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict

from hapie.hardware import HardwareDetector
from hapie.policy import PolicyEngine
from hapie.db import get_db
from hapie.db.models import SystemProfile
from datetime import datetime

router = APIRouter()

@router.get("/metrics")
async def get_system_metrics():
    """Get real-time system metrics (CPU, memory, disk)"""
    try:
        import psutil
        from datetime import datetime
        
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
    gpu_name: str | None
    gpu_vram_gb: float | None
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


class SystemInfoResponse(BaseModel):
    """Combined system info response"""
    capability: SystemCapabilityResponse
    policy: ExecutionPolicyResponse


@router.get("/capability", response_model=SystemCapabilityResponse)
async def get_capability():
    """Get current hardware capability profile"""
    capability = detector.detect()
    return capability.to_dict()


@router.post("/capability/refresh", response_model=SystemCapabilityResponse)
async def refresh_capability():
    """Force refresh hardware detection"""
    capability = detector.detect(force_refresh=True)
    
    # Save to database
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


@router.get("/info", response_model=SystemInfoResponse)
async def get_system_info():
    """Get complete system information (capability + policy)"""
    capability = detector.detect()
    policy = policy_engine.evaluate(capability)
    
    return {
        "capability": capability.to_dict(),
        "policy": policy.to_dict()
    }


@router.get("/status/full")
async def get_system_full_status():
    """
    Complete system status endpoint.
    
    Use this for "how is my system running?" queries.
    This is SEPARATE from chat context - hardware info belongs here, not in LLM prompts.
    """
    import psutil
    from hapie.models import ModelManager, InferenceEngine
    
    model_manager = ModelManager()
    inference_engine = InferenceEngine()
    capability = detector.detect()
    policy = policy_engine.evaluate(capability)
    active_model = model_manager.get_active_model()
    loaded_models = inference_engine.get_loaded_models()
    memory = psutil.virtual_memory()
    
    return {
        "status": "running",
        "hardware": {
            "cpu": {
                "brand": capability.cpu_brand,
                "cores_physical": capability.cpu_cores,
                "threads": capability.cpu_threads,
                "architecture": capability.cpu_arch
            },
            "memory": {
                "total_gb": round(memory.total / (1024**3), 2),
                "available_gb": round(memory.available / (1024**3), 2),
                "used_percent": memory.percent
            },
            "gpu": {
                "vendor": capability.gpu_vendor.value,
                "name": capability.gpu_name,
                "vram_gb": capability.gpu_vram_gb,
                "count": capability.gpu_count
            }
        },
        "inference": {
            "backend": policy.backend.value,
            "gpu_layers": policy.gpu_layers,
            "max_context": policy.max_context_length,
            "quantization_bits": policy.quantization_bits if policy.use_quantization else None,
            "max_threads": policy.max_threads
        },
        "models": {
            "active": active_model["name"] if active_model else None,
            "active_id": active_model["id"] if active_model else None,
            "loaded_count": len(loaded_models),
            "loaded_ids": loaded_models
        }
    }
