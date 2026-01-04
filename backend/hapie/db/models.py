"""Database models for HAPIE"""

from sqlalchemy import Column, String, Integer, Float, Boolean, JSON, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()


class Model(Base):
    """Model registry table"""
    __tablename__ = "models"
    
    id = Column(String, primary_key=True)  # e.g., "qwen2.5-1.5b-instruct"
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # "local" or "cloud"
    provider = Column(String)  # "huggingface", "openai", etc.
    size_mb = Column(Float)
    backend = Column(String)  # "llama.cpp", "transformers", "api"
    is_active = Column(Boolean, default=False)
    is_base_model = Column(Boolean, default=False)
    model_path = Column(String)  # Local path or API endpoint
    metadata_json = Column(JSON)
    created_at = Column(Integer, default=lambda: int(datetime.now().timestamp()))
    
    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "type": self.type,
            "provider": self.provider,
            "size_mb": self.size_mb,
            "backend": self.backend,
            "is_active": self.is_active,
            "is_base_model": self.is_base_model,
            "model_path": self.model_path,
            "metadata": self.metadata_json,
            "created_at": self.created_at,
        }


class SystemProfile(Base):
    """System hardware profile table"""
    __tablename__ = "system_profile"
    
    id = Column(Integer, primary_key=True)
    capability_json = Column(JSON, nullable=False)
    policy_json = Column(JSON, nullable=False)
    updated_at = Column(Integer, default=lambda: int(datetime.now().timestamp()))


class Conversation(Base):
    """Conversation/chat session table"""
    __tablename__ = "conversations"
    
    id = Column(String, primary_key=True)
    title = Column(String)
    model_id = Column(String, ForeignKey("models.id"))
    created_at = Column(Integer, default=lambda: int(datetime.now().timestamp()))
    updated_at = Column(Integer, default=lambda: int(datetime.now().timestamp()))
    
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")
    
    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "model_id": self.model_id,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }


class Message(Base):
    """Chat message table"""
    __tablename__ = "messages"
    
    id = Column(String, primary_key=True)
    conversation_id = Column(String, ForeignKey("conversations.id"))
    role = Column(String, nullable=False)  # "user" or "assistant"
    content = Column(Text, nullable=False)
    model_id = Column(String)  # Which model generated this (for comparison mode)
    created_at = Column(Integer, default=lambda: int(datetime.now().timestamp()))
    
    conversation = relationship("Conversation", back_populates="messages")
    
    def to_dict(self):
        return {
            "id": self.id,
            "conversation_id": self.conversation_id,
            "role": self.role,
            "content": self.content,
            "model_id": self.model_id,
            "created_at": self.created_at,
        }


class ApiKey(Base):
    """
    Encrypted storage for user-provided cloud API keys
    
    Security notes:
    - Keys stored encrypted using Fernet
    - Never transmitted to HAPIE servers
    - Decrypted only in memory at request time
    """
    __tablename__ = "api_keys"
    
    provider = Column(String, primary_key=True)  # "openai", "anthropic", etc.
    encrypted_key = Column(Text, nullable=False)  # Fernet-encrypted
    created_at = Column(Integer, nullable=False)
    last_used = Column(Integer, nullable=True)  # Unix timestamp
    
    def to_dict(self):
        """Returns masked key for UI display"""
        return {
            "provider": self.provider,
            "key_preview": "***...***",  # Never expose full key
            "created_at": self.created_at,
            "last_used": self.last_used,
        }
