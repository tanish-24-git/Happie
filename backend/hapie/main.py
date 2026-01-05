"""HAPIE Local Agent - FastAPI Backend"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from hapie.api import system, chat, models, settings, recommend
from hapie.db import get_db
from hapie.hardware import HardwareDetector
from hapie.policy import PolicyEngine


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    print("=" * 50)
    print("HAPIE Local Agent Starting...")
    print("=" * 50)
    
    # Initialize database
    db = get_db()
    print(f"✓ Database initialized: {db.db_path}")
    
    # Detect hardware
    detector = HardwareDetector()
    capability = detector.detect()
    print(f"✓ Hardware detected:")
    print(f"  CPU: {capability.cpu_brand} ({capability.cpu_cores} cores, {capability.cpu_threads} threads)")
    print(f"  RAM: {capability.total_ram_gb}GB total, {capability.available_ram_gb}GB available")
    print(f"  GPU: {capability.gpu_vendor.value} - {capability.gpu_name or 'None'}")
    if capability.gpu_vram_gb:
        print(f"  VRAM: {capability.gpu_vram_gb}GB")
    
    # Evaluate policy
    policy_engine = PolicyEngine()
    policy = policy_engine.evaluate(capability)
    print(f"✓ Execution policy:")
    print(f"  Backend: {policy.backend.value}")
    print(f"  GPU Layers: {policy.gpu_layers}")
    print(f"  Max Context: {policy.max_context_length}")
    print(f"  Quantization: {policy.quantization_bits}-bit" if policy.use_quantization else "  Quantization: None")
    
    print("=" * 50)
    print("HAPIE Local Agent Ready on http://localhost:8000")
    print("=" * 50)
    
    yield
    
    # Shutdown
    print("HAPIE Local Agent shutting down...")
    db.close()


app = FastAPI(
    title="HAPIE Local Agent",
    description="Hardware-Aware Performance Inference Engine",
    version="0.1.0",
    lifespan=lifespan
)

# CORS middleware - allow hosted frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(system.router, prefix="/api/system", tags=["System"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(models.router, prefix="/api/models", tags=["Models"])
app.include_router(settings.router, prefix="/api/settings", tags=["Settings"])
app.include_router(recommend.router, prefix="/api/models", tags=["Models"])


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "HAPIE Local Agent",
        "version": "0.1.0",
        "status": "running"
    }


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
