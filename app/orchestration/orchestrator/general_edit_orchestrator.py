import base64
import httpx
import logging
import uuid
from typing import List, Optional, Tuple, TYPE_CHECKING

from app.core.models.schemas import EditService
from app.core.services.third_party.imaginary import ImaginaryClient, EditOperation
from app.core.services.app.storage_service import StorageService

if TYPE_CHECKING:
    from app.core.services.third_party.opencv import OpenCVClient

logger = logging.getLogger(__name__)

class GeneralEditOrchestrator:
    """Handles general editing workflow using Imaginary or OpenCV backends."""

    def __init__(
        self,
        imaginary_client: ImaginaryClient,
        storage_service: Optional[StorageService] = None,
        opencv_client: Optional["OpenCVClient"] = None,
    ):
        self.imaginary_client = imaginary_client
        self.storage_service = storage_service or StorageService()
        self.opencv_client = opencv_client
        # Log which storage is being used
        if self.storage_service.is_gcs_enabled():
            logger.info("📦 Orchestrator using: Google Cloud Storage (GCS)")
        else:
            logger.info("📁 Orchestrator using: Local filesystem storage")

    async def _ensure_accessible_url(self, url: str, image_bytes: bytes) -> str:
        """Ensure the image URL is accessible by Imaginary API.
        
        If the URL is file://, we need to save it to a publicly accessible location.
        For local storage, we'll use data URLs (but only for small images).
        For GCS, the URL is already accessible.
        
        Args:
            url: Image URL (may be file://, http://, https://, or data:)
            image_bytes: Image bytes (needed for conversion if needed)
            
        Returns:
            Accessible URL (http://, https://, or data: for small images)
        """
        if url.startswith("file://"):
            # For file:// URLs, we have two options:
            # 1. Use data URL (works but can be very long for large images)
            # 2. Serve via HTTP (requires a web server)
            # 
            # For competition simplicity, we'll use data URLs but only if image is small enough
            # If image is too large, we'll re-save it with a new name to get a fresh URL
            # and hope GCS is configured (which gives us HTTPS URLs)
            
            # Check if using GCS (which gives HTTPS URLs)
            if self.storage_service.is_gcs_enabled():
                # Re-save to get a new GCS URL
                new_url = await self.storage_service.save_image(image_bytes)
                return new_url
            
            # For local storage, use data URL but warn if too large
            if len(image_bytes) > 5 * 1024 * 1024:  # 5MB limit
                raise ValueError(
                    "Image too large for data URL. Configure GCS for cloud storage "
                    "or use smaller images for local storage."
                )
            
            # Convert to data URL for small images
            img_base64 = base64.b64encode(image_bytes).decode('utf-8')
            # Try to detect image format from bytes
            if image_bytes.startswith(b'\x89PNG'):
                mime_type = 'image/png'
            elif image_bytes.startswith(b'\xff\xd8\xff'):
                mime_type = 'image/jpeg'
            elif image_bytes.startswith(b'GIF'):
                mime_type = 'image/gif'
            elif image_bytes.startswith(b'RIFF') and b'WEBP' in image_bytes[:12]:
                mime_type = 'image/webp'
            else:
                mime_type = 'image/jpeg'
            return f"data:{mime_type};base64,{img_base64}"
        return url

    async def run(
        self,
        image_url: str,
        operations: List[Tuple[EditService, EditOperation]],
    ):
        # 1. Download source image bytes (used by both backends)
        img_bytes = await self._download_image(image_url)

        # 2. Apply operations sequentially based on selected service
        grouped = self._group_operations(operations)
        current_bytes = img_bytes
        for service, ops in grouped:
            if service == EditService.OPENCV:
                current_bytes = await self._apply_opencv(current_bytes, ops)
            else:
                current_bytes = await self._apply_imaginary(current_bytes, ops)

        # 3. Save final image
        logger.debug(f"Saving final processed image ({len(current_bytes)} bytes)")
        final_image_url = await self.storage_service.save_image(current_bytes)
        logger.info(f"✅ Final image saved: {final_image_url}")

        # 4. Generate job ID for response
        job_id = str(uuid.uuid4())

        return {
            "status": "SUCCESS",
            "job_id": job_id,
            "result_url": final_image_url,
            "reasoning": "General edit workflow completed successfully",
        }

    async def _download_image(self, image_url: str) -> bytes:
        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            response = await client.get(image_url)
            response.raise_for_status()
            return response.content

    async def _apply_imaginary(self, input_bytes: bytes, operations: List[EditOperation]) -> bytes:
        logger.debug(f"Saving temporary image ({len(input_bytes)} bytes)")
        temp_image_url = await self.storage_service.save_image(input_bytes)
        logger.debug(f"Temporary image saved: {temp_image_url}")

        accessible_url = await self._ensure_accessible_url(temp_image_url, input_bytes)
        if len(accessible_url) > 100:
            logger.debug(f"Accessible URL for Imaginary: {accessible_url[:100]}...")
        else:
            logger.debug(f"Accessible URL for Imaginary: {accessible_url}")

        return await self.imaginary_client.apply(accessible_url, operations)

    async def _apply_opencv(self, img_bytes: bytes, operations: List[EditOperation]) -> bytes:
        if not self.opencv_client:
            raise ValueError(
                "OpenCV backend requested but no OpenCV client was configured."
            )
        return await self.opencv_client.apply(img_bytes, operations)

    def _group_operations(
        self, operations: List[Tuple[EditService, EditOperation]]
    ) -> List[Tuple[EditService, List[EditOperation]]]:
        grouped: List[Tuple[EditService, List[EditOperation]]] = []
        current_service: Optional[EditService] = None
        current_ops: List[EditOperation] = []

        for service, operation in operations:
            if current_service != service:
                if current_ops:
                    grouped.append((current_service, current_ops))
                    current_ops = []
                current_service = service
            current_ops.append(operation)

        if current_ops and current_service:
            grouped.append((current_service, current_ops))

        return grouped
