"""Settings and API key management endpoints"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from hapie.cloud import ApiKeyManager, ProviderRegistry
from hapie.db import get_db

router = APIRouter()


class ApiKeyRequest(BaseModel):
    api_key: str


class HfTokenRequest(BaseModel):
    hf_token: str


@router.get("/api-keys")
async def list_api_keys():
    """List configured providers with masked keys"""
    db = get_db()
    session = db.get_session()
    try:
        manager = ApiKeyManager(session)
        return manager.list_keys()
    finally:
        session.close()


@router.post("/api-keys/{provider}")
async def save_api_key(provider: str, request: ApiKeyRequest):
    """
    Save encrypted API key for provider.
    
    Security: Key is encrypted immediately and original is discarded.
    """
    if provider not in ProviderRegistry.list_providers():
        raise HTTPException(status_code=400, detail=f"Unknown provider: {provider}")
    
    db = get_db()
    session = db.get_session()
    try:
        manager = ApiKeyManager(session)
        manager.save_key(provider, request.api_key)
        return {"status": "success", "provider": provider}
    finally:
        session.close()


@router.post("/api-keys/{provider}/validate")
async def validate_api_key(provider: str):
    """Test if stored API key is valid"""
    db = get_db()
    session = db.get_session()
    try:
        manager = ApiKeyManager(session)
        api_key = manager.get_key(provider)
        
        provider_impl = ProviderRegistry.get(provider)
        is_valid = await provider_impl.validate_key(api_key)
        
        return {"valid": is_valid, "provider": provider}
    except KeyError:
        raise HTTPException(status_code=404, detail=f"No API key configured for {provider}")
    finally:
        session.close()


@router.delete("/api-keys/{provider}")
async def delete_api_key(provider: str):
    """Securely delete API key"""
    db = get_db()
    session = db.get_session()
    try:
        manager = ApiKeyManager(session)
        manager.delete_key(provider)
        return {"status": "success", "provider": provider}
    finally:
        session.close()


@router.post("/hf-token")
async def save_hf_token(token: HfTokenRequest):
    """Save HuggingFace token for gated models"""
    db = get_db()
    session = db.get_session()
    try:
        manager = ApiKeyManager(session)
        manager.save_key("huggingface", token.hf_token)
        return {"status": "success", "message": "HF_TOKEN saved. 45K+ models unlocked."}
    finally:
        session.close()


@router.get("/hf-token/status")
async def hf_token_status():
    """Check if HuggingFace token is configured"""
    db = get_db()
    session = db.get_session()
    try:
        manager = ApiKeyManager(session)
        try:
            token = manager.get_key("huggingface")
            return {"configured": bool(token)}
        except KeyError:
            return {"configured": False}
    finally:
        session.close()


@router.post("/system/reset")
async def factory_reset():
    """Clear all data and reset to defaults"""
    import shutil
    from pathlib import Path
    
    hapie_dir = Path.home() / ".hapie"
    if hapie_dir.exists():
        # Confirm this is dangerous
        raise HTTPException(
            status_code=400, 
            detail="Factory reset is destructive. Please confirm by passing confirmation=true"
        )
    
    return {"status": "reset not implemented for safety"}


@router.post("/system/re-detect")
async def re_detect_hardware():
    """Force hardware re-detection"""
    from hapie.hardware import HardwareDetector
    from hapie.policy import PolicyEngine
    from hapie.db.models import SystemProfile
    from datetime import datetime
    
    detector = HardwareDetector()
    capability = detector.detect(force_refresh=True)
    
    policy_engine = PolicyEngine()
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
        
        return {
            "status": "success",
            "capability": capability.to_dict(),
            "policy": policy.to_dict()
        }
    finally:
        session.close()
