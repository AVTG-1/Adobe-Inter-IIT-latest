"""Storage service for saving and retrieving images using Google Cloud Storage."""

import json
import logging
import os
import uuid
from pathlib import Path
from typing import Optional
from datetime import datetime

import aiofiles
from google.cloud import storage
from google.cloud.exceptions import GoogleCloudError

from app.orchestration.application.config import Settings

logger = logging.getLogger(__name__)


class StorageService:
    """Service for managing image storage using Google Cloud Storage with local fallback.
    
    This service provides a unified interface for saving images to either:
    - Google Cloud Storage (if configured)
    - Local filesystem (fallback)
    
    Decision rationale:
    - GCS Standard Storage: $0.020/GB/month (cost-effective for active images)
    - Operations: $0.005 per 1,000 uploads, $0.004 per 1,000 downloads
    - Free ingress (uploads), egress starts at $0.12/GB
    - Easy integration with Python SDK
    - Scales automatically without infrastructure management
    """
    
    def __init__(self, settings: Optional[Settings] = None):
        """Initialize storage service.
        
        Args:
            settings: Application settings. If None, will load from environment.
        """
        if settings is None:
            from app.orchestration.application.config import get_settings
            settings = get_settings()
        
        self.settings = settings
        self.bucket_name = settings.cloud_storage_bucket
        self.local_path = Path(settings.local_storage_path)
        self.local_path.mkdir(parents=True, exist_ok=True)
        
        # Initialize GCS client if bucket is configured
        self._gcs_client: Optional[storage.Client] = None
        self._gcs_bucket: Optional[storage.Bucket] = None
        
        if self.bucket_name:
            try:
                logger.info(f"Attempting to initialize GCS storage with bucket: {self.bucket_name}")
                
                # Try to get project ID and credentials path
                project_id = None
                credentials_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
                
                # If not in environment, check if it's in .env (via settings or direct read)
                if not credentials_path:
                    # Try to read from .env file directly
                    # Path from storage_service.py: app/core/services/app/storage_service.py
                    # Need to go up 5 levels: app -> services -> app -> services -> core -> app -> root
                    env_file = Path(__file__).parent.parent.parent.parent.parent / ".env"
                    logger.debug(f"Checking for .env file at: {env_file}")
                    if env_file.exists():
                        try:
                            with open(env_file, 'r') as f:
                                for line in f:
                                    line = line.strip()
                                    # Skip comments and empty lines
                                    if not line or line.startswith('#'):
                                        continue
                                    if line.startswith("GOOGLE_APPLICATION_CREDENTIALS="):
                                        credentials_path = line.split("=", 1)[1].strip().strip('"').strip("'")
                                        logger.info(f"Found GOOGLE_APPLICATION_CREDENTIALS in .env: {credentials_path}")
                                        break
                        except Exception as e:
                            logger.warning(f"Could not read .env file: {e}")
                    else:
                        logger.debug(f".env file not found at: {env_file}")
                
                if credentials_path:
                    # Handle relative paths (relative to project root)
                    original_path = credentials_path
                    if not os.path.isabs(credentials_path):
                        # Get project root (go up 5 levels from storage_service.py)
                        project_root = Path(__file__).parent.parent.parent.parent.parent
                        credentials_path = str(project_root / credentials_path)
                        logger.debug(f"Resolved relative path '{original_path}' to '{credentials_path}'")
                    
                    if os.path.exists(credentials_path):
                        try:
                            logger.info(f"Reading credentials from: {credentials_path}")
                            with open(credentials_path, 'r') as f:
                                creds = json.load(f)
                                project_id = creds.get('project_id')
                                if project_id:
                                    logger.info(f"✅ Found project ID in credentials: {project_id}")
                                else:
                                    logger.warning("Credentials file found but no 'project_id' field")
                            
                            # Set environment variable so Google Cloud client can use it
                            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = credentials_path
                            logger.info(f"Set GOOGLE_APPLICATION_CREDENTIALS environment variable")
                        except json.JSONDecodeError as e:
                            logger.error(f"Invalid JSON in credentials file: {e}")
                        except Exception as e:
                            logger.error(f"Could not read credentials file: {e}", exc_info=True)
                    else:
                        logger.error(f"Credentials file not found at: {credentials_path}")
                else:
                    logger.warning("GOOGLE_APPLICATION_CREDENTIALS not found in environment or .env file")
                
                # Also check GOOGLE_CLOUD_PROJECT env var
                if not project_id:
                    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT")
                    if project_id:
                        logger.info(f"Found project ID from GOOGLE_CLOUD_PROJECT: {project_id}")
                
                # GCS client will use credentials from:
                # 1. GOOGLE_APPLICATION_CREDENTIALS env var (service account JSON) - now set above
                # 2. gcloud auth application-default login
                # 3. GCE/Cloud Run metadata service (if running on GCP)
                if project_id:
                    logger.info(f"Initializing GCS client with project: {project_id}")
                    self._gcs_client = storage.Client(project=project_id)
                else:
                    logger.warning("No project ID found. Attempting to initialize GCS client without explicit project...")
                    self._gcs_client = storage.Client()
                
                self._gcs_bucket = self._gcs_client.bucket(self.bucket_name)
                
                # Try to verify bucket exists and is accessible
                # Note: This requires storage.buckets.get permission
                # If permission is missing, we'll skip the check and try to use the bucket anyway
                logger.info(f"Checking if GCS bucket '{self.bucket_name}' exists and is accessible...")
                try:
                    if not self._gcs_bucket.exists():
                        logger.warning(f"GCS bucket '{self.bucket_name}' does not exist. Falling back to local storage.")
                        logger.info(f"Using local storage at: {self.local_path}")
                        self._gcs_client = None
                        self._gcs_bucket = None
                    else:
                        logger.info(f"✅ GCS storage initialized successfully with bucket: {self.bucket_name}")
                        logger.info(f"Storage mode: Google Cloud Storage (GCS)")
                except GoogleCloudError as e:
                    # If we don't have storage.buckets.get permission, that's okay
                    # We can still use the bucket for object operations (create, get, delete objects)
                    error_msg = str(e)
                    if "storage.buckets.get" in error_msg or ("Permission" in error_msg and "denied" in error_msg.lower()):
                        logger.warning(f"⚠️  Cannot verify bucket existence (missing storage.buckets.get permission)")
                        logger.info(f"   This is okay - we only need object-level permissions to use the bucket")
                        logger.info(f"   Bucket will be validated on first upload operation")
                        logger.info(f"✅ GCS storage initialized with bucket: {self.bucket_name}")
                        logger.info(f"Storage mode: Google Cloud Storage (GCS)")
                    else:
                        # Other errors, fall back to local
                        logger.warning(f"❌ GCS initialization failed: {e}. Falling back to local storage.")
                        logger.info(f"Using local storage at: {self.local_path}")
                        self._gcs_client = None
                        self._gcs_bucket = None
                except Exception as e:
                    # Catch any other exceptions during bucket check
                    error_msg = str(e)
                    if "Permission" in error_msg or "403" in error_msg:
                        logger.warning(f"⚠️  Permission error during bucket check: {e}")
                        logger.info(f"   Proceeding anyway - will validate on first upload")
                        logger.info(f"✅ GCS storage initialized with bucket: {self.bucket_name}")
                        logger.info(f"Storage mode: Google Cloud Storage (GCS)")
                    else:
                        raise  # Re-raise if it's not a permission error
            except Exception as e:
                # If GCS initialization fails, fall back to local storage
                logger.warning(f"❌ GCS initialization failed: {e}. Falling back to local storage.")
                logger.info(f"Using local storage at: {self.local_path}")
                self._gcs_client = None
                self._gcs_bucket = None
        else:
            logger.info(f"ℹ️  No CLOUD_STORAGE_BUCKET configured. Using local storage.")
            logger.info(f"Storage mode: Local filesystem at {self.local_path}")
    
    def _generate_filename(self, extension: str = "jpg") -> str:
        """Generate a unique filename for storing images.
        
        Args:
            extension: File extension (jpg, png, etc.)
            
        Returns:
            Unique filename with timestamp and UUID
        """
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        return f"{timestamp}_{unique_id}.{extension}"
    
    async def save_image(
        self,
        image_data: bytes,
        filename: Optional[str] = None,
        content_type: str = "image/jpeg",
        make_public: bool = True
    ) -> str:
        """Save image data and return accessible URL.
        
        Args:
            image_data: Image bytes to save
            filename: Optional custom filename. If not provided, generates unique name.
            content_type: MIME type of the image (default: image/jpeg)
            make_public: Whether to make the object publicly accessible (GCS only)
            
        Returns:
            Public URL to access the saved image
            
        Raises:
            IOError: If saving to local storage fails
            GoogleCloudError: If GCS upload fails
        """
        # Generate filename if not provided
        if not filename:
            # Try to detect extension from content_type
            extension_map = {
                "image/jpeg": "jpg",
                "image/jpg": "jpg",
                "image/png": "png",
                "image/webp": "webp",
                "image/gif": "gif",
            }
            extension = extension_map.get(content_type, "jpg")
            filename = self._generate_filename(extension)
        
        # Use GCS if configured, otherwise use local storage
        if self._gcs_bucket:
            logger.debug(f"Saving image to GCS: {filename} ({len(image_data)} bytes)")
            return await self._upload_to_gcs(image_data, filename, content_type, make_public)
        else:
            logger.debug(f"Saving image to local storage: {filename} ({len(image_data)} bytes)")
            return await self._save_local(image_data, filename)
    
    async def _upload_to_gcs(
        self,
        image_data: bytes,
        filename: str,
        content_type: str,
        make_public: bool
    ) -> str:
        """Upload image to Google Cloud Storage.
        
        Args:
            image_data: Image bytes
            filename: Destination filename in bucket
            content_type: MIME type
            make_public: Whether to make object publicly readable
            
        Returns:
            Public URL of uploaded image
            
        Raises:
            GoogleCloudError: If upload fails
        """
        import asyncio
        
        def _upload_sync():
            """Synchronous upload function to run in executor."""
            try:
                logger.debug(f"Uploading to GCS bucket '{self.bucket_name}': {filename}")
                blob = self._gcs_bucket.blob(filename)
                blob.upload_from_string(
                    image_data,
                    content_type=content_type
                )
                
                if make_public:
                    try:
                        blob.make_public()
                        logger.debug(f"Made blob public: {filename}")
                    except GoogleCloudError as e:
                        error_msg = str(e)
                        # Handle uniform bucket-level access - can't set per-object ACLs
                        if "uniform bucket-level access" in error_msg.lower() or "legacy ACL" in error_msg.lower():
                            logger.warning(f"⚠️  Cannot set object ACL (uniform bucket-level access enabled)")
                            logger.info(f"   Assuming bucket is configured for public access via IAM")
                            logger.info(f"   Public URL should still work if bucket allows public read")
                        else:
                            # Re-raise if it's a different error
                            raise
                
                public_url = blob.public_url
                logger.info(f"✅ Successfully uploaded image to GCS: {filename}")
                logger.info(f"   Public URL: {public_url}")
                return public_url
            except GoogleCloudError as e:
                logger.error(f"❌ GCS upload failed for {filename}: {e}")
                raise
        
        # Run synchronous GCS operation in thread pool
        loop = asyncio.get_event_loop()
        try:
            public_url = await loop.run_in_executor(None, _upload_sync)
            return public_url
        except GoogleCloudError:
            raise
        except Exception as e:
            logger.error(f"Unexpected error during GCS upload: {e}")
            raise IOError(f"Failed to upload image to GCS: {e}") from e
    
    async def _save_local(self, image_data: bytes, filename: str) -> str:
        """Save image to local filesystem.
        
        Args:
            image_data: Image bytes
            filename: Local filename
            
        Returns:
            File path (file:// URL format)
            
        Raises:
            IOError: If file write fails
        """
        file_path = self.local_path / filename
        try:
            async with aiofiles.open(file_path, "wb") as f:
                await f.write(image_data)
            file_url = f"file://{file_path.absolute()}"
            logger.info(f"✅ Saved image to local storage: {file_path}")
            logger.debug(f"   File URL: {file_url}")
            return file_url
        except Exception as e:
            logger.error(f"❌ Failed to save image to local storage: {e}")
            raise IOError(f"Failed to save image to local storage: {e}") from e
    
    async def get_image(self, file_path_or_url: str) -> bytes:
        """Retrieve image data from storage.
        
        Args:
            file_path_or_url: GCS URL (gs:// or https://) or local file path
            
        Returns:
            Image data as bytes
            
        Raises:
            FileNotFoundError: If local file doesn't exist
            GoogleCloudError: If GCS download fails
        """
        # Handle GCS URLs
        if file_path_or_url.startswith("gs://"):
            return await self._download_from_gcs(file_path_or_url)
        elif file_path_or_url.startswith("https://storage.googleapis.com") or \
             file_path_or_url.startswith("https://storage.cloud.google.com"):
            # Convert public URL to gs:// format
            # https://storage.googleapis.com/bucket-name/path -> gs://bucket-name/path
            parts = file_path_or_url.replace("https://storage.googleapis.com/", "").split("/", 1)
            if len(parts) == 2:
                gs_url = f"gs://{parts[0]}/{parts[1]}"
                return await self._download_from_gcs(gs_url)
        
        # Handle local file paths
        if file_path_or_url.startswith("file://"):
            file_path = Path(file_path_or_url.replace("file://", ""))
        else:
            file_path = Path(file_path_or_url)
        
        if not file_path.exists():
            raise FileNotFoundError(f"Image not found: {file_path}")
        
        async with aiofiles.open(file_path, "rb") as f:
            return await f.read()
    
    async def _download_from_gcs(self, gs_url: str) -> bytes:
        """Download image from Google Cloud Storage.
        
        Args:
            gs_url: GCS URL in format gs://bucket-name/path
            
        Returns:
            Image data as bytes
            
        Raises:
            ValueError: If URL format is invalid
            GoogleCloudError: If download fails
        """
        import asyncio
        
        # Parse gs:// URL
        if not gs_url.startswith("gs://"):
            raise ValueError(f"Invalid GCS URL format: {gs_url}")
        
        path = gs_url[5:]  # Remove 'gs://' prefix
        try:
            bucket_name, blob_name = path.split("/", 1)
        except ValueError:
            raise ValueError(f"Invalid GCS URL format: {gs_url}")
        
        def _download_sync():
            """Synchronous download function to run in executor."""
            try:
                bucket = self._gcs_client.bucket(bucket_name)
                blob = bucket.blob(blob_name)
                if not blob.exists():
                    raise FileNotFoundError(f"Blob not found: {gs_url}")
                return blob.download_as_bytes()
            except GoogleCloudError as e:
                logger.error(f"GCS download failed for {gs_url}: {e}")
                raise
        
        loop = asyncio.get_event_loop()
        try:
            return await loop.run_in_executor(None, _download_sync)
        except GoogleCloudError:
            raise
        except Exception as e:
            logger.error(f"Unexpected error during GCS download: {e}")
            raise IOError(f"Failed to download image from GCS: {e}") from e
    
    async def delete_image(self, file_path_or_url: str) -> bool:
        """Delete image from storage.
        
        Args:
            file_path_or_url: GCS URL or local file path
            
        Returns:
            True if deletion was successful, False otherwise
        """
        # Handle GCS URLs
        if file_path_or_url.startswith("gs://"):
            return await self._delete_from_gcs(file_path_or_url)
        elif "storage.googleapis.com" in file_path_or_url or "storage.cloud.google.com" in file_path_or_url:
            # Convert public URL to gs:// format
            parts = file_path_or_url.replace("https://storage.googleapis.com/", "").replace(
                "https://storage.cloud.google.com/", ""
            ).split("/", 1)
            if len(parts) == 2:
                gs_url = f"gs://{parts[0]}/{parts[1]}"
                return await self._delete_from_gcs(gs_url)
        
        # Handle local file paths
        if file_path_or_url.startswith("file://"):
            file_path = Path(file_path_or_url.replace("file://", ""))
        else:
            file_path = Path(file_path_or_url)
        
        if file_path.exists():
            file_path.unlink()
            return True
        return False
    
    async def _delete_from_gcs(self, gs_url: str) -> bool:
        """Delete image from Google Cloud Storage.
        
        Args:
            gs_url: GCS URL in format gs://bucket-name/path
            
        Returns:
            True if deletion was successful
        """
        import asyncio
        
        # Parse gs:// URL
        if not gs_url.startswith("gs://"):
            return False
        
        path = gs_url[5:]  # Remove 'gs://' prefix
        bucket_name, blob_name = path.split("/", 1)
        
        def _delete_sync():
            """Synchronous delete function to run in executor."""
            try:
                bucket = self._gcs_client.bucket(bucket_name)
                blob = bucket.blob(blob_name)
                blob.delete()
                return True
            except GoogleCloudError:
                return False
        
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, _delete_sync)
    
    def is_gcs_enabled(self) -> bool:
        """Check if Google Cloud Storage is configured and available.
        
        Returns:
            True if GCS is enabled, False if using local storage
        """
        return self._gcs_bucket is not None
