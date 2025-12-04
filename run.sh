#!/bin/bash
# Quick start script for AI Photo Editor Backend
echo "🚀 Starting AI Photo Editor Backend..."
# Check if .env exists, if not copy from .env.example
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
fi
# Create necessary directories
mkdir -p storage model_cache logs
# Start the server
echo "🌐 Starting FastAPI server on http://localhost:8000"
echo "📚 API docs available at http://localhost:8000/docs"
echo ""
uvicorn app.orchestration.application.main:app --reload --host 0.0.0.0 --port 8000