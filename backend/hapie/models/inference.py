"""Inference engine for model execution"""

import time
from typing import Dict, Optional, Generator
from pathlib import Path
from llama_cpp import Llama
from hapie.policy import ExecutionPolicy, BackendType
import httpx
from fastapi import HTTPException


class InferenceEngine:
    """Handles model inference execution (local and cloud)"""
    
    def __init__(self):
        self._loaded_models: Dict[str, Llama] = {}  # Local models only
    
    async def generate_cloud(
        self,
        model: Dict,
        prompt: str,
        **kwargs
    ) -> Dict:
        """
        Execute cloud inference directly from local agent.
        
        Request flow:
        1. Retrieve encrypted API key from local database
        2. Decrypt in memory (never logged)
        3. Send request directly to cloud provider
        4. Return response to frontend
        
        At NO point does the request go through HAPIE servers.
        """
        from hapie.cloud import ApiKeyManager, ProviderRegistry
        from hapie.db import get_db
        
        provider_name = model["provider"]
        provider = ProviderRegistry.get(provider_name)
        
        db = get_db()
        session = db.get_session()
        try:
            manager = ApiKeyManager(session)
            
            try:
                # Retrieve and decrypt API key (in-memory only)
                api_key = manager.get_key(provider_name)
            except KeyError:
                raise HTTPException(
                    status_code=400,
                    detail=f"API key not configured for {provider_name}. Please add your API key in Settings."
                )
            
            try:
                # Direct API call from local agent to cloud provider
                result = await provider.generate(
                    prompt=prompt,
                    api_key=api_key,  # Decrypted in memory, never logged
                    model_name=model.get("cloud_model_name", model["name"]),
                    max_tokens=kwargs.get("max_tokens", 512),
                    temperature=kwargs.get("temperature", 0.7),
                )
                
                return result
                
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 401:
                    raise HTTPException(
                        status_code=401,
                        detail="Invalid API key. Please update in Settings."
                    )
                elif e.response.status_code == 429:
                    raise HTTPException(
                        status_code=429,
                        detail="Rate limit exceeded. Please try again later."
                    )
                else:
                    raise HTTPException(
                        status_code=500,
                        detail=f"Cloud provider error: {str(e)}"
                    )
        finally:
            session.close()

    
    def load_model(
        self,
        model_path: str,
        policy: ExecutionPolicy,
        model_id: str
    ) -> None:
        """
        Load a model into memory
        
        Args:
            model_path: Path to model file (.gguf)
            policy: Execution policy for this model
            model_id: Model identifier for caching
        """
        if model_id in self._loaded_models:
            return  # Already loaded
        
        print(f"Loading model: {model_id}")
        print(f"Policy: {policy.backend.value}, GPU layers: {policy.gpu_layers}")
        
        # Determine GPU usage
        n_gpu_layers = policy.gpu_layers if policy.backend == BackendType.CUDA else 0
        
        model = Llama(
            model_path=model_path,
            n_ctx=policy.max_context_length,
            n_threads=policy.max_threads,
            n_gpu_layers=n_gpu_layers,
            verbose=False
        )
        
        self._loaded_models[model_id] = model
        print(f"Model loaded: {model_id}")
    
    def unload_model(self, model_id: str) -> None:
        """Unload a model from memory"""
        if model_id in self._loaded_models:
            del self._loaded_models[model_id]
            print(f"Model unloaded: {model_id}")
    
    def generate(
        self,
        model_id: str,
        prompt: str,
        max_tokens: int = 512,
        temperature: float = 0.7,
        top_p: float = 0.9,
        stream: bool = False
    ) -> Dict:
        """
        Generate text from a loaded model
        
        Args:
            model_id: Model identifier
            prompt: Input prompt
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature
            top_p: Nucleus sampling parameter
            stream: Whether to stream response
        
        Returns:
            Dict with generated text and metrics
        """
        if model_id not in self._loaded_models:
            raise ValueError(f"Model {model_id} not loaded")
        
        model = self._loaded_models[model_id]
        
        start_time = time.time()
        
        output = model(
            prompt,
            max_tokens=max_tokens,
            temperature=temperature,
            top_p=top_p,
            echo=False,
            stream=stream
        )
        
        if stream:
            # Return generator for streaming
            return self._stream_response(output, start_time)
        else:
            # Return complete response
            end_time = time.time()
            latency_ms = (end_time - start_time) * 1000
            
            generated_text = output["choices"][0]["text"]
            tokens_generated = output["usage"]["completion_tokens"]
            tokens_per_sec = tokens_generated / (end_time - start_time) if end_time > start_time else 0
            
            return {
                "text": generated_text,
                "metrics": {
                    "latency_ms": round(latency_ms, 2),
                    "tokens_generated": tokens_generated,
                    "tokens_per_sec": round(tokens_per_sec, 2)
                }
            }
    
    def _stream_response(self, stream_output, start_time) -> Generator:
        """Stream response tokens"""
        for chunk in stream_output:
            token = chunk["choices"][0]["text"]
            yield {
                "token": token,
                "done": False
            }
        
        end_time = time.time()
        yield {
            "token": "",
            "done": True,
            "metrics": {
                "latency_ms": round((end_time - start_time) * 1000, 2)
            }
        }
    
    def is_loaded(self, model_id: str) -> bool:
        """Check if model is loaded"""
        return model_id in self._loaded_models
    
    def get_loaded_models(self) -> list:
        """Get list of loaded model IDs"""
        return list(self._loaded_models.keys())
