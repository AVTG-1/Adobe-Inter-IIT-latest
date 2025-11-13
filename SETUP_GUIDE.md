# Setup Guide for `/edit/general` Endpoint

This guide will help you set up everything needed to use the `/edit/general` endpoint for image editing.

## 📋 Prerequisites

1. **Python 3.10+** installed
2. **Docker** (for running Imaginary service)
3. **Google Cloud SDK** (optional, only if using GCS)

## 🚀 Step-by-Step Setup

### 1. Install Python Dependencies

```bash
pip install -r requirements.txt
```

**Key dependencies:**
- `fastapi` - Web framework
- `httpx` - HTTP client for downloading images and calling Imaginary
- `google-cloud-storage` - For GCS (optional)
- `aiofiles` - Async file operations
- `pydantic` - Request/response validation

### 2. Set Up Imaginary Service (Required)

Imaginary is the image processing service that performs the actual edits.

#### Option A: Using Docker (Recommended)

```bash
# Pull and run Imaginary
docker run -d -p 8080:9000 \
  --name imaginary \
  h2non/imaginary:latest \
  -enable-url-source
```

**Verify it's running:**
```bash
curl http://localhost:8080/info
```

#### Option B: Using Binary

Download from: https://github.com/h2non/imaginary/releases

```bash
# Run Imaginary
./imaginary -enable-url-source -port 8080
```

### 3. Configure Environment Variables

Create `.env` file (copy from `.env.example`):

```bash
cp .env.example .env
```

**Minimum required configuration:**

```env
# Imaginary API Configuration (REQUIRED)
IMAGINARY_BASE_URL=http://localhost:8080
IMAGINARY_TIMEOUT=30

# Storage Configuration
# Option 1: Local storage (default, no setup needed)
LOCAL_STORAGE_PATH=./storage

# Option 2: Google Cloud Storage (optional)
# CLOUD_STORAGE_BUCKET=your-bucket-name
# GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

**Note:** If `CLOUD_STORAGE_BUCKET` is not set, the system automatically uses local storage in the `./storage` directory.

### 4. Set Up Storage (Choose One)

#### Option A: Local Storage (Simplest for Development)

No additional setup needed! The system will:
- Create `./storage` directory automatically
- Save images locally
- Return `file://` URLs (converted to data URLs for Imaginary)

#### Option B: Google Cloud Storage (For Production)

1. **Create a GCS bucket:**
   ```bash
   gsutil mb -p YOUR_PROJECT_ID -c STANDARD -l us-central1 gs://your-bucket-name
   ```

2. **Set up authentication:**
   ```bash
   # Option 1: Service account (recommended)
   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
   
   # Option 2: Application default credentials
   gcloud auth application-default login
   ```

3. **Update `.env`:**
   ```env
   CLOUD_STORAGE_BUCKET=your-bucket-name
   ```

### 5. Start the FastAPI Server

```bash
# Option 1: Using run.sh
./run.sh

# Option 2: Direct uvicorn
uvicorn app.orchestration.application.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at: `http://localhost:8000`

## 📝 API Usage

### Endpoint: `POST /api/v1/edit/general`

**Request Body:**
```json
{
  "image_url": "https://example.com/image.jpg",
  "operations": [
    {
      "type": "brightness",
      "value": 0.5
    },
    {
      "type": "contrast",
      "value": 1.2
    }
  ]
}
```

**Supported Operations:**
- `brightness` - Adjust brightness (value: -1.0 to 1.0)
- `contrast` - Adjust contrast (value: 0.0 to 2.0)
- `saturation` - Adjust saturation (value: 0.0 to 2.0)
- `exposure` - Adjust exposure (value: -1.0 to 1.0)
- `blur` - Apply blur (value: sigma, e.g., 2.0)
- `sharpen` - Sharpen image (value: sigma, e.g., 1.0)
- `resize` - Resize image (width, height required)
- `crop` - Crop image (x, y, width, height required)
- `rotate` - Rotate image (angle required, in degrees)

**Response:**
```json
{
  "job_id": "uuid-here",
  "status": "completed",
  "result_url": "https://storage.googleapis.com/bucket/result.jpg",
  "agent_thoughts": ["General edit workflow completed successfully"],
  "processing_time_ms": null,
  "error": null
}
```

## 🧪 Testing the Endpoint

### Using curl:

```bash
curl -X POST "http://localhost:8000/api/v1/edit/general" \
  -H "Content-Type: application/json" \
  -d '{
    "image_url": "https://picsum.photos/800/600",
    "operations": [
      {"type": "brightness", "value": 0.3},
      {"type": "contrast", "value": 1.1}
    ]
  }'
```

### Using Python:

```python
import httpx

response = httpx.post(
    "http://localhost:8000/api/v1/edit/general",
    json={
        "image_url": "https://picsum.photos/800/600",
        "operations": [
            {"type": "brightness", "value": 0.3},
            {"type": "contrast", "value": 1.1}
        ]
    }
)
print(response.json())
```

### Using Swagger UI:

Visit: `http://localhost:8000/docs`

## ✅ Verification Checklist

Before using the endpoint, verify:

- [ ] Python dependencies installed (`pip install -r requirements.txt`)
- [ ] Imaginary service running on port 8080
- [ ] `.env` file configured with `IMAGINARY_BASE_URL`
- [ ] Storage configured (local or GCS)
- [ ] FastAPI server running
- [ ] Can access `http://localhost:8000/docs`

## 🔧 Troubleshooting

### Issue: "Connection refused" to Imaginary

**Solution:**
- Check if Imaginary is running: `curl http://localhost:8080/info`
- Verify `IMAGINARY_BASE_URL` in `.env` matches your Imaginary URL
- Check Docker container: `docker ps | grep imaginary`

### Issue: "Cannot access file:// URLs"

**Solution:**
- This is handled automatically - local files are converted to data URLs
- If using GCS, ensure bucket is accessible and credentials are set

### Issue: "Storage directory not writable"

**Solution:**
```bash
mkdir -p storage
chmod 755 storage
```

### Issue: GCS authentication errors

**Solution:**
- Verify `GOOGLE_APPLICATION_CREDENTIALS` path is correct
- Check service account has "Storage Object Admin" role
- Try: `gcloud auth application-default login`

## 📊 Architecture Flow

```
Client Request
    ↓
FastAPI Endpoint (/edit/general)
    ↓
GeneralEditOrchestrator
    ↓
1. Download image (httpx)
    ↓
2. Save to storage (local/GCS)
    ↓
3. Convert URL for Imaginary
    ↓
4. Apply operations via Imaginary API
    ↓
5. Save result to storage
    ↓
6. Return result URL
```

## 🎯 Quick Start (Minimal Setup)

For fastest setup with local storage:

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Start Imaginary
docker run -d -p 8080:9000 --name imaginary h2non/imaginary:latest -enable-url-source

# 3. Create .env
echo "IMAGINARY_BASE_URL=http://localhost:8080" > .env
echo "LOCAL_STORAGE_PATH=./storage" >> .env

# 4. Start server
uvicorn app.orchestration.application.main:app --reload

# 5. Test
curl -X POST "http://localhost:8000/api/v1/edit/general" \
  -H "Content-Type: application/json" \
  -d '{"image_url": "https://picsum.photos/800/600", "operations": [{"type": "brightness", "value": 0.2}]}'
```

That's it! You're ready to use the endpoint. 🚀

