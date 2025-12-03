from PIL import Image, ImageEnhance, ImageOps
import os
import uuid
import asyncio
import aiofiles
import httpx
import io
from typing import Optional
from io import BytesIO
import random
from PIL import ImageFilter, ImageDraw

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
                params, 
                input_image_path
            )
            
            # Upload processed image to storage (GCS or local)
            # Use StorageService filename generator for consistent naming
            try:
                filename = self.storage._generate_filename(extension="jpg")
            except Exception:
                # Fallback if generator is unavailable
                filename = f"processed_{uuid.uuid4()}.jpg"

            # Attempt primary upload
            print(f"[ImageProcessor] Uploading processed image. input={input_image_path} filename={filename}")
            url = await self.storage.save_image(
                result_bytes,
                filename=filename,
                content_type="image/jpeg",
                make_public=True
            )
            print(f"[ImageProcessor] Storage returned url={url}")

            # If storage returned the same URL as the input (unexpected),
            # force a unique filename upload as a fallback to ensure a new object is created.
            if url == input_image_path or not url:
                fallback_filename = f"processed_{uuid.uuid4()}.jpg"
                print(f"[ImageProcessor] Detected storage returned input URL or empty. Retrying with fallback filename={fallback_filename}")
                url2 = await self.storage.save_image(
                    result_bytes,
                    filename=fallback_filename,
                    content_type="image/jpeg",
                    make_public=True
                )
                print(f"[ImageProcessor] Fallback storage returned url={url2}")
                if url2 and url2 != input_image_path:
                    return url2
                # If still same, fail fast so caller can diagnose
                raise RuntimeError(f"Storage save returned same URL as input after retry: {url2!r}")
            return url
            
        except Exception as e:
            print(f"Error in process_step: {e}")
            # Return original URL as fallback
            return input_image_path

    def _process_image_bytes_sync(self, image_bytes: bytes, tool: str, params: dict, input_image_path: str) -> bytes:
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
                # Create an RGBA overlay and composite for visible effects
                amount = int(params.get("amount", 100))
                base = img.convert("RGBA")
                overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
                draw = ImageDraw.Draw(overlay)

                if otype == "rain":
                    # Draw semi-transparent rain streaks
                    w, h = base.size
                    streaks = max(30, int(amount))
                    for i in range(streaks):
                        x = random.randint(-w // 4, int(w * 1.25))
                        y = random.randint(-h // 4, int(h * 1.25))
                        length = random.randint(int(h * 0.08), int(h * 0.25))
                        x2 = x + int(length * 0.12)
                        y2 = y + length
                        alpha = random.randint(90, 160)
                        draw.line((x, y, x2, y2), fill=(200, 220, 255, alpha), width=2)
                    # Slightly darken the base under rain
                    dark = Image.new("RGBA", base.size, (0, 0, 0, 50))
                    overlay = Image.alpha_composite(overlay, dark)

                elif otype == "sun":
                    # Add a warm radial glow (sun flare)
                    w, h = base.size
                    # center can be provided or default to top-right
                    cx = int(params.get("x", int(w * 0.8)))
                    cy = int(params.get("y", int(h * 0.2)))
                    max_radius = int(min(w, h) * 0.5)
                    intensity = float(params.get("intensity", 0.6))
                    steps = 12
                    for i in range(steps, 0, -1):
                        radius = int(max_radius * (i / steps) * intensity)
                        alpha = int(200 * (i / steps) * intensity)
                        color = (255, 200, 120, alpha)
                        bbox = [cx - radius, cy - radius, cx + radius, cy + radius]
                        draw.ellipse(bbox, fill=color)
                    # add subtle lens flare highlight
                    flare = Image.new("RGBA", base.size, (0, 0, 0, 0))
                    fdraw = ImageDraw.Draw(flare)
                    fdraw.ellipse([cx - 8, cy - 8, cx + 8, cy + 8], fill=(255, 255, 220, 220))
                    overlay = Image.alpha_composite(overlay, flare)

                elif otype == "snow":
                    # Paint falling snow (white dots) with subtle blur
                    w, h = base.size
                    flakes = max(50, int(amount))
                    for i in range(flakes):
                        x = random.randint(0, w)
                        y = random.randint(0, h)
                        size = random.randint(1, max(2, int(min(w, h) * 0.01)))
                        alpha = random.randint(150, 240)
                        draw.ellipse((x, y, x + size, y + size), fill=(255, 255, 255, alpha))
                    # blur overlay to soften snow
                    overlay = overlay.filter(ImageFilter.GaussianBlur(radius=1))

                else:
                    # Unknown overlay: no-op
                    overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
            elif tool == "relighting":
                # Call external relighting API which returns a result image URL.
                relight_api = os.getenv("RELIGHT_API_URL", "http://localhost:5000/relight")
                image_base = os.getenv("IMAGE_BASE_URL", "http://localhost:8000")

                public_input_url = input_image_path
                payload = {
                    "image_url": public_input_url,
                    "x": float(params.get("x", 0.0)),
                    "y": float(params.get("y", -100.0)),
                    "z": float(params.get("z", 100.0))
                }
                try:
                    resp = httpx.post(relight_api, json=payload, timeout=60.0)
                    resp.raise_for_status()
                    data = resp.json()
                    result_url = data.get("result_url")
                    if not result_url:
                        raise RuntimeError("No result_url in relight response")

                    # Download result image into memory and load as PIL Image
                    if result_url.startswith("http://") or result_url.startswith("https://"):
                        r2 = httpx.get(result_url, timeout=30.0)
                        r2.raise_for_status()
                        img = Image.open(BytesIO(r2.content)).convert("RGB")
                    else:
                        # If service returned a server-relative path, load from disk
                        local_path = result_url.lstrip("/")
                        img = Image.open(local_path).convert("RGB")
                except Exception as e:
                    print(f"Relighting service error: {e}")
                    # fall back to returning input on failure (existing behavior)
                    img = Image.open(input_image_path).convert("RGB")
            # Save processed image to BytesIO as JPEG and return as bytes
            output = BytesIO()
            # JPEG requires RGB (no alpha); image already converted to RGB above
            img.save(output, format="JPEG", quality=90, optimize=True)
            return output.getvalue()
                
        except Exception as e:
            print(f"Error processing image bytes: {e}")
            raise
