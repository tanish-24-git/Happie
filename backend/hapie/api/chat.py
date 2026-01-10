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
from hapie.api.prompts import build_single_chat_prompt, build_comparison_prompt
from hapie.api.intents import IntentClassifier
from hapie.utils.logger import log_response

router = APIRouter()

# Global instances
model_manager = ModelManager()
inference_engine = InferenceEngine()
detector = HardwareDetector()
policy_engine = PolicyEngine()
intent_classifier = IntentClassifier()


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
    Execute single-model chat inference with intent-based routing.
    
    Flow:
    1. Classify intent using Qwen system model
    2. Route to appropriate handler based on intent
    3. Log response with model name for observability
    """
    
    # ===== STEP 1: CLASSIFY INTENT =====
    intent = await intent_classifier.classify(request.prompt)
    
    # ===== STEP 2: ROUTE BASED ON INTENT =====
    
    # --- RECOMMEND: Model recommendations ---
    if intent == "recommend":
        from hapie.api.recommend import recommend_models, RecommendRequest
        
        # Get hardware for recommendations
        capability = detector.detect()
        hardware = {
            "ram_gb": capability.total_ram_gb,
            "available_ram_gb": capability.available_ram_gb,
            "cpu_cores": capability.cpu_cores,
            "gpu_vram_gb": capability.gpu_vram_gb
        }
        
        # Get recommendations
        rec_request = RecommendRequest(query=request.prompt, hardware=hardware)
        rec_response = await recommend_models(rec_request)
        
        # Format as chat response
        recommendations = rec_response.get("recommendations", [])
        if recommendations:
            result_text = "Here are my recommendations based on your hardware:\n\n"
            for i, rec in enumerate(recommendations[:3], 1):
                result_text += f"{i}. **{rec['name']}** ({rec['size_mb']/1024:.1f}GB)\n"
                result_text += f"   - {rec['reasoning']}\n\n"
            result_text += "\nTo download a model, type: `pull <model-name>`"
        else:
            result_text = "I couldn't find any suitable recommendations. Please check your system specifications."
        
        model_id = "SYSTEM_RECOMMEND"
        metrics = {"latency_ms": 10, "tokens_generated": len(result_text.split()), "tokens_per_sec": 0, "provider": "system"}
    
    # --- PULL: Download a model ---
    elif intent == "pull":
        from hapie.api.models import pull_model_intent
        
        try:
            pull_response = await pull_model_intent({"query": request.prompt})
            
            if pull_response.get("status") == "success":
                model_info = pull_response.get("model", {})
                result_text = f"✓ Successfully pulled and activated **{model_info.get('name', 'model')}**!\n\n"
                result_text += f"Size: {model_info.get('size_mb', 0)/1024:.1f}GB\n"
                result_text += f"You can now start chatting!"
            else:
                result_text = f"Failed to pull model: {pull_response.get('message', 'Unknown error')}"
        except HTTPException as e:
            result_text = f"Failed to pull model: {e.detail}"
        except Exception as e:
            result_text = f"Failed to pull model: {str(e)}"
        
        model_id = "SYSTEM_PULL"
        metrics = {"latency_ms": 10, "tokens_generated": len(result_text.split()), "tokens_per_sec": 0, "provider": "system"}
    
    # --- SYSTEM_STATUS: Hardware/system info ---
    elif intent == "system_status":
        from hapie.api.system import get_system_full_status
        
        status_data = await get_system_full_status()
        hw = status_data["hardware"]
        inf = status_data["inference"]
        
        result_text = f"""### System Status Report

**HARDWARE**
- **CPU:** {hw['cpu']['brand']} ({hw['cpu']['cores_physical']} cores, {hw['cpu']['threads']} threads)
- **RAM:** {hw['memory']['available_gb']}GB available / {hw['memory']['total_gb']}GB total ({hw['memory']['used_percent']:.1f}% used)
- **GPU:** {hw['gpu']['vendor']} {hw['gpu']['name']} ({hw['gpu']['vram_gb']}GB VRAM)

**INFERENCE ENGINE**
- **Backend:** {inf['backend'].upper()}
- **GPU Layers:** {inf['gpu_layers']}
- **Max Context:** {inf['max_context']} tokens
- **Status:** ✅ RUNNING
"""
        
        model_id = "SYSTEM_STATUS"
        metrics = {"latency_ms": 10, "tokens_generated": len(result_text.split()), "tokens_per_sec": 0, "provider": "system"}
    
    # --- MODEL_LIST: Show installed models ---
    elif intent == "model_list":
        models = model_manager.list_models()
        
        if models:
            result_text = "### Installed Models\n\n"
            for model in models:
                active_marker = "🟢 " if model.get("is_active") else "⚪ "
                base_marker = "[BASE] " if model.get("is_base_model") else ""
                result_text += f"{active_marker}{base_marker}**{model['name']}**\n"
                result_text += f"   - ID: `{model['id']}`\n"
                result_text += f"   - Size: {model.get('size_mb', 0)/1024:.1f}GB\n"
                result_text += f"   - Type: {model['type']}\n\n"
            
            result_text += "\nTo switch models, type: `switch to <model-id>`"
        else:
            result_text = "No models installed. Type `recommend` to see available models."
        
        model_id = "SYSTEM_LIST"
        metrics = {"latency_ms": 10, "tokens_generated": len(result_text.split()), "tokens_per_sec": 0, "provider": "system"}
    
    # --- SWITCH_MODEL: Change active model ---
    elif intent == "switch_model":
        # Try to extract model ID from prompt
        prompt_lower = request.prompt.lower()
        target_model_id = None
        
        # Simple extraction: look for model IDs in the prompt
        models = model_manager.list_models()
        for model in models:
            if model["id"].lower() in prompt_lower or model["name"].lower() in prompt_lower:
                target_model_id = model["id"]
                break
        
        if target_model_id:
            success = model_manager.set_active_model(target_model_id)
            if success:
                model = model_manager.get_model(target_model_id)
                result_text = f"✓ Switched to **{model['name']}** ({model['id']})"
            else:
                result_text = f"Failed to switch to model: {target_model_id}"
        else:
            # Ask user which model
            models_list = "\n".join([f"- `{m['id']}` ({m['name']})" for m in models if not m.get('is_base_model')])
            result_text = f"Which model would you like to switch to?\n\n{models_list}\n\nType: `switch to <model-id>`"
        
        model_id = "SYSTEM_SWITCH"
        metrics = {"latency_ms": 10, "tokens_generated": len(result_text.split()), "tokens_per_sec": 0, "provider": "system"}
    
    # --- CHAT: Normal conversation ---
    else:  # intent == "chat"
        # Check if user has an explicit model_id in request
        if request.model_id:
            model = model_manager.get_model(request.model_id)
            if not model:
                raise HTTPException(status_code=404, detail=f"Model {request.model_id} not found")
        else:
            # Get active chat model (NOT system model)
            model = model_manager.get_active_chat_model()
            
            # If no chat model exists, use system/Qwen to explain and recommend
            if not model:
                # User has no chat model yet - provide onboarding
                capability = detector.detect()
                
                # Format hardware info safely
                gpu_info = "No GPU detected"
                if capability.gpu_name:
                    vram = f"{capability.gpu_vram_gb:.1f}GB VRAM" if capability.gpu_vram_gb is not None else "Unknown VRAM"
                    gpu_info = f"{capability.gpu_vendor.value} {capability.gpu_name} ({vram})"
                elif capability.gpu_vendor.value != "None":
                    vram = f"{capability.gpu_vram_gb:.1f}GB VRAM" if capability.gpu_vram_gb is not None else "Unknown VRAM"
                    gpu_info = f"{capability.gpu_vendor.value} ({vram})"

                result_text = f"""👋 Welcome to HAPIE!

You don't have a chat model loaded yet. To start chatting, you need to download a model first.

**Your System:**
- RAM: {capability.available_ram_gb:.1f}GB available
- CPU: {capability.cpu_cores} cores
- GPU: {gpu_info}

**Recommended Models:**
- Type `recommend` to see models optimized for your hardware
- Type `pull phi3` to download Phi-3 (great for coding, ~2.4GB)
- Type `pull tinyllama` to download TinyLlama (fast, ~700MB)

Once downloaded, you can start chatting!
"""
                
                model_id = "SYSTEM_ONBOARDING"
                metrics = {"latency_ms": 10, "tokens_generated": len(result_text.split()), "tokens_per_sec": 0, "provider": "system"}
                
                # Log and return early
                log_response(intent, model_id, result_text)
                
                # Save to database
                db = get_db()
                session = db.get_session()
                try:
                    conversation = Conversation(
                        id=str(uuid.uuid4()),
                        title=request.prompt[:50] + "..." if len(request.prompt) > 50 else request.prompt,
                        model_id=model_id
                    )
                    session.add(conversation)
                    
                    user_message = Message(
                        id=str(uuid.uuid4()),
                        conversation_id=conversation.id,
                        role="user",
                        content=request.prompt,
                        model_id=model_id
                    )
                    session.add(user_message)
                    
                    assistant_message = Message(
                        id=str(uuid.uuid4()),
                        conversation_id=conversation.id,
                        role="assistant",
                        content=result_text,
                        model_id=model_id
                    )
                    session.add(assistant_message)
                    
                    conversation.updated_at = int(datetime.now().timestamp())
                    session.commit()
                    
                    return {
                        "text": result_text,
                        "model_id": model_id,
                        "conversation_id": conversation.id,
                        "message_id": assistant_message.id,
                        "metrics": metrics
                    }
                finally:
                    session.close()
        
        # User has a chat model - proceed with normal inference
        model_id = model["id"]
        
        # Check if cloud model
        if model.get("backend") == "cloud_api":
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
            
            # Build prompt using unified builder
            full_prompt = build_single_chat_prompt(
                user_prompt=request.prompt,
                conversation_id=request.conversation_id
            )
            
            try:
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
        
        result_text = result["text"]
        metrics = result["metrics"]
    
    # ===== STEP 3: LOG RESPONSE =====
    log_response(intent, model_id, result_text)
    
    # ===== STEP 4: SAVE TO DATABASE =====
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
            content=result_text,
            model_id=model_id
        )
        session.add(assistant_message)
        
        conversation.updated_at = int(datetime.now().timestamp())
        session.commit()
        
        return {
            "text": result_text,
            "model_id": model_id,
            "conversation_id": conversation.id,
            "message_id": assistant_message.id,
            "metrics": metrics
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
    # Build prompt using unified builder (NO role markers)
    comparison_prompt = build_comparison_prompt(request.prompt)
    
    results = []
    for model in models:
        try:
            result = inference_engine.generate(
                model_id=model["id"],
                prompt=comparison_prompt,
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
