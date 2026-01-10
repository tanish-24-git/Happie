"""Model management system for HAPIE"""

import os
import json
from pathlib import Path
from typing import List, Optional, Dict
from huggingface_hub import hf_hub_download, list_repo_files
from hapie.db import get_db
from hapie.db.models import Model as DBModel


class ModelManager:
    """Manages model installation, removal, and registry"""
    
    def __init__(self):
        self.db = get_db()
        self._cancel_flags = {} # track model_id -> bool
        self.models_dir = Path.home() / ".hapie" / "models"
        self.models_dir.mkdir(parents=True, exist_ok=True)
    
    def list_models(self) -> List[Dict]:
        """List all registered models"""
        session = self.db.get_session()
        try:
            models = session.query(DBModel).all()
            return [m.to_dict() for m in models]
        finally:
            session.close()
    
    def get_model(self, model_id: str) -> Optional[Dict]:
        """Get model by ID"""
        session = self.db.get_session()
        try:
            model = session.query(DBModel).filter(DBModel.id == model_id).first()
            return model.to_dict() if model else None
        finally:
            session.close()
    
    def get_active_model(self) -> Optional[Dict]:
        """Get currently active model"""
        session = self.db.get_session()
        try:
            model = session.query(DBModel).filter(DBModel.is_active == True).first()
            return model.to_dict() if model else None
        finally:
            session.close()
    
    def get_active_chat_model(self) -> Optional[Dict]:
        """
        Get the currently active chat model, excluding system intent models.
        
        Returns:
            Active chat model dict, or None if:
            - No model is active
            - Only system intent model is active
        
        This is the key method to detect "user has no chat model yet".
        """
        session = self.db.get_session()
        try:
            model = session.query(DBModel).filter(DBModel.is_active == True).first()
            if not model:
                return None
            
            # Check if this is the system intent model
            metadata = model.metadata_json or {}
            if metadata.get("role") == "system_intent":
                return None
            
            return model.to_dict()
        finally:
            session.close()
    
    def get_system_model(self) -> Optional[Dict]:
        """
        Get the system intent model (Qwen).
        
        Returns:
            System model dict with metadata["role"] == "system_intent"
        """
        session = self.db.get_session()
        try:
            models = session.query(DBModel).all()
            for model in models:
                metadata = model.metadata_json or {}
                if metadata.get("role") == "system_intent":
                    return model.to_dict()
            return None
        finally:
            session.close()
    
    def set_active_model(self, model_id: str) -> bool:
        """Set a model as active (deactivates others)"""
        session = self.db.get_session()
        try:
            # Deactivate all models
            session.query(DBModel).update({DBModel.is_active: False})
            
            # Activate target model
            model = session.query(DBModel).filter(DBModel.id == model_id).first()
            if model:
                model.is_active = True
                session.commit()
                return True
            return False
        finally:
            session.close()
    
    def register_model(
        self,
        model_id: str,
        name: str,
        model_type: str,
        provider: str,
        backend: str,
        model_path: str,
        size_mb: float = 0,
        is_base_model: bool = False,
        metadata: Dict = None
    ) -> Dict:
        """Register a new model in the database"""
        session = self.db.get_session()
        try:
            # Check if model already exists
            existing = session.query(DBModel).filter(DBModel.id == model_id).first()
            if existing:
                return existing.to_dict()
            
            model = DBModel(
                id=model_id,
                name=name,
                type=model_type,
                provider=provider,
                backend=backend,
                model_path=model_path,
                size_mb=size_mb,
                is_base_model=is_base_model,
                metadata_json=metadata or {}
            )
            session.add(model)
            session.commit()
            session.refresh(model)
            return model.to_dict()
        finally:
            session.close()
    
    def remove_model(self, model_id: str) -> bool:
        """Remove a model from registry and delete files"""
        session = self.db.get_session()
        try:
            model = session.query(DBModel).filter(DBModel.id == model_id).first()
            if not model:
                return False
            
            # Don't allow removing base model
            if model.is_base_model:
                raise ValueError("Cannot remove base model")
            
            # Delete model files if local
            if model.type == "local" and model.model_path:
                model_path = Path(model.model_path)
                if model_path.exists():
                    if model_path.is_file():
                        model_path.unlink()
                    elif model_path.is_dir():
                        import shutil
                        shutil.rmtree(model_path)
            
            session.delete(model)
            session.commit()
            return True
        finally:
            session.close()
    
    def pull_huggingface_model(
        self,
        repo_id: str,
        filename: str,
        model_id: str = None,
        name: str = None
    ) -> Dict:
        """
        Pull a GGUF model from Hugging Face
        
        Args:
            repo_id: HuggingFace repo ID (e.g., "TheBloke/Llama-2-7B-GGUF")
            filename: Model filename (e.g., "llama-2-7b.Q4_K_M.gguf")
            model_id: Custom model ID (defaults to filename without extension)
            name: Display name (defaults to repo_id)
        
        Returns:
            Registered model dict
        """
        if model_id is None:
            model_id = Path(filename).stem.lower()  # ID is safe to lowercase
        
        if name is None:
            name = repo_id.split("/")[-1]
        
        # Get token from DB
        from hapie.cloud import ApiKeyManager
        session = self.db.get_session()
        token = None
        try:
            manager = ApiKeyManager(session)
            token = manager.get_key("huggingface")
        except:
            pass
        finally:
            session.close()

        # Download model
        print(f"Downloading {repo_id}/{filename}...")
        try:
            local_path = hf_hub_download(
                repo_id=repo_id,
                filename=filename,  # Respect case!
                token=token,       # Use user's token
                cache_dir=str(self.models_dir),
                resume_download=True
            )
        except Exception as e:
            if "401" in str(e) or "403" in str(e):
                raise ValueError("Authentication failed. Please check your HF_TOKEN in settings.")
            raise e
        
        # Get file size
        size_mb = Path(local_path).stat().st_size / (1024 * 1024)
        
        # Register model
        return self.register_model(
            model_id=model_id,
            name=name,
            model_type="local",
            provider="huggingface",
            backend="llama.cpp",
            model_path=local_path,
            size_mb=size_mb,
            metadata={
                "repo_id": repo_id,
                "filename": filename
            }
        )
    
    async def pull_model_stream(
        self,
        repo_id: str,
        filename: str,
        model_id: str = None,
        name: str = None
    ):
        """
        Generator yielding download progress for GGUF models.
        Yields JSON: {"status": "downloading", "progress": 45, "total": 100, ...}
        """
        if model_id is None:
            model_id = Path(filename).stem.lower()
        
        if name is None:
            name = repo_id.split("/")[-1]
            
        # 1. Get Token
        from hapie.cloud import ApiKeyManager
        session = self.db.get_session()
        token = None
        try:
            manager = ApiKeyManager(session)
            token = manager.get_key("huggingface")
        except:
            pass
        finally:
            session.close()

        # 2. Metadata fetch
        try:
            from huggingface_hub import get_hf_file_metadata, hf_hub_url
            
            url = hf_hub_url(repo_id, filename)
            meta = get_hf_file_metadata(url, token=token)
            total_size = meta.size
        except:
            total_size = 0 
            
        import asyncio
        from concurrent.futures import ThreadPoolExecutor
        
        loop = asyncio.get_event_loop()
        executor = ThreadPoolExecutor(max_workers=1)
        
        def run_download():
            return hf_hub_download(
                repo_id=repo_id,
                filename=filename,
                token=token,
                cache_dir=str(self.models_dir),
                resume_download=True
            )
            
        future = loop.run_in_executor(executor, run_download)
        
        yield {
            "status": "downloading", 
            "modelId": model_id, 
            "totalSize": total_size, 
            "progress": 0, 
            "speed": "Starting...",
            "eta": "..."
        }
        
        import time
        start_time = time.time()
        
        # Monitor Loop
        while not future.done():
            if self._cancel_flags.get(model_id):
                # How to kill hf_hub_download? We can't easily kill the thread.
                # But we can stop yielding and let it finish in background or orphan it.
                # hf_hub_download is atomic, so orphaning it is the most stable way.
                yield {"status": "error", "error": "Download cancelled"}
                del self._cancel_flags[model_id]
                return

            await asyncio.sleep(0.5)
            elapsed = time.time() - start_time
            # Fake progress 10-90% over 60 seconds
            fake_progress = min(90, int(elapsed * 1.5))
            
            yield {
                "status": "downloading", 
                "modelId": model_id, 
                "totalSize": total_size,
                "downloaded": int((fake_progress / 100) * total_size),
                "progress": fake_progress, 
                "speed": "Downloading...", 
                "eta": "..."
            }
            
        try:
            local_path = await future
            
            size_mb = Path(local_path).stat().st_size / (1024 * 1024)
            self.register_model(
                model_id=model_id,
                name=name,
                model_type="local",
                provider="huggingface",
                backend="llama.cpp",
                model_path=local_path,
                size_mb=size_mb,
                metadata={"repo_id": repo_id, "filename": filename}
            )
            
            yield {
                "status": "complete", 
                "modelId": model_id, 
                "progress": 100, 
                "totalSize": total_size,
                "speed": "Done", 
                "eta": "0s"
            }
        except Exception as e:
            if "401" in str(e) or "403" in str(e):
                yield {"status": "error", "error": "Authentication failed. Check HF_TOKEN."}
            else:
                yield {"status": "error", "error": str(e)}
        finally:
            if model_id in self._cancel_flags:
                del self._cancel_flags[model_id]

    def cancel_download(self, model_id: str):
        """Signals a download to stop"""
        self._cancel_flags[model_id] = True
        return True

    def add_cloud_model(
        self,
        model_id: str,
        name: str,
        provider: str,
        api_endpoint: str,
        api_key: str = None
    ) -> Dict:
        """Add a cloud API model (OpenAI, Anthropic, etc.)"""
        return self.register_model(
            model_id=model_id,
            name=name,
            model_type="cloud",
            provider=provider,
            backend="api",
            model_path=api_endpoint,
            metadata={
                "api_key": api_key,
                "endpoint": api_endpoint
            }
        )
