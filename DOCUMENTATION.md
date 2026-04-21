# A Report on
# “HAPIE - Hardware-Aware Performance Inference Engine”

**Submitted By:** Tanish Jagtap

---

## Flow of Report
1. Abstract
2. Hardware / Software Requirement
3. Methodology
4. Modules
5. Working
6. Features
7. Connectivity Code (Front End with Back End)
8. Test Cases
9. Advantages / Limitation
10. Future Scope
11. Conclusion
12. References

---

## 1. Abstract

The Hardware-Aware Performance Inference Engine (HAPIE) is an advanced local-first AI inference platform designed to bridge the gap between high-end AI research models and standard consumer hardware. The system leverages state-of-the-art C++ inference libraries (`llama.cpp`) bound via Python, enabling the local execution of large language models (LLMs) in GGUF format without requiring cloud compute. A critical challenge in local AI inference is system instability caused by Out Of Memory (OOM) errors. HAPIE tackles this by employing an automated hardware detection layer that actively inspects the host's CPU architecture, physical and logical cores, available RAM, and GPU VRAM availability.

Based on the detected hardware profile, a dynamic Policy Engine formulates an execution strategy, intelligently offloading a specific number of neural network layers to the GPU, assigning optimal thread counts, and selecting context limits. The system is built with a dual-layer architecture: a highly performant FastAPI Python backend to handle heavy LLM computation, and a modern, modular React (Next.js) frontend showcasing real-time hardware telemetry and chat interfaces. This project demonstrates the practical application of local AI inference, systems programming, and full-stack development, delivering an optimized, private, and secure AI experience.

---

## 2. Hardware / Software Requirements

### Hardware Requirements
| Component | Specification |
| :--- | :--- |
| **Processor** | Intel Core i5 / AMD Ryzen 5 or higher |
| **RAM** | Minimum 8 GB (16 GB or more recommended) |
| **Storage** | 256 GB SSD (sufficient space for GGUF models) |
| **GPU (Optional)** | NVIDIA (CUDA), AMD, or Intel with dedicated VRAM |
| **Display** | 1080p Monitor (1920 x 1080) |

### Software Requirements
| Category | Tool / Technology |
| :--- | :--- |
| **Runtime** | Python 3.10+, Node.js |
| **Language** | Python, TypeScript/JavaScript |
| **Frontend Framework** | Next.js 15+ (React.js) |
| **UI Styling** | Tailwind CSS 4.0, Radix UI |
| **Backend Framework** | FastAPI |
| **ASGI Server** | Uvicorn |
| **Inference Engine** | llama-cpp-python |
| **Hardware Detection** | psutil, GPUtil, py-cpuinfo |
| **Database** | SQLite + SQLAlchemy |
| **Containerization** | Docker, Docker Compose |

---

## 3. Methodology

The project follows a robust full-stack and systems engineering approach tailored for local AI execution. The methodology is structured into the following phases:

**1. Hardware Telemetry & Profiling**
Before any AI model is loaded, the system queries the host hardware. It bypasses Docker isolation limits by injecting host environmental variables to accurately read total RAM. GPU capability is detected using `GPUtil` and custom NVML bindings.

**2. Policy Generation**
Instead of static configurations, a mathematical heuristic is applied. The Policy Engine calculates:
- Backend: Selects `CUDA` if an NVIDIA GPU is present, otherwise falls back to `CPU`.
- Layer Offloading: Divides the model size by available VRAM to determine how many transformer layers can safely sit in the GPU.
- RAM Allocation: Prevents exceeding the `available_ram_gb`.

**3. Model Management & Inference**
Using HuggingFace Hub, the backend pulls quantized GGUF models (e.g., Q4_K_M). The `llama-cpp-python` engine is dynamically initialized with the formulated policy parameters. The model processes prompts iteratively, yielding tokens for a real-time streaming effect.

**4. Real-time API & User Interface**
The FastAPI backend exposes endpoints for hardware polling and chat inference. The Next.js frontend repeatedly polls (`/api/system/metrics`) to render live CPU and RAM usage charts while users chat with the AI.

---

## 4. Modules

The application is divided into the following functional modules:

| Module | Description | Technology |
| :--- | :--- | :--- |
| **Hardware Detector** | Inspects system CPU, RAM, and GPU capabilities. | Python, psutil, GPUtil |
| **Policy Engine** | Maps detected hardware to safe inference parameters (GPU layers, threads). | Python |
| **Model Manager** | Downloads and registers GGUF models from HuggingFace. | Python, SQLite, HF Hub |
| **Inference Engine** | Handles the loading and execution of language models. | llama-cpp-python |
| **Backend API** | Provides REST endpoints for chat, model management, and system metrics. | FastAPI, Uvicorn |
| **Frontend UI** | Modern user dashboard to interact with chat and view system load. | Next.js, Tailwind CSS |

---

## 5. Working

### Hardware Detection & Initialization
1. Upon startup, the backend initializes the `HardwareDetector`.
2. It detects processor cores, total RAM, and looks for GPU specifications.
3. The `PolicyEngine` evaluates these limits and creates a profile (e.g., `gpu_layers: 20`, `max_threads: 6`).

### Model Management & Chat Interface
- **Model Pulling**: The user can input a HuggingFace repo ID (e.g., `TheBloke/TinyLlama-1.1B`). The backend downloads it into local storage.
- **Inference**: The user sends a chat message. The API receives it, passes it to the `InferenceEngine`, and the model processes the tokens.
- **Real-Time Telemetry**: The informational panel in the Next.js frontend fetches data every second to show a live progress bar of RAM usage and CPU load, ensuring transparency.

### Packaging Pipeline (Future Implementation)
The core Python backend and the Next.js frontend are prepared to be compiled into a single `.exe` file using tools like Tauri or PyInstaller, allowing simple one-click installation on any Windows machine.

---

## 6. Features

- **Hardware-Aware Execution**: Automatically prevents system crashes by analyzing available memory before loading massive LLMs.
- **Dynamic Policy Engine**: Auto-configures GPU offloading and CPU thread counts.
- **Local-First Privacy**: 100% of data and inference runs entirely on the local machine; zero data is sent to the cloud.
- **GGUF Model Support**: Capable of running quantized models which are significantly smaller and faster.
- **Real-Time Telemetry Dashboard**: Visual representation of live hardware strain (CPU % and RAM GB usage).
- **Docker-Ready**: Packaged with `docker-compose` and wrapper scripts for seamless setup in isolated environments.
- **Multi-Model Capability**: Supports downloading multiple models and switching between them on the fly.

---

## 7. Connectivity Code (Frontend with Backend)

The Next.js frontend communicates with the FastAPI backend via REST API calls. Below are key endpoints:

| Method | Endpoint | Purpose | Request Body |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/system/info` | Get hardware capabilities and policy | None |
| **GET** | `/api/system/metrics`| Fetch live CPU/RAM load percentage | None |
| **POST** | `/api/models/pull` | Download model from HuggingFace | `{ repo_id, filename }` |
| **POST** | `/api/chat/single` | Generate text from the active model | `{ prompt }` |

**Sample Frontend API Call (Fetch System Metrics)**
```typescript
const fetchMetrics = async () => {
  const response = await fetch("http://localhost:8000/api/system/metrics");
  const data = await response.json();
  console.log(`CPU: ${data.cpu_percent}%, RAM: ${data.memory_used_gb}GB`);
};
```

**FastAPI Backend Route Handler**
```python
@router.post("/chat/single")
async def chat_single(req: ChatRequest):
    # Retrieve active model configuration
    model = model_manager.get_active_model()
    # Execute prompt through inference engine
    response = inference_engine.generate(req.prompt)
    return {"response": response, "hardware_status": "stable"}
```

---

## 8. Test Cases

| TC # | Input (Action / Settings) | Expected Output | Actual Output | Status |
| :--- | :--- | :--- | :--- | :--- |
| **TC-01** | Start backend on CPU-only machine | Hardware detected as CPU, layers=0. | Policy limits 0 layers to GPU. | **PASS** |
| **TC-02** | Start backend with 16GB RAM & RTX 3060 | Hardware detects CUDA, sets high layers. | Policy offloads 35+ layers to VRAM. | **PASS** |
| **TC-03** | Frontend API request to `/api/system/metrics` | Returns CPU%, RAM usage live details. | Provides JSON with exact % metrics. | **PASS** |
| **TC-04** | Chat generation with `TinyLlama` | Fast streamed response generated locally. | Text completes coherently on screen. | **PASS** |
| **TC-05** | Load model larger than combined RAM+VRAM | Policy engine rejects load. | Error: Insufficient memory to load. | **PASS** |

---

## 9. Advantages & Limitations

### Advantages
1. **Total Privacy**: All data is highly secure because it never leaves the local machine.
2. **Crash Prevention**: Standard AI tools crash when VRAM is exceeded; HAPIE automatically scales parameters to prevent this.
3. **Hardware Optimized**: Ensures users get the bleeding edge of their hardware's speed capabilities dynamically.
4. **Modern Interface**: Aesthetically pleasing dashboard compared to traditional terminal-based execution.

### Limitations
1. **Hardware Dependent**: Low-end laptops without decent GPUs or minimal RAM will suffer from slow token generation speeds.
2. **Model Knowledge Confines**: Operates inherently on smaller, quantized models (1B to 8B parameters) due to consumer hardware limits, which lack the expansive knowledge of massive cloud models.

---

## 10. Future Scope

The HAPIE platform serves as a powerful foundational layer for local inference. Opportunities for expansion include:
1. **Windows Setup Executable (.exe)**: Packaging the entire dual-layered architecture (FastAPI + Next.js) using Tauri into a seamless desktop installer for consumers.
2. **Multimodal Expansion**: Incorporating Audio generation (TTS/STT) and Image Generation (Stable Diffusion) into the architecture.
3. **RAG (Retrieval-Augmented Generation)**: Allowing users to drop PDF/DOCX files directly into the frontend and query them securely, creating a private local knowledge base.

---

## 11. Conclusion

The HAPIE project effectively resolves the friction between demanding AI models and the limitations of consumer hardware. By introducing an intelligent hardware detection and policy-generation layer, the platform minimizes system crashes, prevents memory overload, and maximizes inference speed by fully utilizing available processors and graphics cards.

Combining a high-performance Python inference backend with a beautifully scalable React frontend demonstrates a highly practical approach to democratizing AI. As demand for local, offline, and absolutely private artificial intelligence grows, systems like HAPIE represent the necessary stepping stones toward decentralized AI capabilities embedded natively in everyday devices.

---

## 12. References

1. **llama-cpp-python Documentation**: https://github.com/abetlen/llama-cpp-python
2. **FastAPI Documentation**: https://fastapi.tiangolo.com/
3. **Next.js & React Documentation**: https://nextjs.org/docs
4. **psutil Documentation**: https://psutil.readthedocs.io/
5. **Tailwind CSS Documentation**: https://tailwindcss.com/docs
6. **HuggingFace Resource Hub**: https://huggingface.co/models
