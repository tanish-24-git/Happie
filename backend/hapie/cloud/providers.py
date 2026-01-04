"""
Provider abstraction layer for cloud AI models

Design principles:
- Provider-agnostic interface
- Easy to add new providers
- Consistent error handling
- Cost estimation support
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, AsyncIterator
import httpx
from datetime import datetime


class BaseProvider(ABC):
    """Base interface for cloud AI providers"""
    
    @abstractmethod
    async def generate(
        self,
        prompt: str,
        api_key: str,
        model_name: str,
        **kwargs
    ) -> Dict[str, Any]:
        """Execute text generation request"""
        pass
    
    @abstractmethod
    async def validate_key(self, api_key: str) -> bool:
        """Test if API key is valid"""
        pass
    
    @abstractmethod
    def estimate_cost(self, prompt_tokens: int, completion_tokens: int, model_name: str = "") -> float:
        """Best-effort cost estimation in USD"""
        pass


class OpenAIProvider(BaseProvider):
    """OpenAI (GPT-4, GPT-4o, etc.)"""
    
    API_BASE = "https://api.openai.com/v1"
    
    # Pricing per 1M tokens (updated as of Jan 2026)
    PRICING = {
        "gpt-4o": {"input": 2.50, "output": 10.00},
        "gpt-4o-mini": {"input": 0.15, "output": 0.60},
        "gpt-4-turbo": {"input": 10.00, "output": 30.00},
        "gpt-4": {"input": 30.00, "output": 60.00},
        "gpt-3.5-turbo": {"input": 0.50, "output": 1.50},
    }
    
    async def generate(self, prompt, api_key, model_name, **kwargs):
        start_time = datetime.now()
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.API_BASE}/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": model_name,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": kwargs.get("max_tokens", 512),
                    "temperature": kwargs.get("temperature", 0.7),
                },
                timeout=60.0
            )
            
            elapsed_ms = int((datetime.now() - start_time).total_seconds() * 1000)
            
            response.raise_for_status()
            data = response.json()
            
            prompt_tokens = data["usage"]["prompt_tokens"]
            completion_tokens = data["usage"]["completion_tokens"]
            
            return {
                "text": data["choices"][0]["message"]["content"],
                "metrics": {
                    "prompt_tokens": prompt_tokens,
                    "completion_tokens": completion_tokens,
                    "tokens_generated": completion_tokens,
                    "latency_ms": elapsed_ms,
                    "tokens_per_sec": completion_tokens / (elapsed_ms / 1000) if elapsed_ms > 0 else 0,
                    "provider": "OpenAI",
                    "model": model_name,
                    "estimated_cost_usd": self.estimate_cost(prompt_tokens, completion_tokens, model_name)
                }
            }
    
    async def validate_key(self, api_key: str) -> bool:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.API_BASE}/models",
                    headers={"Authorization": f"Bearer {api_key}"},
                    timeout=10.0
                )
                return response.status_code == 200
        except:
            return False
    
    def estimate_cost(self, prompt_tokens: int, completion_tokens: int, model_name: str = "") -> float:
        # Get pricing for specific model, or use default
        pricing = self.PRICING.get(model_name, {"input": 2.50, "output": 10.00})
        
        input_cost = (prompt_tokens / 1_000_000) * pricing["input"]
        output_cost = (completion_tokens / 1_000_000) * pricing["output"]
        
        return input_cost + output_cost


class AnthropicProvider(BaseProvider):
    """Anthropic (Claude 3.5 Sonnet, etc.)"""
    
    API_BASE = "https://api.anthropic.com/v1"
    API_VERSION = "2023-06-01"
    
    PRICING = {
        "claude-3-5-sonnet-20241022": {"input": 3.00, "output": 15.00},
        "claude-3-5-haiku-20241022": {"input": 0.80, "output": 4.00},
        "claude-3-opus-20240229": {"input": 15.00, "output": 75.00},
        "claude-3-sonnet-20240229": {"input": 3.00, "output": 15.00},
    }
    
    async def generate(self, prompt, api_key, model_name, **kwargs):
        start_time = datetime.now()
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.API_BASE}/messages",
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": self.API_VERSION,
                    "content-type": "application/json",
                },
                json={
                    "model": model_name,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": kwargs.get("max_tokens", 512),
                    "temperature": kwargs.get("temperature", 0.7),
                },
                timeout=60.0
            )
            
            elapsed_ms = int((datetime.now() - start_time).total_seconds() * 1000)
            
            response.raise_for_status()
            data = response.json()
            
            prompt_tokens = data["usage"]["input_tokens"]
            completion_tokens = data["usage"]["output_tokens"]
            
            return {
                "text": data["content"][0]["text"],
                "metrics": {
                    "prompt_tokens": prompt_tokens,
                    "completion_tokens": completion_tokens,
                    "tokens_generated": completion_tokens,
                    "latency_ms": elapsed_ms,
                    "tokens_per_sec": completion_tokens / (elapsed_ms / 1000) if elapsed_ms > 0 else 0,
                    "provider": "Anthropic",
                    "model": model_name,
                    "estimated_cost_usd": self.estimate_cost(prompt_tokens, completion_tokens, model_name)
                }
            }
    
    async def validate_key(self, api_key: str) -> bool:
        try:
            async with httpx.AsyncClient() as client:
                # Anthropic doesn't have a simple validation endpoint
                # Try a minimal request
                response = await client.post(
                    f"{self.API_BASE}/messages",
                    headers={
                        "x-api-key": api_key,
                        "anthropic-version": self.API_VERSION,
                        "content-type": "application/json",
                    },
                    json={
                        "model": "claude-3-5-haiku-20241022",
                        "messages": [{"role": "user", "content": "test"}],
                        "max_tokens": 5,
                    },
                    timeout=10.0
                )
                return response.status_code == 200
        except:
            return False
    
    def estimate_cost(self, prompt_tokens: int, completion_tokens: int, model_name: str = "") -> float:
        pricing = self.PRICING.get(model_name, {"input": 3.00, "output": 15.00})
        
        input_cost = (prompt_tokens / 1_000_000) * pricing["input"]
        output_cost = (completion_tokens / 1_000_000) * pricing["output"]
        
        return input_cost + output_cost


class GoogleProvider(BaseProvider):
    """Google (Gemini Pro, etc.)"""
    
    API_BASE = "https://generativelanguage.googleapis.com/v1beta"
    
    PRICING = {
        "gemini-pro": {"input": 0.50, "output": 1.50},
        "gemini-1.5-pro": {"input": 3.50, "output": 10.50},
        "gemini-1.5-flash": {"input": 0.075, "output": 0.30},
    }
    
    async def generate(self, prompt, api_key, model_name, **kwargs):
        start_time = datetime.now()
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.API_BASE}/models/{model_name}:generateContent",
                params={"key": api_key},
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {
                        "maxOutputTokens": kwargs.get("max_tokens", 512),
                        "temperature": kwargs.get("temperature", 0.7),
                    }
                },
                timeout=60.0
            )
            
            elapsed_ms = int((datetime.now() - start_time).total_seconds() * 1000)
            
            response.raise_for_status()
            data = response.json()
            
            # Extract text and token counts
            text = data["candidates"][0]["content"]["parts"][0]["text"]
            prompt_tokens = data.get("usageMetadata", {}).get("promptTokenCount", 0)
            completion_tokens = data.get("usageMetadata", {}).get("candidatesTokenCount", 0)
            
            return {
                "text": text,
                "metrics": {
                    "prompt_tokens": prompt_tokens,
                    "completion_tokens": completion_tokens,
                    "tokens_generated": completion_tokens,
                    "latency_ms": elapsed_ms,
                    "tokens_per_sec": completion_tokens / (elapsed_ms / 1000) if elapsed_ms > 0 else 0,
                    "provider": "Google",
                    "model": model_name,
                    "estimated_cost_usd": self.estimate_cost(prompt_tokens, completion_tokens, model_name)
                }
            }
    
    async def validate_key(self, api_key: str) -> bool:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.API_BASE}/models",
                    params={"key": api_key},
                    timeout=10.0
                )
                return response.status_code == 200
        except:
            return False
    
    def estimate_cost(self, prompt_tokens: int, completion_tokens: int, model_name: str = "") -> float:
        pricing = self.PRICING.get(model_name, {"input": 0.50, "output": 1.50})
        
        input_cost = (prompt_tokens / 1_000_000) * pricing["input"]
        output_cost = (completion_tokens / 1_000_000) * pricing["output"]
        
        return input_cost + output_cost


class DeepSeekProvider(BaseProvider):
    """DeepSeek (DeepSeek Coder V2, etc.)"""
    
    API_BASE = "https://api.deepseek.com/v1"
    
    PRICING = {
        "deepseek-chat": {"input": 0.14, "output": 0.28},
        "deepseek-coder": {"input": 0.14, "output": 0.28},
    }
    
    async def generate(self, prompt, api_key, model_name, **kwargs):
        start_time = datetime.now()
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.API_BASE}/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": model_name,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": kwargs.get("max_tokens", 512),
                    "temperature": kwargs.get("temperature", 0.7),
                },
                timeout=60.0
            )
            
            elapsed_ms = int((datetime.now() - start_time).total_seconds() * 1000)
            
            response.raise_for_status()
            data = response.json()
            
            prompt_tokens = data["usage"]["prompt_tokens"]
            completion_tokens = data["usage"]["completion_tokens"]
            
            return {
                "text": data["choices"][0]["message"]["content"],
                "metrics": {
                    "prompt_tokens": prompt_tokens,
                    "completion_tokens": completion_tokens,
                    "tokens_generated": completion_tokens,
                    "latency_ms": elapsed_ms,
                    "tokens_per_sec": completion_tokens / (elapsed_ms / 1000) if elapsed_ms > 0 else 0,
                    "provider": "DeepSeek",
                    "model": model_name,
                    "estimated_cost_usd": self.estimate_cost(prompt_tokens, completion_tokens, model_name)
                }
            }
    
    async def validate_key(self, api_key: str) -> bool:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.API_BASE}/models",
                    headers={"Authorization": f"Bearer {api_key}"},
                    timeout=10.0
                )
                return response.status_code == 200
        except:
            return False
    
    def estimate_cost(self, prompt_tokens: int, completion_tokens: int, model_name: str = "") -> float:
        pricing = self.PRICING.get(model_name, {"input": 0.14, "output": 0.28})
        
        input_cost = (prompt_tokens / 1_000_000) * pricing["input"]
        output_cost = (completion_tokens / 1_000_000) * pricing["output"]
        
        return input_cost + output_cost


class ProviderRegistry:
    """Central registry for all cloud providers"""
    
    _providers = {
        "openai": OpenAIProvider(),
        "anthropic": AnthropicProvider(),
        "google": GoogleProvider(),
        "deepseek": DeepSeekProvider(),
    }
    
    @classmethod
    def get(cls, provider: str) -> BaseProvider:
        if provider not in cls._providers:
            raise ValueError(f"Unknown provider: {provider}")
        return cls._providers[provider]
    
    @classmethod
    def list_providers(cls) -> list[str]:
        return list(cls._providers.keys())
