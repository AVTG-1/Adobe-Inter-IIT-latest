import base64
from io import BytesIO
from typing import Optional, Tuple, List, Dict, Any
from PIL import Image
import numpy as np
import httpx
import json

class RepositioningClient:
    """
    Mock client for the repositioning feature.
    Handles communication with the repositioning service.
    """
    
    def __init__(self, base_url: str = "http://localhost:5001"):
        """
        Initialize the repositioning client.
        
        Args:
            base_url: Base URL of the repositioning service
        """
        self.base_url = base_url.rstrip('/')
        self.timeout = 60.0  # seconds
    
    async def reposition(
        self,
        image: Image.Image,
        json_path: str
    ) -> Image.Image:
        """
        Reposition objects in an image based on source and target points.
        
        Args:
            image: Input PIL image
            source_points: List of (x,y) source points
            target_points: List of (x,y) target points
            interpolation: Interpolation method ('nearest', 'bilinear', 'bicubic')
            blend: Whether to blend the warped image with the original
            
        Returns:
            Repositioned PIL image
        """
        print("repositioning client called")
        def pil_to_base64(img: Image.Image) -> str:
            buffer = BytesIO()
            img.save(buffer, format="PNG")
            return base64.b64encode(buffer.getvalue()).decode("utf-8")
        
        # Convert image to RGB if needed
        if image.mode != "RGB":
            image = image.convert("RGB")

        try:
            # Prepare the request payload
            payload = {
                "image": pil_to_base64(image),
                "json_path": json_path
            }
            
            # Make the API request
            print("Making API request with params: ", payload)
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/reposition",
                    json=payload
                )
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
            raise RuntimeError(f"Repositioning failed: {e}")
#     async def batch_reposition(
#         self,
#         images: List[Image.Image],
#         source_points_list: List[List[Tuple[float, float]]],
#         target_points_list: List[List[Tuple[float, float]]],
#         **kwargs
#     ) -> List[Image.Image]:
#         """
#         Process multiple images with their respective repositioning points.
        
#         Args:
#             images: List of input PIL images
#             source_points_list: List of source points for each image
#             target_points_list: List of target points for each image
#             **kwargs: Additional arguments to pass to reposition()
            
#         Returns:
#             List of repositioned PIL images
#         """
#         if len(images) != len(source_points_list) or len(images) != len(target_points_list):
#             raise ValueError("Number of images must match number of point sets")
            
#         return [
#             await self.reposition(img, src_pts, tgt_pts, **kwargs)
#             for img, src_pts, tgt_pts in zip(images, source_points_list, target_points_list)
#         ]

# # Example usage:
# async def example_usage():
#     # Initialize client
#     client = RepositioningClient()
    
#     # Load an image
#     image = Image.open("example.jpg")
    
#     # Define source and target points (example: moving an object up and to the right)
#     source_points = [(100, 100), (200, 100), (200, 200), (100, 200)]  # Original square
#     target_points = [(150, 50), (250, 50), (250, 150), (150, 150)]    # Moved up and right
    
#     try:
#         # Perform repositioning
#         result = await client.reposition(
#             image=image,
#             source_points=source_points,
#             target_points=target_points,
#             interpolation="bilinear",
#             blend=True
#         )
        
#         # Save or display the result
#         result.save("repositioned.jpg")
#         return result
        
#     except Exception as e:
#         print(f"Error: {e}")

# # To run the example:
# # import asyncio
# # asyncio.run(example_usage())