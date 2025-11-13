# AI Photo Editor Backend

FastAPI-based backend implementing agentic AI workflows for photo editing using layered architecture.

## Architecture Overview

```
┌─────────────────────────────────────┐
│     Orchestrator Layer              │
│  (Resources + Orchestration Logic)  │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│        Experts Layer                │
│  (Agents + LangChain Tools)         │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│         Core Layer                  │
│  (Services + Models)                │
└─────────────────────────────────────┘
```

## Features

- **Two AI Workflows**:
  - Object Inpainting (removal + background reconstruction)
  - Image Relighting (lighting adjustment)
  
- **Agentic Architecture**: Thought-Action-Observation pattern with LangChain integration
- **Layered Design**: Clean separation between API, orchestration, agents, and core services
- **Model Optimization**: Support for quantized models and lightweight LoRAs

## Project Structure

```
photo-editor-backend/
├── app/
│   ├── main.py                    # FastAPI app
│   ├── config.py                  # Configuration
│   ├── orchestrator/              # API + orchestration
│   │   ├── resources/             # API endpoints
│   │   └── orchestrator.py        # Workflow coordination
│   ├── core/                      # Business logic
│   │   ├── services/              # Internal/external services
│   │   └── models/                # Data models
│   └── experts/                   # AI agents
│       ├── agents/                # Agent implementations
│       └── tools/                 # LangChain tools
└── tests/
```

## Quick Start

### Prerequisites

- Python 3.10+
- 8GB+ RAM (for model inference)
- GPU (optional, for faster inference)

### Installation

```bash
# Clone repository
cd photo-editor-backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Configuration

Create `.env` file:

```env
# App Config
APP_NAME=AI Photo Editor
APP_VERSION=0.1.0
DEBUG=true

# Storage (optional)
CLOUD_STORAGE_BUCKET=your-bucket-name
CLOUD_STORAGE_ENDPOINT=https://storage-endpoint.com

# Model Config
MODEL_CACHE_DIR=./model_cache
USE_QUANTIZATION=true
```

### Run Server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API will be available at `http://localhost:8000`

- Interactive docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/api/v1/health`

## Development

### Running Tests

```bash
pytest tests/ -v
```

### Code Style

```bash
# Format code
black app/ tests/

# Lint
ruff check app/ tests/
```

## API Endpoints

See [USAGE.md](USAGE.md) for detailed API documentation and examples.

## Technical Stack

- **Framework**: FastAPI
- **AI Framework**: LangChain
- **Models**: SDXL, SAM, LoRA adapters
- **Storage**: Cloud storage (S3-compatible)
- **Validation**: Pydantic v2

