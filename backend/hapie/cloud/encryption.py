"""
API Key Encryption Manager

Security guarantees:
- Keys encrypted at rest using Fernet (AES-128)
- Encryption key stored with user-only permissions
- Keys decrypted only in memory at request time
- Never logged or transmitted to external servers
"""

from cryptography.fernet import Fernet
import os
from pathlib import Path
from datetime import datetime


class ApiKeyManager:
    """Manages encrypted storage of user-provided API keys"""
    
    def __init__(self, db_session):
        self.db = db_session
        self._cipher = self._get_cipher()
    
    def _get_cipher(self) -> Fernet:
        """
        Generate or load encryption key.
        Key stored in ~/.hapie/.encryption_key (user-only permissions)
        """
        key_path = Path.home() / ".hapie" / ".encryption_key"
        
        if not key_path.exists():
            # Generate new encryption key
            key = Fernet.generate_key()
            key_path.parent.mkdir(parents=True, exist_ok=True)
            key_path.write_bytes(key)
            
            # Set user-only permissions (read/write for owner only)
            try:
                os.chmod(key_path, 0o600)
            except Exception:
                # Windows doesn't support chmod the same way
                pass
        else:
            key = key_path.read_bytes()
        
        return Fernet(key)
    
    def save_key(self, provider: str, api_key: str) -> None:
        """Encrypt and save API key for provider"""
        from hapie.db.models import ApiKey
        
        # Encrypt the key
        encrypted = self._cipher.encrypt(api_key.encode()).decode('utf-8')
        
        # Check if key already exists
        existing = self.db.query(ApiKey).filter(ApiKey.provider == provider).first()
        
        if existing:
            existing.encrypted_key = encrypted
            existing.last_used = None  # Reset last_used on update
        else:
            new_key = ApiKey(
                provider=provider,
                encrypted_key=encrypted,
                created_at=int(datetime.now().timestamp()),
                last_used=None
            )
            self.db.add(new_key)
        
        self.db.commit()
    
    def get_key(self, provider: str) -> str:
        """
        Retrieve and decrypt API key (in-memory only)
        Never logged, never persisted after retrieval
        """
        from hapie.db.models import ApiKey
        
        key_record = self.db.query(ApiKey).filter(ApiKey.provider == provider).first()
        
        if not key_record:
            raise KeyError(f"No API key found for provider: {provider}")
        
        # Update last_used timestamp
        key_record.last_used = int(datetime.now().timestamp())
        self.db.commit()
        
        # Decrypt and return (in-memory only)
        decrypted = self._cipher.decrypt(key_record.encrypted_key.encode()).decode('utf-8')
        return decrypted
    
    def delete_key(self, provider: str) -> None:
        """Securely delete API key"""
        from hapie.db.models import ApiKey
        
        key_record = self.db.query(ApiKey).filter(ApiKey.provider == provider).first()
        
        if key_record:
            self.db.delete(key_record)
            self.db.commit()
    
    def list_keys(self) -> list:
        """List all configured providers (keys masked)"""
        from hapie.db.models import ApiKey
        
        keys = self.db.query(ApiKey).all()
        return [key.to_dict() for key in keys]
