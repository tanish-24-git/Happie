# How to Calculate If an LLM Will Run on Your PC

## What PC Info You Need

To determine if a model will run, you only need these values from the user's machine:

```
available_ram_gb    # RAM actually free right now (not total)
gpu_vram_gb         # VRAM per GPU card
gpu_count           # number of GPU cards (0 = CPU-only)
```

Derived from those:

```
total_gpu_vram = gpu_vram_gb × gpu_count
```

If `gpu_count` is 0, the model must run entirely in RAM.

---

## The Core Formula

```
run_memory_gb = model_params_billion × bytes_per_param × 1.2
```

The `× 1.2` accounts for ~20% overhead from KV cache, activations, and runtime buffers.

**Download / disk size** (no overhead):

```
download_gb = model_params_billion × bytes_per_param
```

### Fit Decision

```
fits_on_gpu = run_memory_gb ≤ total_gpu_vram
fits_on_ram = run_memory_gb ≤ available_ram_gb
```

If neither fits, the model cannot run.

---

## Bytes Per Parameter by Precision

| Format    | bytes_per_param | Notes                              |
|-----------|-----------------|------------------------------------|
| F32       | 4.0             | Full precision, rarely used locally |
| F16/BF16  | 2.0             | Half precision, standard GPU       |
| Q8 (int8) | 1.0             | Near-lossless quantization         |
| Q6        | 0.75            | Good quality, smaller              |
| Q5        | 0.625           | Solid balance                      |
| Q4 (int4) | 0.5             | **Most popular for local use**     |
| Q3        | 0.375           | Noticeable quality loss            |
| Q2        | 0.25            | Very lossy, last resort            |

---

## Python Implementation

```python
BYTES_PER_PARAM = {
    "F32": 4.0,
    "F16": 2.0,
    "Q8":  1.0,
    "Q6":  0.75,
    "Q5":  0.625,
    "Q4":  0.5,
    "Q3":  0.375,
    "Q2":  0.25,
}

OVERHEAD = 1.2

def check_model_fit(
    params_billion: float,
    available_ram_gb: float,
    gpu_vram_gb: float,
    gpu_count: int,
) -> dict:
    total_vram = gpu_vram_gb * max(gpu_count, 1) if gpu_count > 0 else 0
    results = {}

    for fmt, bpp in BYTES_PER_PARAM.items():
        run_mem   = params_billion * bpp * OVERHEAD
        download  = params_billion * bpp

        gpu_fit = (run_mem <= total_vram) if total_vram > 0 else None
        ram_fit = run_mem <= available_ram_gb

        results[fmt] = {
            "run_memory_gb": round(run_mem, 2),
            "download_gb":   round(download, 2),
            "fits_on_gpu":   gpu_fit,
            "fits_on_ram":   ram_fit,
        }

    return results
```

---

## Examples

### Example 1 — Budget laptop (CPU only)

**PC specs:**
```
available_ram_gb = 12
gpu_count        = 0
```

**Checking a 7B parameter model:**

| Format | Run memory | Fits RAM? |
|--------|-----------|-----------|
| F32    | 7 × 4.0 × 1.2 = **33.6 GB** | ❌ No  |
| F16    | 7 × 2.0 × 1.2 = **16.8 GB** | ❌ No  |
| Q8     | 7 × 1.0 × 1.2 = **8.4 GB**  | ✅ Yes |
| Q4     | 7 × 0.5 × 1.2 = **4.2 GB**  | ✅ Yes |

**Conclusion:** Must use Q8 or Q4. Q4 recommended for speed + size.

---

### Example 2 — Mid-range gaming PC

**PC specs:**
```
available_ram_gb = 28
gpu_vram_gb      = 8
gpu_count        = 1
total_gpu_vram   = 8 GB
```

**Checking a 13B parameter model:**

| Format | Run memory | Fits GPU (8 GB)? | Fits RAM (28 GB)? |
|--------|-----------|-----------------|------------------|
| F32    | 13 × 4.0 × 1.2 = **62.4 GB** | ❌ | ❌ |
| F16    | 13 × 2.0 × 1.2 = **31.2 GB** | ❌ | ❌ |
| Q8     | 13 × 1.0 × 1.2 = **15.6 GB** | ❌ | ✅ |
| Q4     | 13 × 0.5 × 1.2 = **7.8 GB**  | ✅ | ✅ |

**Conclusion:** Q4 fits on GPU (fast). Q8 fits on RAM only (slow).

---

### Example 3 — Workstation with dual GPUs

**PC specs:**
```
available_ram_gb = 64
gpu_vram_gb      = 24
gpu_count        = 2
total_gpu_vram   = 48 GB
```

**Checking a 70B parameter model:**

| Format | Run memory | Fits GPU (48 GB)? | Fits RAM (64 GB)? |
|--------|-----------|------------------|------------------|
| F32    | 70 × 4.0 × 1.2 = **336 GB** | ❌ | ❌ |
| F16    | 70 × 2.0 × 1.2 = **168 GB** | ❌ | ❌ |
| Q8     | 70 × 1.0 × 1.2 = **84 GB**  | ❌ | ❌ |
| Q4     | 70 × 0.5 × 1.2 = **42 GB**  | ✅ | ✅ |
| Q3     | 70 × 0.375 × 1.2 = **31.5 GB** | ✅ | ✅ |

**Conclusion:** Only Q4 or lower fits on GPU. Q4 recommended; Q3 if VRAM is tight.

---

## How to Find the Highest Quality That Fits

```python
def best_fit(params_billion, available_ram_gb, gpu_vram_gb, gpu_count):
    """
    Returns the highest-quality (largest bytes/param) format
    that fits on GPU first, then RAM as fallback.
    """
    total_vram = gpu_vram_gb * gpu_count if gpu_count > 0 else 0
    # Ordered best quality → most compressed
    priority = ["F32", "F16", "Q8", "Q6", "Q5", "Q4", "Q3", "Q2"]

    for fmt in priority:
        bpp = BYTES_PER_PARAM[fmt]
        run_mem = params_billion * bpp * OVERHEAD
        if total_vram > 0 and run_mem <= total_vram:
            return fmt, "GPU"
        if run_mem <= available_ram_gb:
            return fmt, "RAM (CPU)"

    return None, "Does not fit"
```

---

## Quick Mental Math Rules

- **F16 GB ≈ params × 2**
- **Q8 GB ≈ params × 1**  ← easy: 7B model = ~8.4 GB with overhead
- **Q4 GB ≈ params × 0.5** ← easy: 7B model = ~4.2 GB with overhead

For a rough "will it fit" check in your head:

```
Q4 model fits if:  params_billion < available_memory_gb ÷ 0.6
Q8 model fits if:  params_billion < available_memory_gb ÷ 1.2
F16 model fits if: params_billion < available_memory_gb ÷ 2.4
```

---

## Notes

- GPU inference is roughly **10–50× faster** than CPU/RAM inference.
- `available_ram_gb` matters more than `total_ram_gb` — always use free RAM.
- If a model barely fits (ratio < 1.5), expect slowdowns due to memory pressure.
- For RAM-only inference, expect ~1–5 tokens/second on most consumer hardware.
- Multi-GPU: VRAM adds up linearly only with proper tensor parallelism support (e.g. llama.cpp with `--n-gpu-layers`).
