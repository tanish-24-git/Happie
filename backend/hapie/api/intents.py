"""Intent classification using Qwen system model"""

from typing import Optional
from hapie.models import ModelManager, InferenceEngine
from hapie.hardware import HardwareDetector
from hapie.policy import PolicyEngine


# Valid intent categories
VALID_INTENTS = {
    "recommend",      # User wants model suggestions
    "pull",           # User wants to download a model
    "system_status",  # User asks about hardware/system
    "model_list",     # User wants to see installed models
    "switch_model",   # User wants to change active model
    "chat",           # Normal conversation
}


class IntentClassifier:
    """
    Classifies user intent using the Qwen system model.
    
    This is the routing brain that determines how to handle each user request.
    """
    
    def __init__(self):
        self.model_manager = ModelManager()
        self.inference_engine = InferenceEngine()
        self.detector = HardwareDetector()
        self.policy_engine = PolicyEngine()
        self._system_model_id: Optional[str] = None
    
    def _get_system_model_id(self) -> Optional[str]:
        """Get the system model ID (cached)"""
        if self._system_model_id is None:
            system_model = self.model_manager.get_system_model()
            if system_model:
                self._system_model_id = system_model["id"]
        return self._system_model_id
    
    async def classify(self, prompt: str) -> str:
        """
        Classify user intent using Qwen system model.
        
        Args:
            prompt: User's message
        
        Returns:
            One of VALID_INTENTS, defaults to "chat" on error
        """
        try:
            system_model_id = self._get_system_model_id()
            if not system_model_id:
                # No system model available, default to chat
                return "chat"
            
            # Get system model info
            system_model = self.model_manager.get_model(system_model_id)
            if not system_model:
                return "chat"
            
            # Load system model if needed
            if not self.inference_engine.is_loaded(system_model_id):
                capability = self.detector.detect()
                policy = self.policy_engine.evaluate(capability)
                
                self.inference_engine.load_model(
                    model_path=system_model["model_path"],
                    policy=policy,
                    model_id=system_model_id
                )
            
            # Build classification prompt
            system_prompt = """You are an intent classifier for HAPIE (Hardware-Aware Performance Inference Engine).
Your job is to classify the user's message into ONE of these intents:

- "recommend" - User wants model recommendations or suggestions
- "pull" - User wants to download/install/add a model
- "system_status" - User asks about hardware, performance, system specs, or "how is my system"
- "model_list" - User wants to see available/installed models
- "switch_model" - User wants to change/switch which model is used
- "chat" - Normal conversation, questions, or anything else

RULES:
- Respond with ONLY the intent word, nothing else
- If uncertain, default to "chat"
- "pull" includes: "download", "install", "add model", "get model"
- "recommend" includes: "suggest", "what model", "best model"
- "system_status" includes: "system info", "hardware", "specs", "performance"
- "model_list" includes: "list models", "show models", "available models"
- "switch_model" includes: "switch to", "use model", "change model"

User message: "{prompt}"

Intent:"""

            full_prompt = system_prompt.replace("{prompt}", prompt.strip())
            
            # Generate classification
            result = self.inference_engine.generate(
                model_id=system_model_id,
                prompt=full_prompt,
                max_tokens=16,
                temperature=0.1,
                top_p=0.9,
                stream=False
            )
            
            # Extract and validate intent
            intent = result["text"].strip().lower()
            
            # Remove any extra text (model might add explanation)
            intent = intent.split()[0] if intent else "chat"
            intent = intent.replace('"', '').replace("'", "")
            
            # Validate
            if intent not in VALID_INTENTS:
                intent = "chat"
            
            return intent
            
        except Exception as e:
            # On any error, default to chat
            # This ensures the system is always functional
            return "chat"
