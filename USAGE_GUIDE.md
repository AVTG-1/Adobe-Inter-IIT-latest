# Usage Guide

## API Endpoints

### Health Check

```bash
curl http://localhost:8000/api/v1/health
```

Response:
```json
{
  "status": "healthy",
  "version": "0.1.0",
  "timestamp": "2025-11-13T10:30:00Z"
}
```

### Workflow 1: Object Inpainting

Remove objects from images and reconstruct background.

**Endpoint**: `POST /api/v1/edit/inpaint`

**Request**:
```bash
curl -X POST "http://localhost:8000/api/v1/edit/inpaint" \
  -H "Content-Type: application/json" \
  -d '{
    "image_url": "https://example.com/image.jpg",
    "prompt": "Remove the person from the beach scene",
    "mask_coordinates": {
      "x": 100,
      "y": 150,
      "width": 200,
      "height": 300
    }
  }'
```

**Response**:
```json
{
  "job_id": "inpaint_abc123",
  "status": "completed",
  "result_url": "https://storage.com/result_abc123.jpg",
  "agent_thoughts": [
    "Analyzing image for object removal",
    "Using SAM for precise segmentation",
    "Applying SDXL inpainting model",
    "Post-processing for seamless blend"
  ],
  "processing_time_ms": 3450
}
```

### Workflow 2: Image Relighting

Adjust lighting and atmosphere of images.

**Endpoint**: `POST /api/v1/edit/relight`

**Request**:
```bash
curl -X POST "http://localhost:8000/api/v1/edit/relight" \
  -H "Content-Type: application/json" \
  -d '{
    "image_url": "https://example.com/image.jpg",
    "prompt": "Make it look like golden hour with warm sunset lighting",
    "intensity": 0.7
  }'
```

**Response**:
```json
{
  "job_id": "relight_xyz789",
  "status": "completed",
  "result_url": "https://storage.com/result_xyz789.jpg",
  "agent_thoughts": [
    "Analyzing current lighting conditions",
    "Selecting appropriate LoRA adapter",
    "Applying relighting transformation",
    "Adjusting color temperature and shadows"
  ],
  "processing_time_ms": 2150
}
```

## Python Client Example

```python
import requests

BASE_URL = "http://localhost:8000/api/v1"

# Inpainting workflow
response = requests.post(
    f"{BASE_URL}/edit/inpaint",
    json={
        "image_url": "https://example.com/photo.jpg",
        "prompt": "Remove the background object",
        "mask_coordinates": {
            "x": 50, "y": 100, "width": 150, "height": 200
        }
    }
)

result = response.json()
print(f"Result URL: {result['result_url']}")
print(f"Agent reasoning: {result['agent_thoughts']}")

# Relighting workflow
response = requests.post(
    f"{BASE_URL}/edit/relight",
    json={
        "image_url": "https://example.com/photo.jpg",
        "prompt": "Add dramatic studio lighting",
        "intensity": 0.8
    }
)

result = response.json()
print(f"Result URL: {result['result_url']}")
```

## Request Schemas

### InpaintRequest

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| image_url | string | Yes | URL of input image |
| prompt | string | Yes | Editing instruction |
| mask_coordinates | object | No | Region to inpaint (auto-detect if not provided) |

### RelightRequest

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| image_url | string | Yes | URL of input image |
| prompt | string | Yes | Lighting instruction |
| intensity | float | No | Effect intensity (0.0-1.0, default 0.5) |

## Response Schema

All workflows return:

| Field | Type | Description |
|-------|------|-------------|
| job_id | string | Unique job identifier |
| status | string | `completed`, `failed`, or `processing` |
| result_url | string | URL of edited image |
| agent_thoughts | array | Agent reasoning steps |
| processing_time_ms | integer | Processing duration |
| error | string | Error message (if failed) |

## Error Handling

### Common Error Codes

- `400 Bad Request`: Invalid input parameters
- `404 Not Found`: Image URL not accessible
- `500 Internal Server Error`: Processing failure

Example error response:
```json
{
  "detail": {
    "error": "InvalidImageFormat",
    "message": "Image format must be JPEG or PNG",
    "job_id": "inpaint_failed_123"
  }
}
```

## Testing with Streamlit Demo

A Streamlit demo app will be available for visual testing:

```bash
streamlit run demo/app.py
```

This provides an interactive interface for both workflows with real-time agent thought visualization.

## Performance Tips

1. **Image Size**: Resize large images (>2048px) for faster processing
2. **Quantization**: Enable `USE_QUANTIZATION=true` for 2x speedup with minimal quality loss
3. **Batch Processing**: Use async requests for multiple images
4. **Caching**: Results are cached based on image hash + prompt

## Monitoring

Check agent performance:

```bash
curl http://localhost:8000/api/v1/health
```

View detailed logs:
```bash
tail -f logs/app.log
```
