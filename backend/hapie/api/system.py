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
