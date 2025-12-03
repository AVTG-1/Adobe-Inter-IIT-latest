"""FastAPI application entry point."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import shutil
import uuid
import json
from typing import List

from .config import get_settings
from app.orchestration.application.resources import health_router, edit_router

from app.orchestration.application.manager import ConnectionManager
from app.orchestration.application.engine import ExecutionEngine
from app.orchestration.application.state_store import StateStore

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    settings = get_settings()
    logger = logging.getLogger(__name__)
    logger.info(f"Starting {settings.app_name} v{settings.app_version}")
    logger.info(f"Debug mode: {settings.debug}")
    
    # Initialize storage service to log which storage is being used
    from app.core.services.app.storage_service import StorageService
    storage = StorageService()
    if storage.is_gcs_enabled():
        logger.info("✅ Storage initialized: Google Cloud Storage (GCS)")
    else:
        logger.info("✅ Storage initialized: Local filesystem")
    
    yield
    
    # Shutdown
    logger.info("Shutting down...")


# Initialize FastAPI app
settings = get_settings()
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="AI-powered photo editing backend with agentic workflows",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(health_router, prefix=settings.api_v1_prefix)
app.include_router(edit_router, prefix=settings.api_v1_prefix)

# Global instances
manager = ConnectionManager()
state_store = StateStore()
engine = ExecutionEngine(manager, state_store)

@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "docs": "/docs",
        "health": f"{settings.api_v1_prefix}/health",
    }

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket, client_id)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            await handle_websocket_message(client_id, message)
    except WebSocketDisconnect:
        manager.disconnect(client_id)
    except Exception as e:
        print(f"Error in websocket: {e}")
        # manager.disconnect(client_id) # Optional: disconnect on error

async def handle_websocket_message(client_id: str, message: dict):
    action = message.get("action")
    
    try:
        if action == "start_processing":
            session_id = message.get("session_id")
            prompt = message.get("prompt")
            image_path = message.get("image_path") # Relative path in static/
            reference_image_path = message.get("reference_image_path") # Optional
            if session_id and prompt and image_path:
                await engine.start_processing(session_id, prompt, image_path, reference_image_path)
                
        elif action == "continue_processing":
            session_id = message.get("session_id")
            parent_node_id = message.get("parent_node_id")
            prompt = message.get("prompt")
            reference_image_path = message.get("reference_image_path") # Optional
            if session_id and parent_node_id and prompt:
                await engine.continue_processing(session_id, parent_node_id, prompt, reference_image_path)
                
        elif action == "stop_processing":
            session_id = message.get("session_id")
            if session_id:
                await engine.stop_processing(session_id)
                
        elif action == "update_step":
            # Renamed to refine/update logic
            session_id = message.get("session_id")
            step_index = message.get("step_index")
            new_params = message.get("params")
            if session_id and step_index is not None:
                await engine.update_step_and_ripple(session_id, step_index, new_params)
        
        elif action == "refine_step":
            session_id = message.get("session_id")
            node_id = message.get("node_id")
            prompt = message.get("prompt")
            global_goal = message.get("global_goal", "")
            mode = message.get("mode", "branch")
            reference_image_path = message.get("reference_image_path") # Optional
            if session_id and node_id and prompt:
                await engine.refine_step(session_id, node_id, prompt, global_goal, mode, reference_image_path)
                
        elif action == "switch_node":
            session_id = message.get("session_id")
            node_id = message.get("node_id")
            if session_id and node_id:
                await engine.switch_to_node(session_id, node_id)

        elif action == "rename_node":
            session_id = message.get("session_id")
            node_id = message.get("node_id")
            new_name = message.get("new_name")
            if session_id and node_id and new_name:
                await engine.rename_node(session_id, node_id, new_name)

        elif action == "save_macro":
            session_id = message.get("session_id")
            name = message.get("name")
            node_id = message.get("node_id")
            if session_id and name and node_id:
                await engine.save_macro(session_id, name, node_id)

        elif action == "apply_macro":
            session_id = message.get("session_id")
            name = message.get("name")
            target_node_id = message.get("target_node_id")
            if session_id and name and target_node_id:
                await engine.apply_macro(session_id, name, target_node_id)

        elif action == "get_macros":
            session_id = message.get("session_id")
            if session_id:
                await engine.send_macro_list(session_id)
    except Exception as e:
        print(f"Error handling message: {e}")
        session_id = message.get("session_id")
        if session_id:
            await manager.send_personal_message({
                "event": "error",
                "message": str(e)
            }, session_id)

@app.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    file_id = str(uuid.uuid4())
    extension = file.filename.split(".")[-1]
    filename = f"{file_id}.{extension}"
    file_path = os.path.join("static", filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return {"filename": filename, "url": f"/static/{filename}"}
