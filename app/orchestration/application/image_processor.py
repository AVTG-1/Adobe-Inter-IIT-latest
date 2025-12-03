from PIL import Image, ImageEnhance, ImageOps
import os
import uuid
import asyncio
import aiofiles
import httpx
import io
from typing import Optional
from io import BytesIO

from app.core.services.app.storage_service import StorageService

class ImageProcessor:
    def __init__(self, static_dir="static", storage: Optional[StorageService] = None):
        self.static_dir = static_dir
        os.makedirs(self.static_dir, exist_ok=True)
        # Use provided StorageService or create one (GCS with local fallback)
        self.storage = storage or StorageService()

    def _save_image(self, image: Image.Image) -> str:
        """Save image to local disk and return filesystem path."""
        filename = f"{uuid.uuid4()}.png"
        path = os.path.join(self.static_dir, filename)
        image.save(path)
        # Return filesystem path (relative to project root)
        return path

    async def _download_image_bytes(self, image_url: str) -> bytes:
        """Download image from remote URL (GCS, HTTP, etc.) and return bytes.
        
        Args:
            image_url: URL to download from (gs://, https://, http://, or file://)
            
        Returns:
            Image data as bytes
            
        Raises:
            ValueError: If URL format is unsupported
            httpx.HTTPError: If HTTP request fails
            FileNotFoundError: If local file not found
        """
        # Handle local file paths
        if image_url.startswith("file://"):
            file_path = image_url.replace("file://", "")
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"Local file not found: {file_path}")
            async with aiofiles.open(file_path, "rb") as f:
                return await f.read()
        
        # Handle local filesystem paths (no protocol)
        if not image_url.startswith(("http://", "https://", "gs://")):
            # Treat as local path
            local_path = image_url.lstrip("/")
            if not os.path.exists(local_path):
                raise FileNotFoundError(f"Local file not found: {local_path}")
            async with aiofiles.open(local_path, "rb") as f:
                return await f.read()
        
        # Handle GCS URLs (gs:// and https://storage.googleapis.com)
        if image_url.startswith("gs://") or "storage.googleapis.com" in image_url:
            # Use StorageService to download from GCS
            try:
                return await self.storage.get_image(image_url)
            except Exception as e:
                print(f"Failed to download from GCS: {e}")
                raise
        
        # Handle HTTP(S) URLs
        if image_url.startswith(("http://", "https://")):
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(image_url)
                response.raise_for_status()
                return response.content
        
        raise ValueError(f"Unsupported URL format: {image_url}")
    

    async def process_step(self, input_image_path: str, tool: str, params: dict) -> str:
        """
        Executes a tool on an image and returns the path to the result.
        input_image_path: can be local path, gs://, https://, or http:// URL
        """
        try:
            # Download image bytes (handles all URL types and local paths)
            image_bytes = await self._download_image_bytes(input_image_path)
            
            loop = asyncio.get_running_loop()
            # Run blocking image processing in separate thread
            result_bytes = await loop.run_in_executor(
                None, 
                self._process_image_bytes_sync, 
                image_bytes, 
                tool, 
                params
            )
            
            # Upload processed image to storage (GCS or local)
            # Use StorageService filename generator for consistent naming
            try:
                filename = self.storage._generate_filename(extension="jpg")
            except Exception:
                # Fallback if generator is unavailable
                filename = f"processed_{uuid.uuid4()}.jpg"

            url = await self.storage.save_image(
                result_bytes,
                filename=filename,
                content_type="image/jpeg",
                make_public=True
            )
            return url
            
        except Exception as e:
            print(f"Error in process_step: {e}")
            # Return original URL as fallback
            return input_image_path

    def _process_image_bytes_sync(self, image_bytes: bytes, tool: str, params: dict) -> bytes:
        """Process image bytes and return processed bytes (synchronous, runs in executor).
        
        Args:
            image_bytes: Raw image data
            tool: Processing tool name
            params: Tool parameters
            
        Returns:
            Processed image data as bytes (PNG format)
        """
        try:
            # Open image from bytes
            img = Image.open(BytesIO(image_bytes))
            img = img.convert("RGB")
            
            if tool == "crop":
                x = int(params.get("x", 0))
                y = int(params.get("y", 0))
                w = int(params.get("w", img.width))
                h = int(params.get("h", img.height))
                # Ensure bounds
                img = img.crop((x, y, x+w, y+h))
                
            elif tool == "rotate":
                angle = float(params.get("angle", 0))
                img = img.rotate(-angle, expand=True)
                
            elif tool == "brightness":
                factor = float(params.get("factor", 1.0))
                enhancer = ImageEnhance.Brightness(img)
                img = enhancer.enhance(factor)
                
            elif tool == "contrast":
                factor = float(params.get("factor", 1.0))
                enhancer = ImageEnhance.Contrast(img)
                img = enhancer.enhance(factor)
                
            elif tool == "saturation":
                factor = float(params.get("factor", 1.0))
                enhancer = ImageEnhance.Color(img)
                img = enhancer.enhance(factor)
                
            elif tool == "sharpness":
                factor = float(params.get("factor", 1.0))
                enhancer = ImageEnhance.Sharpness(img)
                img = enhancer.enhance(factor)

            elif tool == "resize":
                w = int(params.get("w", img.width))
                h = int(params.get("h", img.height))
                img = img.resize((w, h), Image.Resampling.LANCZOS)

            elif tool == "filter":
                ftype = params.get("type", "contrast")
                if ftype == "sepia":
                    img = ImageOps.colorize(ImageOps.grayscale(img), "#704214", "#C0C0C0")
                elif ftype == "grayscale":
                    img = ImageOps.grayscale(img).convert("RGB")
                elif ftype == "cyberpunk":
                    # Simple mock cyberpunk: high contrast + purple tint
                    enhancer = ImageEnhance.Contrast(img)
                    img = enhancer.enhance(1.5)
                    r, g, b = img.split()
                    b = b.point(lambda i: i * 1.2)
                    img = Image.merge("RGB", (r, g, b))
                elif ftype == "contrast":
                    enhancer = ImageEnhance.Contrast(img)
                    img = enhancer.enhance(1.2)
                    
            elif tool == "overlay":
                otype = params.get("type")
                if otype == "rain":
                    # Mock rain: darken the image
                    enhancer = ImageEnhance.Brightness(img)
                    img = enhancer.enhance(0.8)
            
            # Save processed image to BytesIO as JPEG and return as bytes
            output = BytesIO()
            # JPEG requires RGB (no alpha); image already converted to RGB above
            img.save(output, format="JPEG", quality=90, optimize=True)
            return output.getvalue()
            
        except Exception as e:
            print(f"Error processing image bytes: {e}")
            raise
