import base64
import httpx
import logging
import uuid
from typing import List
from app.core.services.third_party.imaginary import ImaginaryClient, EditOperation
from app.core.services.app.storage_service import StorageService

logger = logging.getLogger(__name__)


class GeneralEditOrchestrator:
    """Handles general editing workflow using Imaginary."""

    def __init__(self, imaginary_client: ImaginaryClient):
        self.imaginary_client = imaginary_client
        self.storage_service = StorageService()
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

    async def run(self, image_url: str, operations: List[EditOperation]):

        # 1. Download source image
        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            response = await client.get(image_url)
            response.raise_for_status()
            img_bytes = response.content

        # 2. Save temp image
        logger.debug(f"Saving temporary image ({len(img_bytes)} bytes)")
        temp_image_url = await self.storage_service.save_image(img_bytes)
        logger.debug(f"Temporary image saved: {temp_image_url}")

        # 3. Ensure URL is accessible by Imaginary (convert file:// to data: if needed)
        accessible_url = await self._ensure_accessible_url(temp_image_url, img_bytes)
        logger.debug(f"Accessible URL for Imaginary: {accessible_url[:100]}..." if len(accessible_url) > 100 else f"Accessible URL for Imaginary: {accessible_url}")

        # 4. Apply operations via Imaginary
        output_bytes = await self.imaginary_client.apply(accessible_url, operations)

        # 5. Save final image
        logger.debug(f"Saving final processed image ({len(output_bytes)} bytes)")
        final_image_url = await self.storage_service.save_image(output_bytes)
        logger.info(f"✅ Final image saved: {final_image_url}")

        # 6. Generate job ID for response
        job_id = str(uuid.uuid4())

        return {
            "status": "SUCCESS",
            "job_id": job_id,
            "result_url": final_image_url,
            "reasoning": "General edit workflow completed successfully",
        }
