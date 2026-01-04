# HAPIE - Hardware-Aware Performance Inference Engine

**Local-first AI inference platform with hardware-aware optimization**

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Setup Base Model

```bash
python setup.py
```

This will:
- Detect your hardware (CPU, RAM, GPU)
- Download the base model (Qwen2.5-1.5B-Instruct ~900MB)
- Configure execution policy based on your hardware

### 3. Start the Server

```bash
python -m hapie.main
```

Or using uvicorn:

```bash
uvicorn hapie.main:app --host 127.0.0.1 --port 8000
```

The API will be available at `http://localhost:8000`

## 📚 API Documentation

Once the server is running, visit:
- **Interactive API Docs**: http://localhost:8000/docs
- **Alternative Docs**: http://localhost:8000/redoc

## 🎯 Key Features

### Hardware Detection
- Automatic CPU, RAM, and GPU detection
- Dynamic execution policy based on available hardware
- Supports NVIDIA CUDA, AMD, Intel GPUs, and CPU-only

### Model Management
- Pull models from HuggingFace
- Register local GGUF models
- Add cloud API models (OpenAI, etc.)
- Switch between models dynamically

### Chat Modes
- **Single Model**: Chat with one model (default, minimal resources)
- **Comparison Mode**: Compare multiple models side-by-side

### Multimodal (Coming Soon)
- Image generation (Stable Diffusion)
- Text-to-Speech (TTS)
- Speech-to-Text (STT)

## 🔧 API Examples

### Get System Info
```bash
curl http://localhost:8000/api/system/info
```

### List Models
```bash
curl http://localhost:8000/api/models/
```

### Pull a Model from HuggingFace
```bash
curl -X POST http://localhost:8000/api/models/pull \
  -H "Content-Type: application/json" \
  -d '{
    "repo_id": "TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF",
    "filename": "tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf",
    "model_id": "tinyllama-1.1b",
    "name": "TinyLlama 1.1B Chat"
  }'
```

### Chat with Active Model
```bash
curl -X POST http://localhost:8000/api/chat/single \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Explain quantum computing in simple terms",
    "max_tokens": 200
  }'
```

### Compare Multiple Models
```bash
curl -X POST http://localhost:8000/api/chat/compare \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Write a haiku about AI",
    "model_ids": ["qwen2.5-1.5b-instruct", "tinyllama-1.1b"]
  }'
```

## 📁 Project Structure

```
happie/
├── backend/
│   ├── hapie/
│   │   ├── api/              # FastAPI routes
│   │   │   ├── system.py     # Hardware & policy endpoints
│   │   │   ├── models.py     # Model management
│   │   │   └── chat.py       # Chat & inference
│   │   ├── hardware/         # Hardware detection
│   │   ├── policy/           # Execution policy engine
│   │   ├── models/           # Model manager & inference
│   │   ├── db/               # Database (SQLite)
│   │   └── main.py           # FastAPI app
│   ├── requirements.txt
│   └── setup.py
└── README.md
```

## 🛠️ Development

### Database Location
SQLite database is stored at: `~/.hapie/hapie.db`

### Model Storage
Downloaded models are cached at: `~/.hapie/models/`

### Reset Everything
```bash
rm -rf ~/.hapie
python setup.py
```

## 🎯 Roadmap

- [x] Hardware detection layer
- [x] Policy engine
- [x] Model management (HuggingFace pulling)
- [x] Single-model chat
- [x] Multi-model comparison
- [ ] Frontend UI (Next.js)
- [ ] Image generation
- [ ] Audio generation (TTS/STT)
- [ ] Windows installer

## 📝 License

Apache 2.0

## 🤝 Contributing

This is a rapid development project. Contributions welcome!

---

**Built with**: FastAPI, llama.cpp, SQLAlchemy, HuggingFace Hub
