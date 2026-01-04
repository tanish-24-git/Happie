"""Policy engine for hardware-aware execution decisions"""

from dataclasses import dataclass, asdict
from enum import Enum
from hapie.hardware import SystemCapability, GPUVendor


class BackendType(str, Enum):
    """Execution backend types"""
    CPU = "cpu"
    CUDA = "cuda"
    ONNX_GPU = "onnx_gpu"
    METAL = "metal"  # For Apple Silicon


@dataclass
class ExecutionPolicy:
    """Execution policy based on hardware capabilities"""
    backend: BackendType
    max_batch_size: int
    max_context_length: int
    use_quantization: bool
    quantization_bits: int  # 4, 8, or 16
    gpu_layers: int  # Number of layers to offload to GPU (0 = CPU only)
    max_threads: int
    
    def to_dict(self):
        """Convert to dictionary"""
        return asdict(self)


class PolicyEngine:
    """Converts hardware capabilities into execution policies"""
    
    def evaluate(self, capability: SystemCapability) -> ExecutionPolicy:
        """
        Evaluate hardware capability and return execution policy
        
        Args:
            capability: System hardware capability profile
            
        Returns:
            ExecutionPolicy for model execution
        """
        # Determine backend
        backend = self._select_backend(capability)
        
        # GPU-based policies
        if backend == BackendType.CUDA and capability.gpu_vram_gb:
            return self._cuda_policy(capability)
        
        # CPU-only policy
        return self._cpu_policy(capability)
    
    def _select_backend(self, capability: SystemCapability) -> BackendType:
        """Select appropriate backend based on hardware"""
        if capability.gpu_vendor == GPUVendor.NVIDIA and capability.gpu_vram_gb:
            # NVIDIA GPU available - use CUDA
            return BackendType.CUDA
        elif capability.gpu_vendor in [GPUVendor.AMD, GPUVendor.INTEL]:
            # AMD/Intel GPU - could use ONNX in future
            # For now, fall back to CPU
            return BackendType.CPU
        else:
            # No GPU or unsupported - use CPU
            return BackendType.CPU
    
    def _cuda_policy(self, capability: SystemCapability) -> ExecutionPolicy:
        """Create policy for CUDA backend"""
        vram_gb = capability.gpu_vram_gb or 0
        
        if vram_gb >= 8:
            # High VRAM - full GPU offload, FP16
            return ExecutionPolicy(
                backend=BackendType.CUDA,
                max_batch_size=8,
                max_context_length=4096,
                use_quantization=False,
                quantization_bits=16,
                gpu_layers=999,  # Offload all layers
                max_threads=capability.cpu_threads,
            )
        elif vram_gb >= 4:
            # Medium VRAM - partial offload, INT8
            return ExecutionPolicy(
                backend=BackendType.CUDA,
                max_batch_size=4,
                max_context_length=2048,
                use_quantization=True,
                quantization_bits=8,
                gpu_layers=20,  # Partial offload
                max_threads=capability.cpu_threads,
            )
        else:
            # Low VRAM - minimal offload, INT4
            return ExecutionPolicy(
                backend=BackendType.CUDA,
                max_batch_size=2,
                max_context_length=2048,
                use_quantization=True,
                quantization_bits=4,
                gpu_layers=10,
                max_threads=capability.cpu_threads,
            )
    
    def _cpu_policy(self, capability: SystemCapability) -> ExecutionPolicy:
        """Create policy for CPU-only backend"""
        ram_gb = capability.available_ram_gb
        
        if ram_gb >= 16:
            # High RAM - larger context, INT8
            return ExecutionPolicy(
                backend=BackendType.CPU,
                max_batch_size=2,
                max_context_length=4096,
                use_quantization=True,
                quantization_bits=8,
                gpu_layers=0,
                max_threads=min(capability.cpu_threads, 8),
            )
        elif ram_gb >= 8:
            # Medium RAM - standard context, INT4
            return ExecutionPolicy(
                backend=BackendType.CPU,
                max_batch_size=1,
                max_context_length=2048,
                use_quantization=True,
                quantization_bits=4,
                gpu_layers=0,
                max_threads=min(capability.cpu_threads, 4),
            )
        else:
            # Low RAM - restricted, aggressive quantization
            return ExecutionPolicy(
                backend=BackendType.CPU,
                max_batch_size=1,
                max_context_length=1024,
                use_quantization=True,
                quantization_bits=4,
                gpu_layers=0,
                max_threads=min(capability.cpu_threads, 2),
            )
