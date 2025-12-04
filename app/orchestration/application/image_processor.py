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
from app.core.services.third_party.relighting.client import RelightingClient


from app.core.services.app.storage_service import StorageService

class ImageProcessor:
    def __init__(self, static_dir="static", storage: Optional[StorageService] = None):
        self.static_dir = static_dir
        os.makedirs(self.static_dir, exist_ok=True)
        # Use provided StorageService or create one (GCS with local fallback)
        self.storage = storage or StorageService()
        # Initialize relighting client
        self._relighting_client = None

    @property
    def relighting_client(self) -> RelightingClient:
        if self._relighting_client is None:
            try:
                self._relighting_client = RelightingClient()
            except FileNotFoundError as e:
                print(f"Warning: Relighting model not found: {e}")
                return None
        return self._relighting_client

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
            # if tool is relighting, call async relighting client
            if tool == "relighting":
                result_bytes = await self._process_image_bytes_async(image_bytes, tool, params, input_image_path)
            else:
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
            url = await self.storage.save_image(
                result_bytes,
                filename=filename,
                content_type="image/jpeg",
                make_public=True
            )

            # If storage returned the same URL as the input (unexpected),
            # force a unique filename upload as a fallback to ensure a new object is created.
            if url == input_image_path or not url:
                fallback_filename = f"processed_{uuid.uuid4()}.jpg"
                url2 = await self.storage.save_image(
                    result_bytes,
                    filename=fallback_filename,
                    content_type="image/jpeg",
                    make_public=True
                )
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
                amount = int(params.get("amount", 100)) / 100.0  # Convert to 0.0-1.0 range
                w, h = img.size
                
                if otype == "rain":
                    # Create a semi-transparent overlay for rain
                    overlay = Image.new('RGBA', (w, h), (0, 0, 0, 0))
                    draw = ImageDraw.Draw(overlay)
                    
                    # Draw rain drops (simplified)
                    for _ in range(int(200 * amount)):  # Number of raindrops based on amount
                        x = random.randint(0, w)
                        y = random.randint(0, h)
                        length = random.randint(10, 30)
                        alpha = int(200 * amount)
                        draw.line([(x, y), (x + length*0.2, y + length)], 
                                 fill=(200, 220, 255, alpha), 
                                 width=2)
                    
                    # Add a blue tint
                    tint = Image.new('RGBA', (w, h), (100, 150, 255, 10))
                    overlay = Image.alpha_composite(overlay, tint)
                    
                    # Apply overlay to original image
                    img = img.convert('RGBA')
                    img = Image.alpha_composite(img, overlay)
                    img = img.convert('RGB')
                    
                elif otype == "sun":
                    overlay = Image.new("RGBA", img.size, (255, 200, 120, 40))  # soft golden tint (alpha=40)
                    img = img.convert("RGBA")
                    img = Image.alpha_composite(img, overlay).convert("RGB")

                elif otype == "snow":
                    # Enhanced snow effect with perfectly white, crisp flakes
                    overlay = Image.new('RGBA', (w, h), (0, 0, 0, 0))
                    draw = ImageDraw.Draw(overlay)
                    
                    # Draw snowflakes with perfect white color
                    for _ in range(int(300 * amount)):  # More flakes for better coverage
                        x = random.randint(-w//4, w + w//4)
                        y = random.randint(-h//4, h + h//4)
                        size = random.randint(1, 4)  # More natural size variation
                        alpha = random.randint(200, 255)  # More opaque for better visibility
                        snow_color = (255, 255, 255, alpha)  # Pure white
                        
                        # Draw the snowflake
                        draw.ellipse([x, y, x+size, y+size], fill=snow_color)
                        
                        # Add a subtle glow for better visibility
                        if size > 2:
                            glow_alpha = min(alpha + 30, 255)
                            glow_color = (255, 255, 255, glow_alpha)
                            draw.ellipse([x-1, y-1, x+size+1, y+size+1], fill=glow_color)
                    
                    # Apply a very slight blur for natural look
                    overlay = overlay.filter(ImageFilter.GaussianBlur(0.8))
                    
                    # Apply overlay to image
                    img = img.convert('RGBA')
                    result = Image.alpha_composite(img, overlay)
                    
                    # Add a very subtle blue tint (reduced from before)
                    tint = Image.new('RGBA', (w, h), (230, 240, 255, 8))
                    result = Image.alpha_composite(result, tint)
                    
                    # Convert back to RGB for saving
                    img = result.convert('RGB')
                    
            # Save processed image to BytesIO as JPEG and return as bytes
            output = BytesIO()
            # JPEG requires RGB (no alpha); image already converted to RGB above
            img.save(output, format="JPEG", quality=90, optimize=True)
            return output.getvalue()
                
        except Exception as e:
            print(f"Error processing image bytes: {e}")
            raise
    async def _process_image_bytes_async(self, image_bytes: bytes, tool: str, params: dict, input_image_path: str) -> bytes:
        if self.relighting_client is None:
            raise RuntimeError("Relighting model not available")

        img = Image.open(BytesIO(image_bytes))
        img = img.convert("RGB")

        # Call relighting model directly
        output_path = await self.relighting_client.relight(
            img,
            light_pos=(
                float(params.get("light_x", 0.0)),
                float(params.get("light_y", 100.0)),
                float(params.get("light_z", 1.0))
            ),
            steps=int(params.get("steps", 25)),
            prompt=params.get("prompt", "a scene")
        )

        # Read output image
        with open(output_path, "rb") as f:
            result_bytes = f.read()
            return result_bytes