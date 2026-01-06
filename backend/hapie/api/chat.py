"""Chat and inference API endpoints"""

import uuid
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime

from hapie.models import ModelManager, InferenceEngine
from hapie.hardware import HardwareDetector
from hapie.policy import PolicyEngine
from hapie.db import get_db
from hapie.db.models import Conversation, Message

router = APIRouter()

# Global instances
model_manager = ModelManager()
inference_engine = InferenceEngine()
detector = HardwareDetector()
policy_engine = PolicyEngine()


def build_system_prompt(conversation_id: Optional[str] = None) -> str:
    """
    Build comprehensive system prompt with hardware/model context.
    
    This prevents hallucinations by giving the model awareness of:
    - System hardware (CPU, GPU, RAM)
    - Active policy and execution backend
    - Available models
    - Conversation history
    """
    # Hardware detection
    capability = detector.detect()
    policy = policy_engine.evaluate(capability)
    
    # Model information
    models = model_manager.list_models()
    active = model_manager.get_active_model()
    
    # Conversation history (last 6 turns to align with user constraints)
    history = ""
    if conversation_id:
        db = get_db()
        session = db.get_session()
        try:
            messages = session.query(Message).filter(
                Message.conversation_id == conversation_id
            ).order_by(Message.created_at.desc()).limit(6).all()
            messages.reverse()  # Chronological order
            history = "\n".join([f"{m.role.upper()}: {m.content}" for m in messages])
        finally:
            session.close()
    
    # Format system prompt
    # We keep the system section stable as requested
    system_prompt = f"""You are HAPIE, an intelligent hardware-aware AI assistant running locally on this system.

SYSTEM CONTEXT:
CPU: {capability.cpu_brand} ({capability.cpu_cores} Cores / {capability.cpu_threads} Threads)
RAM: {capability.available_ram_gb:.1f}GB available / {capability.total_ram_gb:.1f}GB total
GPU: {capability.gpu_vendor.value.upper()} ({capability.gpu_vram_gb}GB VRAM)
Backend: {policy.backend.value.upper()} | Context Limit: {policy.max_context_length}
Active Model: {active['name'] if active else 'None'} ({active.get('provider', 'local') if active else 'N/A'})

AVAILABLE MODELS ({len(models)}):
{', '.join(m['name'] for m in models[:5])}{'...' if len(models) > 5 else ''}

INSTRUCTIONS:
1. Answer general questions (coding, reasoning, chat) normally and helpfully.
2. You have FULL awareness of the local hardware. If asked about the system, use the data above.
3. For model recommendations, suggest GGUF models from HuggingFace that fit the available RAM.
4. When recommending, give the user the exact command: "hapie pull <model-name>" or "pull <model-name>".

You are helpful, precise, and hardware-aware.
"""
    
    if history:
        # Separate history clearly
        system_prompt += f"\n\nCONVERSATION HISTORY:\n{history}"
    
    return system_prompt


class ChatRequest(BaseModel):
    """Single model chat request"""
    prompt: str
    model_id: Optional[str] = None  # If None, use active model
    max_tokens: int = 512
    temperature: float = 0.7
    top_p: float = 0.9
    conversation_id: Optional[str] = None


class ChatResponse(BaseModel):
    """Chat response"""
    text: str
    model_id: str
    conversation_id: str
    message_id: str
    metrics: Dict


class ComparisonRequest(BaseModel):
    """Multi-model comparison request"""
    prompt: str
    model_ids: List[str]
    max_tokens: int = 512
    temperature: float = 0.7
    top_p: float = 0.9


class ComparisonResult(BaseModel):
    """Single model result in comparison"""
    model_id: str
    model_name: str
    text: str
    metrics: Dict


class ComparisonResponse(BaseModel):
    """Comparison response with multiple results"""
    results: List[ComparisonResult]


@router.post("/single", response_model=ChatResponse)
async def single_chat(request: ChatRequest):
    """
    Execute single-model chat inference
    
    This is the default chat mode - one prompt, one model response.
    """
    # Get model
    if request.model_id:
        model = model_manager.get_model(request.model_id)
        if not model:
            raise HTTPException(status_code=404, detail=f"Model {request.model_id} not found")
    else:
        model = model_manager.get_active_model()
        if not model:
            raise HTTPException(status_code=400, detail="No active model set")
    
    model_id = model["id"]
    
    # Check if this is a cloud model
    if model.get("backend") == "cloud_api":
        # Route to cloud inference
        try:
            result = await inference_engine.generate_cloud(
                model=model,
                prompt=request.prompt,
                max_tokens=request.max_tokens,
                temperature=request.temperature,
                top_p=request.top_p
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Cloud inference failed: {str(e)}")
    else:
        # Local model inference
        # Load model if not already loaded
        if not inference_engine.is_loaded(model_id):
            capability = detector.detect()
            policy = policy_engine.evaluate(capability)
            
            try:
                inference_engine.load_model(
                    model_path=model["model_path"],
                    policy=policy,
                    model_id=model_id
                )
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Failed to load model: {str(e)}")
        
        # Generate response
        try:
            # Build enhanced prompt with system context
            system_prompt = build_system_prompt(request.conversation_id)
            full_prompt = f"{system_prompt}\n\nHuman: {request.prompt}\n\nAssistant:"

            result = inference_engine.generate(
                model_id=model_id,
                prompt=full_prompt,
                max_tokens=request.max_tokens,
                temperature=request.temperature,
                top_p=request.top_p,
                stream=False
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Inference failed: {str(e)}")
    
    # Save to database
    db = get_db()
    session = db.get_session()
    
    try:
        # Get or create conversation
        if request.conversation_id:
            conversation = session.query(Conversation).filter(
                Conversation.id == request.conversation_id
            ).first()
            if not conversation:
                raise HTTPException(status_code=404, detail="Conversation not found")
        else:
            conversation = Conversation(
                id=str(uuid.uuid4()),
                title=request.prompt[:50] + "..." if len(request.prompt) > 50 else request.prompt,
                model_id=model_id
            )
            session.add(conversation)
        
        # Save user message
        user_message = Message(
            id=str(uuid.uuid4()),
            conversation_id=conversation.id,
            role="user",
            content=request.prompt,
            model_id=model_id
        )
        session.add(user_message)
        
        # Save assistant message
        assistant_message = Message(
            id=str(uuid.uuid4()),
            conversation_id=conversation.id,
            role="assistant",
            content=result["text"],
            model_id=model_id
        )
        session.add(assistant_message)
        
        conversation.updated_at = int(datetime.now().timestamp())
        session.commit()
        
        return {
            "text": result["text"],
            "model_id": model_id,
            "conversation_id": conversation.id,
            "message_id": assistant_message.id,
            "metrics": result["metrics"]
        }
    finally:
        session.close()


@router.post("/compare", response_model=ComparisonResponse)
async def compare_models(request: ComparisonRequest):
    """
    Execute multi-model comparison
    
    This is the comparison mode - one prompt sent to multiple models.
    Results are returned side-by-side with performance metrics.
    """
    if len(request.model_ids) < 2:
        raise HTTPException(status_code=400, detail="Comparison requires at least 2 models")
    
    # Verify all models exist
    models = []
    for model_id in request.model_ids:
        model = model_manager.get_model(model_id)
        if not model:
            raise HTTPException(status_code=404, detail=f"Model {model_id} not found")
        models.append(model)
    
    # Load models
    capability = detector.detect()
    policy = policy_engine.evaluate(capability)
    
    for model in models:
        if not inference_engine.is_loaded(model["id"]):
            try:
                inference_engine.load_model(
                    model_path=model["model_path"],
                    policy=policy,
                    model_id=model["id"]
                )
            except Exception as e:
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to load model {model['id']}: {str(e)}"
                )
    
    # Execute inference for all models
    results = []
    for model in models:
        try:
            result = inference_engine.generate(
                model_id=model["id"],
                prompt=request.prompt,
                max_tokens=request.max_tokens,
                temperature=request.temperature,
                top_p=request.top_p,
                stream=False
            )
            
            results.append({
                "model_id": model["id"],
                "model_name": model["name"],
                "text": result["text"],
                "metrics": result["metrics"]
            })
        except Exception as e:
            # Include error in results
            results.append({
                "model_id": model["id"],
                "model_name": model["name"],
                "text": f"[ERROR] {str(e)}",
                "metrics": {
                    "latency_ms": 0,
                    "tokens_generated": 0,
                    "tokens_per_sec": 0
                }
            })
    
    return {"results": results}


@router.get("/conversations")
async def list_conversations():
    """List all conversations"""
    db = get_db()
    session = db.get_session()
    try:
        conversations = session.query(Conversation).order_by(
            Conversation.updated_at.desc()
        ).all()
        return [c.to_dict() for c in conversations]
    finally:
        session.close()


@router.get("/conversations/{conversation_id}/messages")
async def get_conversation_messages(conversation_id: str):
    """Get all messages in a conversation"""
    db = get_db()
    session = db.get_session()
    try:
        messages = session.query(Message).filter(
            Message.conversation_id == conversation_id
        ).order_by(Message.created_at.asc()).all()
        return [m.to_dict() for m in messages]
    finally:
        session.close()
