import json
import platform
import subprocess
import psutil


def detect_cpu():
    return {
        "cores": psutil.cpu_count(logical=False) or psutil.cpu_count(),
        "threads": psutil.cpu_count(logical=True)
    }


def detect_memory():
    ram_bytes = psutil.virtual_memory().total
    ram_gb = round(ram_bytes / (1024 ** 3))
    return {
        "ram_gb": ram_gb
    }


def detect_gpu():
    """
    Robust GPU detection:
    1. NVIDIA via nvidia-smi (authoritative)
    2. AMD via Windows WMIC fallback
    """
    gpu_info = {
        "present": False,
        "vendor": None,
        "vram_gb": None
    }

    # ===============================
    # NVIDIA DETECTION (BEST METHOD)
    # ===============================
    try:
        result = subprocess.check_output(
            [
                "nvidia-smi",
                "--query-gpu=memory.total",
                "--format=csv,noheader,nounits"
            ],
            stderr=subprocess.DEVNULL
        ).decode().strip()

        if result:
            vram_mb = int(result.split("\n")[0])
            gpu_info.update({
                "present": True,
                "vendor": "NVIDIA",
                "vram_gb": round(vram_mb / 1024)
            })
            return gpu_info
    except Exception:
        pass

    # ===============================
    # AMD DETECTION (WINDOWS FALLBACK)
    # ===============================
    if platform.system().lower() == "windows":
        try:
            output = subprocess.check_output(
                "wmic path win32_VideoController get name",
                shell=True
            ).decode().lower()

            if "amd" in output or "radeon" in output:
                gpu_info.update({
                    "present": True,
                    "vendor": "AMD",
                    "vram_gb": None  # Not reliably available via WMIC
                })
        except Exception:
            pass

    return gpu_info


def derive_capabilities(cpu, memory, gpu):
    if gpu["vendor"] == "NVIDIA":
        backend = "cuda"
        max_model = "13B"
        supports_gpu = True
    elif gpu["vendor"] == "AMD":
        backend = "onnxruntime"
        max_model = "7B"
        supports_gpu = True
    else:
        backend = "cpu"
        max_model = "3B"
        supports_gpu = False

    return {
        "supports_gpu": supports_gpu,
        "recommended_backend": backend,
        "max_model_size": max_model
    }


def main():
    print("[INFO] Starting hardware detection...")

    cpu = detect_cpu()
    memory = detect_memory()
    gpu = detect_gpu()
    capabilities = derive_capabilities(cpu, memory, gpu)

    profile = {
        "cpu": cpu,
        "memory": memory,
        "gpu": gpu,
        "capabilities": capabilities
    }

    print("[INFO] Hardware detection completed successfully.\n")
    print(json.dumps(profile, indent=2))


if __name__ == "__main__":
    main()
