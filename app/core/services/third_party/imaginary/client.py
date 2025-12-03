import base64
import httpx
from typing import List, Optional

from app.core.services.third_party.imaginary.operations import EditOperation
from app.core.services.third_party.imaginary.mapper import ImaginaryOperationMapper
from app.core.services.third_party.imaginary.exceptions import ImaginaryAPIError


class ImaginaryClient:
    """Client for Imaginary open-source image processing API.
    
    Imaginary is a fast, Docker-ready HTTP microservice for image processing.
    This client applies operations sequentially to images via HTTP requests.
    """
    
    def __init__(self, base_url: str, timeout: int = 30, storage_service: Optional[object] = None):
        """Initialize Imaginary client.
        
        Args:
            base_url: Base URL of Imaginary service (e.g., "http://localhost:8080")
            timeout: Request timeout in seconds
            storage_service: Optional storage service for saving intermediate results
                            (avoids long data URLs when chaining operations)
        """
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.storage_service = storage_service

    async def apply(self, image_url: str, operations: List[EditOperation]) -> bytes:
        print(f"Starting ImaginaryClient.apply with image_url: {image_url} and {len(operations)} operations")
        """Apply operations sequentially to the image and return final bytes.
        
        Args:
            image_url: URL of the source image (must be HTTP/HTTPS accessible by Imaginary)
            operations: List of edit operations to apply sequentially
            
        Returns:
            Final processed image as bytes
            
        Raises:
            ImaginaryAPIError: If any operation fails
            ValueError: If image_url is not accessible (e.g., file:// URLs)
        """
        # Validate that image URL is accessible by Imaginary
        if image_url.startswith("file://"):
            raise ValueError(
                "Imaginary API cannot access file:// URLs. "
                "Image must be accessible via HTTP/HTTPS or use data URL for in-memory images."
            )
        
        current_image_url = image_url
        current_image_bytes = None

        async with httpx.AsyncClient(timeout=httpx.Timeout(self.timeout)) as client:
            for i, op in enumerate(operations):
                print("check 1")
                print(op)
                endpoint = ImaginaryOperationMapper.map_operation(op, current_image_url)
                print("check 2")
                full_url = self.base_url + endpoint

                # Debug: show full_url summary and length to catch huge data-URL cases
                print(f"Full URL length: {len(full_url)}")
                if len(full_url) > 2000:
                    # Very likely a data URL or too-long query string; avoid sending it.
                    raise ImaginaryAPIError(
                        f"Generated URL is too long ({len(full_url)} chars). "
                        "This likely indicates a data URL was embedded into the query string. "
                        "Enable cloud storage for intermediate images or use flattened URLs."
                    )

                # Print truncated URL for debugging (avoid logging entire base64 blobs)
                print(f"Applying operation {op.type} (step {i+1}/{len(operations)}): {full_url[:100]}{'...' if len(full_url) > 100 else ''}")

                try:
                    print("trying")
                    resp = await client.get(full_url)
                    print("client get")
                    resp.raise_for_status()
                    print("response received")
                except Exception as e:
                    import traceback
                    tb = traceback.format_exc()
                    print("Error during client.get():", str(e))
                    print("Traceback:\n", tb)
                    print("Full URL (truncated):", full_url[:500])
                    # Wrap and raise known ImaginaryAPIError for upstream handling
                    raise ImaginaryAPIError(
                        f"Network/error applying operation {op.type} (step {i+1}/{len(operations)}): {e}"
                    ) from e

                # Save new image bytes
                img_bytes = resp.content
                current_image_bytes = img_bytes

                # For chaining operations, we need to provide a URL for the next operation
                if i < len(operations) - 1:  # Not the last operation
                    # Prefer storage service to avoid long data URLs
                    if self.storage_service:
                        # Save intermediate result to storage and get URL
                        intermediate_url = await self.storage_service.save_image(img_bytes)
                        # If it's a file:// URL, convert to data URL (but only if small)
                        # If it's GCS (HTTPS), use it directly
                        if intermediate_url.startswith("file://"):
                            # For local storage with chained operations, data URLs become too long
                            # Check if this is a chained operation (not the first)
                            if i > 0:
                                raise ImaginaryAPIError(
                                    "Chained operations with local storage create URLs that are too long. "
                                    "Please configure GCS (set CLOUD_STORAGE_BUCKET in .env) for cloud storage, "
                                    "or use single operations only with local storage."
                                )
                            # For first operation only, convert to data URL if small enough
                            if len(img_bytes) > 1 * 1024 * 1024:  # 1MB limit for data URLs
                                raise ImaginaryAPIError(
                                    f"Image too large for data URL ({len(img_bytes)} bytes). "
                                    "Configure GCS for cloud storage or use smaller images."
                                )
                            img_base64 = base64.b64encode(img_bytes).decode('utf-8')
                            content_type = resp.headers.get('content-type', 'image/jpeg')
                            mime_type = content_type if 'image/' in content_type else 'image/jpeg'
                            current_image_url = f"data:{mime_type};base64,{img_base64}"
                        else:
                            # GCS URL (HTTPS) - use directly, perfect for chaining
                            current_image_url = intermediate_url
                    else:
                        # Fallback to data URL (only for small images)
                        if len(img_bytes) > 2 * 1024 * 1024:  # 2MB limit
                            raise ImaginaryAPIError(
                                f"Intermediate image too large for data URL (size: {len(img_bytes)} bytes). "
                                "Configure storage service to handle large images."
                            )
                        # Encode image bytes as base64 for data URL
                        img_base64 = base64.b64encode(img_bytes).decode('utf-8')
                        # Detect content type from response or default to jpeg
                        content_type = resp.headers.get('content-type', 'image/jpeg')
                        if 'image/' in content_type:
                            mime_type = content_type
                        else:
                            mime_type = 'image/jpeg'
                        current_image_url = f"data:{mime_type};base64,{img_base64}"

        return current_image_bytes
