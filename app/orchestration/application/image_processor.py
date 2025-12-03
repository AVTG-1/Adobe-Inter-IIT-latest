from PIL import Image, ImageEnhance, ImageOps
import os
import uuid
import asyncio
import httpx

class ImageProcessor:
    def __init__(self, static_dir="static"):
        self.static_dir = static_dir
        os.makedirs(self.static_dir, exist_ok=True)

    def _save_image(self, image: Image.Image) -> str:
        filename = f"{uuid.uuid4()}.png"
        path = os.path.join(self.static_dir, filename)
        image.save(path)
        return f"/static/{filename}"

    async def process_step(self, input_image_path: str, tool: str, params: dict) -> str:
        """
        Executes a tool on an image and returns the path to the result.
        input_image_path: relative path like '/static/abc.png' or 'static/abc.png'
        """
        loop = asyncio.get_running_loop()
        # Run the blocking image processing in a separate thread
        return await loop.run_in_executor(None, self._process_step_sync, input_image_path, tool, params)

    def _process_step_sync(self, input_image_path: str, tool: str, params: dict) -> str:
        # Fix path to be absolute or relative to cwd
        real_input_path = input_image_path.lstrip("/") # remove leading /
        
        try:
            with Image.open(real_input_path) as img:
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
                        # Mock rain: draw some lines? Or just darken for now
                        enhancer = ImageEnhance.Brightness(img)
                        img = enhancer.enhance(0.8)
                
                elif tool == "relighting":
                    # Call external relighting API which returns a result image URL.
                    relight_api = os.getenv("RELIGHT_API_URL", "http://localhost:5000/relight")
                    image_base = os.getenv("IMAGE_BASE_URL", "http://localhost:8000")
    
                    public_input_url = f"{image_base}/{real_input_path}"
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
                            from io import BytesIO
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
                        img = Image.open(real_input_path).convert("RGB")
    
                return self._save_image(img)
                
        except Exception as e:
            print(f"Error processing image: {e}")
            return input_image_path # Return original on failure
