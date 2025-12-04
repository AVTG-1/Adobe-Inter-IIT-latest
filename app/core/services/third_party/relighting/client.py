import base64
from io import BytesIO
from typing import Optional, Tuple
from PIL import Image
import numpy as np
import httpx
import os



class RelightingClient:
    """
    Direct Python wrapper for the spatial-light-realign relighting model.
    No subprocess required; works in-memory with PIL.Image or numpy arrays.
    """
    async def relight(
        self,
        image: Image.Image,
        light_pos: Tuple[float, float, float] = (0.0, 100.0, 1.0),
        steps: int = 25,
        prompt: str = "a scene"
    ) -> Image.Image:
        """
        Perform relighting on a PIL.Image.

        Args:
            image: PIL.Image input
            light_pos: (x, y, z) coordinates of light
            steps: inference steps
            prompt: text prompt

        Returns:
            PIL.Image of relighted scene
        """
        def pil_to_base64(image: Image.Image) -> str:
            buffer = BytesIO()
            image.save(buffer, format="PNG")     # Save as real PNG file bytes
            return base64.b64encode(buffer.getvalue()).decode("utf-8")
        
        # Convert image to RGB if needed
        if image.mode != "RGB":
            image = image.convert("RGB")

        try:
            b64 = pil_to_base64(image)
            print("base64 from client: ", b64[0:30])
            payload = {
                "image_base64": b64,
                "light_pos": list(light_pos),
                "steps": steps,
                "prompt": prompt
            }
            async with httpx.AsyncClient(timeout=90.0) as client:
                response = await client.post("http://localhost:5000/relight", json=payload)
                response.raise_for_status()
            data = response.json()
            print(data)
            print("output path from model: ", data["output_path"])
            output_path = data["output_path"]
            print("Looking for output at:", output_path)
            script_dir = os.path.dirname(os.path.abspath(__file__))
            if not os.path.exists(output_path):
                # Try to find the file in subdirectories
                for root, _, files in os.walk(script_dir):
                    if os.path.basename(output_path) in files:
                        output_path = os.path.join(root, os.path.basename(output_path))
                        break
                else:
                    raise FileNotFoundError(f"Could not find output file: {output_path}")
            print("final output Path: ", output_path)         
            return output_path
        except Exception as e:
            raise RuntimeError(f"Relighting failed: {e}")

        # output_image should be PIL.Image or numpy array; convert to PIL if needed
        if isinstance(output_image, np.ndarray):
            output_image = Image.fromarray((output_image * 255).astype(np.uint8))

        return output_image
