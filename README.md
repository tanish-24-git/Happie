# HAPIE - Hardware-Aware Performance Inference Engine

**The next-generation, local-first AI inference platform that optimizes itself based on your hardware.**

---

## 🌐 Live Demo & Status
- **Hosted Application**: [http://3.7.102.39:3000/](http://3.7.102.39:3000/)
- **API Status**: Running on AWS EC2
- **Desktop Application**: `.exe` download coming soon!

---

## 🚀 Mission
HAPIE (Hardware-Aware Performance Inference Engine) is designed to bridge the gap between high-end AI research and consumer hardware. It automatically detects your System Capabilities (CPU, RAM, GPU, VRAM) and calculates an optimal **Execution Policy** to deliver the fastest possible local inference without crashing your system.

---

## 🛠️ Tech Stack

### Backend (Python Core)
- **FastAPI**: High-performance asynchronous API framework.
- **llama-cpp-python**: Core inference engine providing GGUF support with hardware acceleration (CUDA, Metal, Vulkan).
- **HuggingFace Hub**: Integrated model pulling and management.
- **PSUtil / GPUtil**: Real-time hardware telemetry and load monitoring.
- **SQLAlchemy / SQLite**: Local model registry and configuration storage.
- **Pydantic**: Strict data validation and settings management.

### Frontend (Next.js Application)
- **Next.js 15+**: React framework for production-grade web apps.
- **Tailwind CSS 4.0**: Modern, utility-first styling.
- **Radix UI**: Accessible, unstyled primitives for building high-quality UI components.
- **Lucide Icons**: Beautifully simple pixel-perfect icons.
- **Shadcn/UI**: Reusable components built on Radix and Tailwind.
- **Framer Motion**: Advanced animations for a premium user experience.

---

## 🏗️ Core Architecture (Internal Logic)

### 1. Hardware Detector (`hapie.hardware`)
The detector performs deep system inspection to identify:
- **CPU**: Brand, core count, thread count, and architecture.
- **RAM**: Total system memory vs. available memory.
- **GPU**: Vendor (NVIDIA, AMD, Intel, Apple), VRAM capacity, and device count.
- **Environment Awareness**: Detects if running inside Docker and maps host hardware via environment variables to bypass container isolation limits.

### 2. Policy Engine (`hapie.policy`)
Based on detected hardware, the engine evaluates an `ExecutionPolicy`:
- **Backend Selection**: Automatically chooses between `LLAMA_CPP`, `CUDA`, or `CPU`.
- **GPU Offloading**: Calculates the exact number of layers to offload to VRAM to maximize speed without overflow.
- **Threads & Batching**: Optimizes CPU thread usage based on physical vs. logical cores.
- **Quantization Strategy**: Recommends `Q4_K_M` or `Q5_K_M` based on available RAM.

### 3. Model Manager (`hapie.models`)
- **Seamless Pulling**: Download GGUF models directly from HuggingFace.
- **Registry**: Tracks model metadata, file paths, and quantization types.
- **Dynamic Loading**: Loads and unloads models on-demand to manage memory usage.

---

## 📂 Project Structure

```bash
happie/
├── backend/
│   ├── hapie/
│   │   ├── api/              # FastAPI Route Handlers (System, Chat, Models, Settings)
│   │   ├── hardware/         # Hardware Detection Logic (CPU/GPU/RAM)
│   │   ├── policy/           # Hardware-to-Policy Mapping Logic
│   │   ├── models/           # Inference Engine & Model Registry
│   │   ├── db/               # SQLAlchemy Models & SQLite Config
│   │   └── main.py           # Application Entry Point & Lifespan Management
│   ├── Dockerfile            # Container definition
│   └── setup.py              # Automated hardware setup script
├── frontend/                 # Next.js Dashboard Source
│   ├── app/                  # Next.js App Router Pages
│   ├── components/           # Reusable UI Components
│   └── styles/               # Tailwind & Global CSS
├── docker-compose.yml        # Orchestration for Backend + Frontend
└── README.md                 # This documentation file
```

---

## 🔌 API Overview

### System Metrics
- `GET /api/system/info`: Returns combined hardware capability and calculated execution policy.
- `GET /api/system/metrics`: Real-time CPU/RAM/Disk usage tracking.

### Model Management
- `GET /api/models/`: List all registered models.
- `POST /api/models/pull`: Download a new model from a HuggingFace repository.

### Inference
- `POST /api/chat/single`: Chat with the currently active model.
- `POST /api/chat/compare`: Execute parallel inference across multiple models for side-by-side comparison.

---

## 🚧 Roadmap
- [ ] **Windows Desktop Wrapper**: Bundling as a standalone `.exe` (likely using Tauri or Electron) for easy installation.
- [ ] **Image Generation**: Integrating Stable Diffusion for multimodal capabilities.
- [ ] **Audio Engine**: TTS (Text-to-Speech) and STT (Speech-to-Text).
- [ ] **Knowledge Base (RAG)**: Local document embedding and retrieval.

---

## 📄 License
Apache-2.0

---
**Built with ❤️ for the Local AI Community.**
