# Google Cloud Storage Setup Guide

## Overview

The storage service has been implemented with Google Cloud Storage (GCS) support with automatic local fallback. This provides a cost-effective and scalable solution for storing images in your photo editing backend.

## Why Google Cloud Storage?

**Cost-Effectiveness:**
- Standard Storage: $0.020 per GB/month
- Operations: $0.005 per 1,000 uploads, $0.004 per 1,000 downloads
- Free ingress (uploads)
- Network egress: $0.12/GB (first 1GB free)

**Ease of Use:**
- Simple Python SDK integration
- Automatic credential management
- Scales automatically without infrastructure management
- Well-documented and maintained

## Setup Instructions

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

This will install `google-cloud-storage>=2.10.0`.

### 2. Create a GCS Bucket

```bash
# Using gcloud CLI
gsutil mb -p YOUR_PROJECT_ID -c STANDARD -l us-central1 gs://your-bucket-name

# Or via Google Cloud Console:
# https://console.cloud.google.com/storage/create-bucket
```

### 3. Configure Authentication

Choose one of the following methods:

#### Option A: Service Account (Recommended for Production)

1. Create a service account in Google Cloud Console
2. Grant it "Storage Admin" or "Storage Object Admin" role
3. Download the JSON key file
4. Set environment variable:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
```

#### Option B: Application Default Credentials (Development)

```bash
gcloud auth application-default login
```

#### Option C: Running on Google Cloud (GCE/Cloud Run)

If running on Google Cloud Platform, credentials are automatically provided via metadata service.

### 4. Configure Environment Variables

Add to your `.env` file:

```env
# Enable GCS storage
CLOUD_STORAGE_BUCKET=your-bucket-name

# Optional: Local storage fallback path
LOCAL_STORAGE_PATH=./storage
```

**Note:** If `CLOUD_STORAGE_BUCKET` is not set, the service will automatically use local storage.

## Usage

The storage service is automatically initialized and used by the orchestrator:

```python
from app.core.services.app.storage_service import StorageService
from app.orchestration.application.config import get_settings

# Initialize with settings
settings = get_settings()
storage = StorageService(settings)

# Save an image (automatically uses GCS if configured, otherwise local)
image_url = await storage.save_image(image_bytes)

# Retrieve an image
image_data = await storage.get_image(image_url)

# Delete an image
success = await storage.delete_image(image_url)

# Check if GCS is enabled
if storage.is_gcs_enabled():
    print("Using Google Cloud Storage")
else:
    print("Using local storage")
```

## Features

- **Automatic Fallback**: If GCS is not configured or fails, automatically falls back to local storage
- **Unique Filenames**: Automatically generates unique filenames with timestamps and UUIDs
- **Public URLs**: Generates public URLs for uploaded images (GCS) or file:// URLs (local)
- **Async Support**: Fully async implementation for non-blocking operations
- **Error Handling**: Comprehensive error handling with logging
- **Content Type Detection**: Automatically detects file extension from content type

## Cost Optimization Tips

1. **Storage Class**: Use Standard storage for frequently accessed images. Consider Nearline ($0.010/GB) for less frequent access.

2. **Lifecycle Policies**: Set up lifecycle policies to automatically move old images to cheaper storage classes or delete them after a certain period.

3. **CDN Integration**: Consider using Cloud CDN to reduce egress costs for frequently accessed images.

4. **Compression**: Compress images before upload to reduce storage costs.

## Troubleshooting

### GCS Initialization Fails

- Check that `GOOGLE_APPLICATION_CREDENTIALS` is set correctly
- Verify the service account has proper permissions
- Ensure the bucket exists and is accessible
- Check logs for specific error messages

### Upload/Download Failures

- Verify bucket permissions (Storage Object Admin role)
- Check network connectivity
- Ensure bucket exists and is in the correct region
- Review GCS quotas and limits

### Local Storage Fallback

If GCS is not available, the service automatically uses local storage. Check that:
- `LOCAL_STORAGE_PATH` directory exists and is writable
- Sufficient disk space is available

## Testing

To test the storage service:

```python
import asyncio
from app.core.services.app.storage_service import StorageService

async def test_storage():
    storage = StorageService()
    
    # Test save
    test_image = b"fake image data"
    url = await storage.save_image(test_image)
    print(f"Saved to: {url}")
    
    # Test retrieve
    data = await storage.get_image(url)
    print(f"Retrieved {len(data)} bytes")
    
    # Test delete
    success = await storage.delete_image(url)
    print(f"Delete successful: {success}")

asyncio.run(test_storage())
```

