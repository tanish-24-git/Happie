"""Quick test script to verify model loading"""

import sys
sys.path.insert(0, '/app')

from hapie.models import ModelManager, InferenceEngine
from hapie.hardware import HardwareDetector
from hapie.policy import PolicyEngine

print("=" * 60)
print("HAPIE Model Loading Test")
print("=" * 60)

# Get model
manager = ModelManager()
models = manager.list_models()
print(f"\nRegistered models: {len(models)}")
for m in models:
    print(f"  - {m['name']} ({m['id']})")
    print(f"    Path: {m['model_path']}")
    print(f"    Active: {m['is_active']}")

# Get hardware and policy
detector = HardwareDetector()
capability = detector.detect()
print(f"\nHardware: {capability.cpu_cores} cores, {capability.total_ram_gb}GB RAM")

policy_engine = PolicyEngine()
policy = policy_engine.evaluate(capability)
print(f"Policy: {policy.backend.value}, GPU layers: {policy.gpu_layers}")

# Try to load model
if models:
    model = models[0]
    print(f"\nAttempting to load: {model['name']}")
    print(f"Model path: {model['model_path']}")
    
    try:
        engine = InferenceEngine()
        engine.load_model(
            model_path=model['model_path'],
            policy=policy,
            model_id=model['id']
        )
        print("✓ Model loaded successfully!")
        
        # Try inference
        print("\nTesting inference...")
        result = engine.generate(
            model_id=model['id'],
            prompt="Hello, what is 2+2?",
            max_tokens=50
        )
        print(f"Response: {result['text']}")
        print(f"Metrics: {result['metrics']}")
        
    except Exception as e:
        print(f"✗ Failed to load model: {e}")
        import traceback
        traceback.print_exc()
