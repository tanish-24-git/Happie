"""Model recommendation and intent parsing"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
from hapie.hardware import HardwareDetector, SystemCapability

router = APIRouter()

# Curated model catalog
MODEL_CATALOG = {
    "phi3": {
        "repo_id": "microsoft/Phi-3-mini-4k-instruct-gguf",
        "filename": "Phi-3-mini-4k-instruct-q4_k_m.gguf",
        "name": "Phi-3 Mini 4K Q4_K_M",
        "size_mb": 2420,
        "context": "4K",
        "use_cases": ["coding", "reasoning", "chat"],
        "min_ram_gb": 4,
        "speed_rating": 5
    },
    "gemma": {
        "repo_id": "google/gemma-2-2b-it-GGUF",
        "filename": "gemma-2-2b-it-Q4_K_M.gguf",
        "name": "Gemma 2 2B Instruct Q4_K_M",
        "size_mb": 1600,
        "context": "8K",
        "use_cases": ["fast", "chat", "general"],
        "min_ram_gb": 2,
        "speed_rating": 5
    },
    "qwen3b": {
        "repo_id": "Qwen/Qwen2.5-1.5B-Instruct-GGUF",
        "filename": "qwen2.5-1.5b-instruct-q4_k_m.gguf",
        "name": "Qwen 2.5 1.5B Instruct Q4_K_M",
        "size_mb": 1100,
        "context": "32K",
        "use_cases": ["rags", "long-context", "retrieval"],
        "min_ram_gb": 2,
        "speed_rating": 5
    },
    "qwen05b": {
        "repo_id": "Qwen/Qwen2.5-0.5B-Instruct-GGUF",
        "filename": "qwen2.5-0.5b-instruct-q4_k_m.gguf",
        "name": "Qwen 2.5 0.5B Instruct",
        "size_mb": 400,
        "context": "32K",
        "use_cases": ["fast", "tiny", "embedded"],
        "min_ram_gb": 1,
        "speed_rating": 10
    }
}

# Task-based shortcuts
TASK_MAP = {
    "coding": "phi3",
    "code": "phi3",
    "programming": "phi3",
    "rags": "qwen3b",
    "rag": "qwen3b",
    "retrieval": "qwen3b",
    "fast": "gemma",
    "quick": "gemma",
    "lightweight": "gemma",
    "tiny": "qwen05b"
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



