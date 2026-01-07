"""Model recommendation and intent parsing"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
from hapie.hardware import HardwareDetector, SystemCapability

router = APIRouter()

# Curated model catalog
# Curated model catalog (50+ Popular Models)
MODEL_CATALOG = {
    # --- CODING & REASONING ---
    "phi3": {
        "repo_id": "microsoft/Phi-3-mini-4k-instruct-gguf",
        "filename": "Phi-3-mini-4k-instruct-q4.gguf",
        "name": "Phi-3 Mini 4K",
        "size_mb": 2400,
        "context": "4K",
        "use_cases": ["coding", "reasoning", "mobile"],
        "min_ram_gb": 4,
        "speed_rating": 9
    },
    "phi3-medium": {
        "repo_id": "microsoft/Phi-3-medium-4k-instruct-gguf",
        "filename": "Phi-3-medium-4k-instruct-q4.gguf",
        "name": "Phi-3 Medium 4K", 
        "size_mb": 8000,
        "context": "4K",
        "use_cases": ["complex-reasoning", "coding"],
        "min_ram_gb": 10,
        "speed_rating": 6
    },
    "deepseek-coder": {
        "repo_id": "TheBloke/deepseek-coder-6.7B-instruct-GGUF",
        "filename": "deepseek-coder-6.7b-instruct.Q4_K_M.gguf",
        "name": "DeepSeek Coder 6.7B",
        "size_mb": 4100,
        "context": "16K",
        "use_cases": ["coding", "python", "javascript"],
        "min_ram_gb": 6,
        "speed_rating": 7
    },
    "deepseek-v2": {
        "repo_id": "bartowski/DeepSeek-V2-Lite-Chat-GGUF",
        "filename": "DeepSeek-V2-Lite-Chat-Q4_K_M.gguf",
        "name": "DeepSeek V2 Lite",
        "size_mb": 9500,
        "context": "32K",
        "use_cases": ["reasoning", "chat", "coding"],
        "min_ram_gb": 12,
        "speed_rating": 6
    },
    "codellama-7b": {
        "repo_id": "TheBloke/CodeLlama-7B-Instruct-GGUF",
        "filename": "codellama-7b-instruct.Q4_K_M.gguf",
        "name": "CodeLlama 7B",
        "size_mb": 4200,
        "context": "16K",
        "use_cases": ["coding", "programming"],
        "min_ram_gb": 6,
        "speed_rating": 7
    },
    "starcoder2-3b": {
        "repo_id": "bartowski/StarCoder2-3b-GGUF",
        "filename": "StarCoder2-3b-Q4_K_M.gguf",
        "name": "StarCoder2 3B",
        "size_mb": 2100,
        "context": "16K",
        "use_cases": ["coding", "completion"],
        "min_ram_gb": 4,
        "speed_rating": 8
    },

    # --- GENERAL CHAT (MISTRAL / LLAMA) ---
    "mistral": {
        "repo_id": "bartowski/Mistral-Nemo-Instruct-2407-GGUF",
        "filename": "Mistral-Nemo-Instruct-2407-Q4_K_M.gguf",
        "name": "Mistral Nemo 12B",
        "size_mb": 7800,
        "context": "128K",
        "use_cases": ["chat", "long-context", "general"],
        "min_ram_gb": 10,
        "speed_rating": 7
    },
    "mistral-v0.3": {
        "repo_id": "MaziyarPanahi/Mistral-7B-Instruct-v0.3-GGUF",
        "filename": "Mistral-7B-Instruct-v0.3.Q4_K_M.gguf",
        "name": "Mistral v0.3 7B",
        "size_mb": 4300,
        "context": "32K",
        "use_cases": ["chat", "assistant"],
        "min_ram_gb": 6,
        "speed_rating": 8
    },
    "llama3": {
        "repo_id": "NousResearch/Hermes-2-Pro-Llama-3-8B-GGUF",
        "filename": "Hermes-2-Pro-Llama-3-8B-Q4_K_M.gguf",
        "name": "Hermes 2 Pro (Llama 3)",
        "size_mb": 4900,
        "context": "8K",
        "use_cases": ["chat", "roleplay", "general"],
        "min_ram_gb": 7,
        "speed_rating": 7
    },
    "llama3-8b": {
        "repo_id": "lmstudio-community/Meta-Llama-3-8B-Instruct-GGUF",
        "filename": "Meta-Llama-3-8B-Instruct-Q4_K_M.gguf",
        "name": "Meta Llama 3 8B",
        "size_mb": 4900,
        "context": "8K",
        "use_cases": ["chat", "official"],
        "min_ram_gb": 7,
        "speed_rating": 7
    },
    "openchat-3.5": {
        "repo_id": "TheBloke/openchat_3.5-GGUF",
        "filename": "openchat_3.5.Q4_K_M.gguf",
        "name": "OpenChat 3.5",
        "size_mb": 4300,
        "context": "8K",
        "use_cases": ["chat", "uncensored"],
        "min_ram_gb": 6,
        "speed_rating": 8
    },

    # --- GOOGLE GEMMA & QWEN ---
    "gemma2": {
        "repo_id": "google/gemma-2-2b-it-GGUF",
        "filename": "gemma-2-2b-it-Q4_K_M.gguf",
        "name": "Gemma 2 2B IT",
        "size_mb": 1600,
        "context": "8K",
        "use_cases": ["fast", "chat", "mobile"],
        "min_ram_gb": 3,
        "speed_rating": 9
    },
    "gemma2-9b": {
        "repo_id": "bartowski/gemma-2-9b-it-GGUF",
        "filename": "gemma-2-9b-it-Q4_K_M.gguf",
        "name": "Gemma 2 9B IT",
        "size_mb": 6400,
        "context": "8K",
        "use_cases": ["chat", "reasoning"],
        "min_ram_gb": 8,
        "speed_rating": 7
    },
    "qwen2.5": {
        "repo_id": "Qwen/Qwen2.5-7B-Instruct-GGUF",
        "filename": "qwen2.5-7b-instruct-q4_k_m.gguf",
        "name": "Qwen 2.5 7B",
        "size_mb": 4700,
        "context": "32K",
        "use_cases": ["chat", "multilingual", "coding"],
        "min_ram_gb": 7,
        "speed_rating": 8
    },
    "qwen2.5-1.5b": {
        "repo_id": "Qwen/Qwen2.5-1.5B-Instruct-GGUF",
        "filename": "qwen2.5-1.5b-instruct-q4_k_m.gguf",
        "name": "Qwen 2.5 1.5B",
        "size_mb": 1100,
        "context": "32K",
        "use_cases": ["fast", "rag"],
        "min_ram_gb": 2,
        "speed_rating": 9
    },
    "qwen2.5-0.5b": {
        "repo_id": "Qwen/Qwen2.5-0.5B-Instruct-GGUF",
        "filename": "qwen2.5-0.5b-instruct-q4_k_m.gguf",
        "name": "Qwen 2.5 0.5B",
        "size_mb": 400,
        "context": "32K",
        "use_cases": ["tiny", "embedded"],
        "min_ram_gb": 1,
        "speed_rating": 10
    },

    # --- ADVANCED / SPECIALIZED ---
    "mixtral-8x7b": {
        "repo_id": "TheBloke/Mixtral-8x7B-Instruct-v0.1-GGUF",
        "filename": "mixtral-8x7b-instruct-v0.1.Q4_K_M.gguf",
        "name": "Mixtral 8x7B MoE",
        "size_mb": 26000,
        "context": "32K",
        "use_cases": ["advanced", "expert", "server"],
        "min_ram_gb": 32,
        "speed_rating": 4
    },
    "command-r": {
        "repo_id": "bartowski/c4ai-command-r-v01-GGUF",
        "filename": "c4ai-command-r-v01-Q4_K_M.gguf",
        "name": "Command R",
        "size_mb": 22000,
        "context": "128K",
        "use_cases": ["rag", "tools", "business"],
        "min_ram_gb": 24,
        "speed_rating": 5
    },
    "yi-1.5-9b": {
        "repo_id": "bartowski/Yi-1.5-9B-Chat-GGUF",
        "filename": "Yi-1.5-9B-Chat-Q4_K_M.gguf",
        "name": "Yi 1.5 9B Chat",
        "size_mb": 5600,
        "context": "4K",
        "use_cases": ["chat", "creative"],
        "min_ram_gb": 8,
        "speed_rating": 7
    },
    "solar-10.7b": {
        "repo_id": "TheBloke/SOLAR-10.7B-Instruct-v1.0-GGUF",
        "filename": "solar-10.7b-instruct-v1.0.Q4_K_M.gguf",
        "name": "SOLAR 10.7B",
        "size_mb": 6400,
        "context": "4K",
        "use_cases": ["reasoning", "merge"],
        "min_ram_gb": 9,
        "speed_rating": 7
    },
    "tinyllama": {
        "repo_id": "TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF",
        "filename": "tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf",
        "name": "TinyLlama 1.1B",
        "size_mb": 700,
        "context": "2K",
        "use_cases": ["fast", "mobile", "edge"],
        "min_ram_gb": 1,
        "speed_rating": 10
    },
    "stablelm-2": {
        "repo_id": "TheBloke/stablelm-2-12b-chat-GGUF",
        "filename": "stablelm-2-12b-chat.Q4_K_M.gguf",
        "name": "StableLM 2 12B",
        "size_mb": 7400,
        "context": "4K",
        "use_cases": ["chat", "storytelling"],
        "min_ram_gb": 10,
        "speed_rating": 7
    }
}

# Task-based shortcuts
TASK_MAP = {
    "coding": "phi3",
    "code": "deepseek-coder",
    "programming": "deepseek-coder",
    "scripting": "starcoder2-3b",
    
    "chat": "mistral",
    "assistant": "llama3",
    "conversation": "gemma2-9b",
    
    "fast": "gemma2",
    "quick": "qwen2.5-1.5b",
    "speed": "tinyllama",
    
    "reasoning": "phi3-medium",
    "math": "deepseek-v2",
    "complex": "command-r",
    
    "rag": "qwen2.5",
    "docs": "command-r",
    "analysis": "mistral",
    
    "tiny": "qwen2.5-0.5b",
    "edge": "tinyllama"
}


class RecommendRequest(BaseModel):
    query: str
    hardware: Optional[Dict] = None
    confirm_pull: bool = False


class Recommendation(BaseModel):
    rank: int
    model_id: str
    name: str
    repo_id: str
    filename: str
    size_mb: int
    reasoning: str
    performance: Dict
    pull_url: str = "/api/models/pull-intent"

def build_recommendation(
    model_id: str,
    model_info: Dict,
    hardware: Dict,
    rank: int
) -> Dict:
    """Build recommendation object with reasoning"""
    
    available_ram = hardware.get("available_ram_gb", 0)
    estimated_ram = model_info["size_mb"] / 1024 * 1.2  # 20% overhead
    fits = estimated_ram <= available_ram
    
    speed_estimate = model_info["speed_rating"] * 10  # tokens/sec estimate
    
    reasoning = (
        f"{model_info['name']} ({model_info['size_mb']/1024:.1f}GB) "
        f"{'fits' if fits else 'EXCEEDS'} available {available_ram:.1f}GB RAM. "
        f"Estimated {speed_estimate} t/s on your hardware. "
        f"Best for: {', '.join(model_info['use_cases'])}.\n\n"
        f"**Command:** `hapie pull {model_id}`"
    )
    
    return {
        "rank": rank,
        "model_id": model_id,
        "name": model_info["name"],
        "repo_id": model_info["repo_id"],
        "filename": model_info["filename"],
        "size_mb": model_info["size_mb"],
        "reasoning": reasoning,
        "performance": {
            "speed": f"{speed_estimate} t/s",
            "context": model_info["context"],
            "ram": f"{estimated_ram:.1f}GB"
        },
        "pull_url": "/api/models/pull-intent"
    }


def rank_models_by_hardware(hardware: Dict) -> List[Dict]:
    """Rank all models by hardware compatibility"""
    available_ram = hardware.get("available_ram_gb", 0)
    
    ranked = []
    for model_id, model_info in MODEL_CATALOG.items():
        estimated_ram = model_info["size_mb"] / 1024 * 1.2
        
        # Penalize if doesn't fit
        fit_score = 10 if estimated_ram <= available_ram else -10
        
        # Prefer faster models
        speed_score = model_info["speed_rating"]
        
        total_score = fit_score + speed_score
        
        rec = build_recommendation(
            model_id, model_info, hardware,
            rank=0  # Will be set after sorting
        )
        rec["_score"] = total_score
        ranked.append(rec)
    
    # Sort by score
    ranked.sort(key=lambda x: x["_score"], reverse=True)
    
    # Assign ranks
    for i, rec in enumerate(ranked):
        rec["rank"] = i + 1
        del rec["_score"]
    
    return ranked


@router.post("/recommend")
async def recommend_models(request: RecommendRequest):
    """
    Recommend models based on natural language query and hardware
    
    Examples:
    - "best coding model" → Phi-3 Mini
    - "fast model for chat" → Gemma 2B
    - "pull phi3" → Phi-3 with pull intent
    """
    query_lower = request.query.lower()
    
    # Hardware detection
    if not request.hardware:
        capability = HardwareDetector().detect()
        hardware = {
            "ram_gb": capability.total_ram_gb,
            "available_ram_gb": capability.available_ram_gb,
            "cpu_cores": capability.cpu_cores,
            "gpu_vram_gb": capability.gpu_vram_gb
        }
    else:
        hardware = request.hardware
    
    # Parse intent
    recommendations = []
    
    # Check for specific model mention
    for model_id, model_info in MODEL_CATALOG.items():
        if model_id in query_lower or model_info["name"].lower() in query_lower:
            rec = build_recommendation(model_id, model_info, hardware, rank=1)
            return {"recommendations": [rec]}
    
    # Check for task-based query
    for task, model_id in TASK_MAP.items():
        if task in query_lower:
            model_info = MODEL_CATALOG[model_id]
            rec = build_recommendation(model_id, model_info, hardware, rank=1)
            return {"recommendations": [rec]}
    
    # Generic "best" query - rank by hardware fit
    # Default: return top 3 models
    ranked = rank_models_by_hardware(hardware)
    return {"recommendations": ranked[:3]}



