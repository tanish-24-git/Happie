"""Hardware detection layer for HAPIE"""

import platform
from dataclasses import dataclass, asdict
from enum import Enum
from typing import Optional
import psutil

try:
    import GPUtil
    GPU_UTIL_AVAILABLE = True
except ImportError:
    GPU_UTIL_AVAILABLE = False

try:
    import cpuinfo
    CPU_INFO_AVAILABLE = True
except ImportError:
    CPU_INFO_AVAILABLE = False


class GPUVendor(str, Enum):
    """GPU vendor enumeration"""
    NVIDIA = "nvidia"
    AMD = "amd"
    INTEL = "intel"
    NONE = "none"


@dataclass
class SystemCapability:
    """System hardware capability profile"""
    cpu_cores: int
    cpu_threads: int
    cpu_arch: str
    cpu_brand: str
    total_ram_gb: float
    available_ram_gb: float
    gpu_vendor: GPUVendor
    gpu_name: Optional[str]
    gpu_vram_gb: Optional[float]
    gpu_count: int
    platform_system: str
    platform_release: str
    
    def to_dict(self):
        """Convert to dictionary"""
        return asdict(self)


class HardwareDetector:
    """Detects hardware capabilities and creates system profile"""
    
    def __init__(self):
        self._cached_capability: Optional[SystemCapability] = None
    
    def detect(self, force_refresh: bool = False) -> SystemCapability:
        """
        Detect hardware and return capability profile
        
        Args:
            force_refresh: Force re-detection even if cached
            
        Returns:
            SystemCapability profile
        """
        if self._cached_capability and not force_refresh:
            return self._cached_capability
        
        capability = SystemCapability(
            cpu_cores=self._detect_cpu_cores(),
            cpu_threads=self._detect_cpu_threads(),
            cpu_arch=self._detect_cpu_arch(),
            cpu_brand=self._detect_cpu_brand(),
            total_ram_gb=self._detect_total_ram(),
            available_ram_gb=self._detect_available_ram(),
            gpu_vendor=self._detect_gpu_vendor(),
            gpu_name=self._detect_gpu_name(),
            gpu_vram_gb=self._detect_gpu_vram(),
            gpu_count=self._detect_gpu_count(),
            platform_system=platform.system(),
            platform_release=platform.release(),
        )
        
        self._cached_capability = capability
        return capability
    
    def _detect_cpu_cores(self) -> int:
        """Detect physical CPU cores"""
        return psutil.cpu_count(logical=False) or 1
    
    def _detect_cpu_threads(self) -> int:
        """Detect logical CPU threads"""
        return psutil.cpu_count(logical=True) or 1
    
    def _detect_cpu_arch(self) -> str:
        """Detect CPU architecture"""
        return platform.machine()
    
    def _detect_cpu_brand(self) -> str:
        """Detect CPU brand/model"""
        if CPU_INFO_AVAILABLE:
            try:
                info = cpuinfo.get_cpu_info()
                return info.get('brand_raw', 'Unknown')
            except Exception:
                pass
        return platform.processor() or "Unknown"
    
    def _detect_total_ram(self) -> float:
        """Detect total system RAM in GB"""
        return round(psutil.virtual_memory().total / (1024 ** 3), 2)
    
    def _detect_available_ram(self) -> float:
        """Detect available system RAM in GB"""
        return round(psutil.virtual_memory().available / (1024 ** 3), 2)
    
    def _detect_gpu_vendor(self) -> GPUVendor:
        """Detect GPU vendor"""
        if not GPU_UTIL_AVAILABLE:
            return GPUVendor.NONE
        
        try:
            gpus = GPUtil.getGPUs()
            if not gpus:
                return GPUVendor.NONE
            
            gpu_name = gpus[0].name.lower()
            if 'nvidia' in gpu_name or 'geforce' in gpu_name or 'rtx' in gpu_name or 'gtx' in gpu_name:
                return GPUVendor.NVIDIA
            elif 'amd' in gpu_name or 'radeon' in gpu_name:
                return GPUVendor.AMD
            elif 'intel' in gpu_name:
                return GPUVendor.INTEL
            else:
                return GPUVendor.NONE
        except Exception:
            return GPUVendor.NONE
    
    def _detect_gpu_name(self) -> Optional[str]:
        """Detect GPU name"""
        if not GPU_UTIL_AVAILABLE:
            return None
        
        try:
            gpus = GPUtil.getGPUs()
            return gpus[0].name if gpus else None
        except Exception:
            return None
    
    def _detect_gpu_vram(self) -> Optional[float]:
        """Detect GPU VRAM in GB"""
        if not GPU_UTIL_AVAILABLE:
            return None
        
        try:
            gpus = GPUtil.getGPUs()
            if gpus:
                # GPUtil returns memory in MB
                return round(gpus[0].memoryTotal / 1024, 2)
            return None
        except Exception:
            return None
    
    def _detect_gpu_count(self) -> int:
        """Detect number of GPUs"""
        if not GPU_UTIL_AVAILABLE:
            return 0
        
        try:
            return len(GPUtil.getGPUs())
        except Exception:
            return 0
