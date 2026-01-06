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
@router.post("/pull-intent")
async def pull_model_intent(request: dict):
    """
    Natural language model pulling.
    
    Parses queries like:
    - "pull phi3" → Downloads Phi-3 Mini
    - "get gemma" → Downloads Gemma 2B
    - {"query": "phi3", "confirm": true} → Auto-pull
    """
    query = request.get("query", "")
    
    # Import recommendation engine
    from hapie.api.recommend import MODEL_CATALOG, TASK_MAP
    
    query_lower = query.lower().replace("pull ", "").replace("get ", "").strip()
    
    # Map to model
    model_id = None
    for mid in MODEL_CATALOG.keys():
        if mid in query_lower:
            model_id = mid
            break
    
    # Check task map
    if not model_id and query_lower in TASK_MAP:
        model_id = TASK_MAP[query_lower]
    
    if not model_id:
        raise HTTPException(
            status_code=400,
            detail=f"Could not parse model from query: '{query}'"
        )
    
    model_info = MODEL_CATALOG[model_id]
    
    # Pull model
    try:
        pulled_model = model_manager.pull_huggingface_model(
            repo_id=model_info["repo_id"],
            filename=model_info["filename"],
            model_id=model_id,
            name=model_info["name"]
        )
        
        # Set as active
        model_manager.set_active_model(pulled_model["id"])
        
        return {
            "status": "pulled",
            "model": pulled_model,
            "now_active": True,
            "message": f"✅ {model_info['name']} pulled & activated!"
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to pull model: {str(e)}"
        )
