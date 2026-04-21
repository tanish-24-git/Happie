"""System information and hardware API endpoints"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional
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

@router.get("/capability", response_model=SystemCapabilityResponse)
async def get_capability():
    """Get static hardware capability profile (detected once, cached)"""
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
    """Get complete system information (capability + policy). Static only."""
    capability = detector.detect()
    policy = policy_engine.evaluate(capability)
    return {
        "capability": capability.to_dict(),
        "policy": policy.to_dict()
    }

@router.get("/status/full")
async def get_system_full_status():
    """Complete system status for the dashboard (static system info)."""
    from hapie.models import ModelManager, InferenceEngine

    model_manager = ModelManager()
    inference_engine = InferenceEngine()
    capability = detector.detect()
    policy = policy_engine.evaluate(capability)
    active_model = model_manager.get_active_model()
    loaded_models = inference_engine.get_loaded_models()

    available_ram = capability.available_ram_gb
    total_vram = (capability.gpu_vram_gb or 0) * capability.gpu_count

    max_ram_f16 = round(available_ram / (2.0 * 1.2), 1)
    max_ram_q8 = round(available_ram / (1.0 * 1.2), 1)
    max_ram_q4 = round(available_ram / (0.5 * 1.2), 1)

    max_gpu_f16 = round(total_vram / (2.0 * 1.2), 1) if total_vram > 0 else 0
    max_gpu_q8 = round(total_vram / (1.0 * 1.2), 1) if total_vram > 0 else 0
    max_gpu_q4 = round(total_vram / (0.5 * 1.2), 1) if total_vram > 0 else 0

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
                "total_gb": round(capability.total_ram_gb, 2),
                "available_gb": round(available_ram, 2)
            },
            "gpu": {
                "vendor": capability.gpu_vendor.value if hasattr(capability.gpu_vendor, 'value') else str(capability.gpu_vendor),
                "name": capability.gpu_name,
                "vram_gb": capability.gpu_vram_gb,
                "count": capability.gpu_count,
                "total_vram_gb": round(total_vram, 2)
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
        },
        "inference_limits": {
            "ram": {
                "f16": max_ram_f16,
                "q8": max_ram_q8,
                "q4": max_ram_q4
            },
            "gpu": {
                "f16": max_gpu_f16,
                "q8": max_gpu_q8,
                "q4": max_gpu_q4
            } if total_vram > 0 else None
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
