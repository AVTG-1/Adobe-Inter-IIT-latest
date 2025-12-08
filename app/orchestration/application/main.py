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
from fastapi import Request

from fastapi import HTTPException
import httpx
from typing import Dict, Any
import logging
import base64

from .config import get_settings
from app.orchestration.application.resources import health_router, edit_router

from app.orchestration.application.manager import ConnectionManager
from app.orchestration.application.engine import ExecutionEngine
from app.orchestration.application.state_store import StateStore
from app.orchestration.application.image_processor import ImageProcessor

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

os.makedirs("static", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

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
async def upload_image(request: Request, file: UploadFile = File(...)):
    # Ensure static directory exists
    os.makedirs("static", exist_ok=True)

    # Create safe filename with extension fallback
    file_id = str(uuid.uuid4())
    original = file.filename or ""
    if "." in original:
        extension = original.rsplit(".", 1)[-1]
    else:
        extension = "jpg"  # default
    filename = f"{file_id}.{extension}"
    file_path = os.path.join("static", filename)

    # Write file contents
    try:
        contents = await file.read()
        with open(file_path, "wb") as buffer:
            buffer.write(contents)
    except Exception as exc:
        # log and return error
        logging.exception("Failed to save uploaded file")
        raise HTTPException(status_code=500, detail="Failed to save uploaded file")

    # Build absolute URL using request.base_url
    base = str(request.base_url).rstrip("/")  # e.g. http://localhost:8000
    public_url = f"{base}/static/{filename}"

    return {"filename": filename, "url": public_url}

RELIGHT_SERVICE_URL = "http://localhost:5000/relight"


@app.post("/api/v1/relight")

async def relight_image(request: Dict[str, Any]):
    # async def _download_image_bytes(image_url: str) -> bytes:
    #     """Download image from remote URL (GCS, HTTP, etc.) and return bytes.
        
    #     Args:
    #         image_url: URL to download from (gs://, https://, http://, or file://)
            
    #     Returns:
    #         Image data as bytes
            
    #     Raises:
    #         ValueError: If URL format is unsupported
    #         httpx.HTTPError: If HTTP request fails
    #         FileNotFoundError: If local file not found
    #     """
    #     # Handle local file paths
    #     if image_url.startswith("file://"):
    #         file_path = image_url.replace("file://", "")
    #         if not os.path.exists(file_path):
    #             raise FileNotFoundError(f"Local file not found: {file_path}")
    #         async with aiofiles.open(file_path, "rb") as f:
    #             return await f.read()
        
    #     # Handle local filesystem paths (no protocol)
    #     if not image_url.startswith(("http://", "https://", "gs://")):
    #         # Treat as local path
    #         local_path = image_url.lstrip("/")
    #         if not os.path.exists(local_path):
    #             raise FileNotFoundError(f"Local file not found: {local_path}")
    #         async with aiofiles.open(local_path, "rb") as f:
    #             return await f.read()
        
    #     # Handle GCS URLs (gs:// and https://storage.googleapis.com)
    #     if image_url.startswith("gs://") or "storage.googleapis.com" in image_url:
    #         # Use StorageService to download from GCS
    #         try:
    #             return await self.storage.get_image(image_url)
    #         except Exception as e:
    #             print(f"Failed to download from GCS: {e}")
    #             raise
        
    #     # Handle HTTP(S) URLs
    #     if image_url.startswith(("http://", "https://")):
    #         async with httpx.AsyncClient(timeout=30.0) as client:
    #             response = await client.get(image_url)
    #             response.raise_for_status()
    #             return response.content
        
    #     raise ValueError(f"Unsupported URL format: {image_url}")
    # """
    # Forward relighting request to the relighting service at localhost:5000
    # """

    # image_url = request.get("image_url")
    # # convert cloud image_url to base64 
    # image_bytes = await _download_image_bytes(image_url)
    # image = base64.b64encode(image_bytes).decode("utf-8")

    # light_pos = list([request.get("x"), request.get("y"), request.get("z_depth")])
    # steps = request.get("steps")
    # prompt = request.get("prompt")
    # payload = {
    #             "image_base64": image,
    #             "light_pos": light_pos,
    #             "steps": steps,
    #             "prompt": prompt
    #         }
    # try:
    #     async with httpx.AsyncClient() as client:
    #         # Forward the request to the relighting service
    #         response = await client.post(
    #             RELIGHT_SERVICE_URL,
    #             json=payload,
    #             timeout=90.0  # 90 seconds timeout
    #         )
    #         response.raise_for_status()  # Raise exception for 4XX/5XX responses
    #         print(f"Relighting response: {response.json()}")
    #         return response.json()
            
    # except httpx.HTTPStatusError as e:
    #     raise HTTPException(
    #         status_code=e.response.status_code,
    #         detail=f"Relighting service error: {e.response.text}"
    #     )
    # except httpx.RequestError as e:
    #     raise HTTPException(
    #         status_code=503,
    #         detail="Relighting service is currently unavailable"
    #     )
    # except Exception as e:
    #     raise HTTPException(
    #         status_code=500,
    #         detail=f"Internal server error: {str(e)}"
    #     )
    processor = ImageProcessor()
    params = {"light_pos": [request.get("x"), request.get("y"), request.get("z_depth")], "steps": request.get("steps"), "prompt": request.get("prompt")}
    result = await processor.process_step(request.get("image_url"), "relighting", params)
    return {"message": "Processing complete", "result_url": result}

@app.post("/api/v1/reposition")
async def reposition_image(request: Dict[str, Any]):
    processor = ImageProcessor()
    params = {"json_path": request.get("json_path")}
    result = await processor.process_step(request.get("image_url"), "repositioning", params)
    return {"message": "Processing complete", "result_url": result}
