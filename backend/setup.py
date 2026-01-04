"""Setup script to initialize HAPIE with base model"""

import sys
import os
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from hapie.models import ModelManager
from hapie.hardware import HardwareDetector
from hapie.policy import PolicyEngine


def setup_base_model():
    """Download and register the base model (Qwen2.5-1.5B-Instruct)"""
    print("=" * 60)
    print("HAPIE Setup - Installing Base Model")
    print("=" * 60)
    
    model_manager = ModelManager()
    
    # Check if base model already exists
    existing_models = model_manager.list_models()
    base_models = [m for m in existing_models if m.get("is_base_model")]
    
    if base_models:
        print(f"✓ Base model already installed: {base_models[0]['name']}")
        model_manager.set_active_model(base_models[0]['id'])
        return base_models[0]
    
    print("\nDownloading base model: Qwen2.5-1.5B-Instruct (GGUF)")
    print("This may take a few minutes...")
    print()
    
    try:
        # Pull Qwen2.5-1.5B-Instruct GGUF from HuggingFace
        model = model_manager.pull_huggingface_model(
            repo_id="Qwen/Qwen2.5-1.5B-Instruct-GGUF",
            filename="qwen2.5-1.5b-instruct-q4_k_m.gguf",
            model_id="qwen2.5-1.5b-instruct",
            name="Qwen2.5 1.5B Instruct"
        )
        
        # Mark as base model
        from hapie.db import get_db
        from hapie.db.models import Model as DBModel
        db = get_db()
        session = db.get_session()
        try:
            db_model = session.query(DBModel).filter(DBModel.id == model["id"]).first()
            if db_model:
                db_model.is_base_model = True
                db_model.is_active = True
                session.commit()
        finally:
            session.close()
        
        print()
        print("=" * 60)
        print("✓ Base model installed successfully!")
        print(f"  Model: {model['name']}")
        print(f"  Size: {model['size_mb']:.2f} MB")
        print(f"  Path: {model['model_path']}")
        print("=" * 60)
        
        return model
        
    except Exception as e:
        print(f"\n✗ Failed to download base model: {e}")
        print("\nYou can manually download a GGUF model and register it using:")
        print("  python -m hapie.models.manager register <model_path>")
        sys.exit(1)


def show_system_info():
    """Display system hardware information"""
    print("\nDetecting hardware...")
    detector = HardwareDetector()
    capability = detector.detect()
    
    print("\n" + "=" * 60)
    print("System Hardware Profile")
    print("=" * 60)
    print(f"CPU: {capability.cpu_brand}")
    print(f"  Cores: {capability.cpu_cores} physical, {capability.cpu_threads} logical")
    print(f"  Architecture: {capability.cpu_arch}")
    print(f"\nRAM: {capability.total_ram_gb}GB total, {capability.available_ram_gb}GB available")
    print(f"\nGPU: {capability.gpu_vendor.value}")
    if capability.gpu_name:
        print(f"  Name: {capability.gpu_name}")
        print(f"  VRAM: {capability.gpu_vram_gb}GB")
    else:
        print("  No GPU detected - will use CPU inference")
    
    print("\n" + "=" * 60)
    print("Execution Policy")
    print("=" * 60)
    
    policy_engine = PolicyEngine()
    policy = policy_engine.evaluate(capability)
    
    print(f"Backend: {policy.backend.value.upper()}")
    print(f"GPU Layers: {policy.gpu_layers}")
    print(f"Max Context Length: {policy.max_context_length}")
    print(f"Quantization: {policy.quantization_bits}-bit" if policy.use_quantization else "None")
    print(f"Max Threads: {policy.max_threads}")
    print("=" * 60)


if __name__ == "__main__":
    print("\n🚀 HAPIE - Hardware-Aware Performance Inference Engine\n")
    
    # Show system info
    show_system_info()
    
    # Setup base model
    print()
    setup_base_model()
    
    print("\n✓ Setup complete! You can now start the HAPIE server:")
    print("\n  cd backend")
    print("  python -m hapie.main")
    print("\n  or")
    print("\n  uvicorn hapie.main:app --host 127.0.0.1 --port 8000")
    print()
