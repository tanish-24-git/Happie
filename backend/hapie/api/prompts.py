"""
Unified prompt engineering for all inference endpoints.
Ensures consistent behavior across single, compare, and future modes.

Key design principles:
- No structural markers (Human:, Assistant:, etc.)
- Token-budget-aware history management
- Model-agnostic (works with Qwen, TinyLlama, Mistral, cloud models)
- Clear separation of system prompt, context, and user request
"""

from typing import Optional
from hapie.db import get_db
from hapie.db.models import Message
from hapie.hardware import HardwareDetector
from hapie.policy import PolicyEngine

# Global instances
detector = HardwareDetector()
policy_engine = PolicyEngine()


def get_base_system_prompt() -> str:
    """
    Base system prompt: hardware context + behavioral rules.
    NO model names, NO markers, NO patterns to learn.
    """
    capability = detector.detect()
    policy = policy_engine.evaluate(capability)
    
    return f"""You are HAPIE, a helpful local AI assistant running on this computer.

SYSTEM CONTEXT:
- Processor: {capability.cpu_cores} cores, {capability.cpu_threads} threads
- Available Memory: {capability.available_ram_gb:.1f} GB
- Inference Backend: Optimized local processing

BEHAVIOR RULES (CRITICAL - FOLLOW STRICTLY):
1. Answer user questions directly, naturally, and helpfully.
2. Use ONLY plain language - no special markers, prefixes, or role indicators.
3. NEVER include "Human:", "Assistant:", "User:", "Question:", "Answer:", "Q:", "A:", or similar in your response.
4. NEVER echo, repeat, or reference the conversation history explicitly.
5. For code examples: provide clean, runnable code without explanation preamble.
6. For questions: answer directly without meta-discussion about the system.
7. If asked about your identity: briefly state you are HAPIE, a local AI assistant. Do not discuss model details.

Your response should be ONLY the answer to the user's request, nothing more."""


def get_conversation_context(
    conversation_id: str,
    max_context_tokens: int = 800
) -> str:
    """
    Retrieve conversation history in narrative format.
    
    Uses token budget (not turn count) to respect:
    - Different hardware context windows
    - Model-specific token limits
    - Pattern density (prevents overfitting)
    
    Returns empty string if no context available.
    """
    if not conversation_id:
        return ""
    
    db = get_db()
    session = db.get_session()
    
    try:
        # Fetch recent messages in reverse chronological order
        messages = session.query(Message).filter(
            Message.conversation_id == conversation_id
        ).order_by(Message.created_at.desc()).limit(20).all()
        
        if not messages:
            return ""
        
        messages.reverse()  # Chronological order
        
        # Build context respecting token budget
        context_lines = []
        token_count = 0
        TOKENS_PER_WORD = 1.3  # Conservative estimate
        
        for msg in messages:
            # Estimate message size
            msg_tokens = len(msg.content.split()) * TOKENS_PER_WORD
            
            # Stop if adding this message exceeds budget
            if token_count + msg_tokens > max_context_tokens:
                break
            
            # Narrative format (NO role markers)
            if msg.role == "user":
                context_lines.append(
                    f"The user previously asked: {msg.content}"
                )
            else:
                context_lines.append(
                    f"Previously, I responded with: {msg.content}"
                )
            
            token_count += msg_tokens
        
        if not context_lines:
            return ""
        
        # Wrap in clear separator
        return (
            "\n--- CONTEXT FROM EARLIER IN THIS CONVERSATION ---\n" +
            "\n".join(context_lines) +
            "\n--- (Do not repeat the above; use it only for understanding) ---\n"
        )
    
    finally:
        session.close()


def build_single_chat_prompt(
    user_prompt: str,
    conversation_id: Optional[str] = None
) -> str:
    """
    Build final prompt for single-model inference.
    
    Includes:
    1. Base system prompt (behavioral rules)
    2. Conversation context (narrative format)
    3. Current user input
    
    NO role markers, NO echo patterns, NO model names.
    """
    base = get_base_system_prompt()
    context = get_conversation_context(conversation_id)
    
    if context:
        full_prompt = f"{base}\n{context}\n\nUser's current request:\n{user_prompt}"
    else:
        full_prompt = f"{base}\n\nUser's request:\n{user_prompt}"
    
    return full_prompt


def build_comparison_prompt(user_prompt: str) -> str:
    """
    Build prompt for multi-model comparison mode.
    
    Comparison mode does NOT include conversation history (cleaner comparison).
    Just system context + current prompt.
    """
    base = get_base_system_prompt()
    return f"{base}\n\nRequest:\n{user_prompt}"
