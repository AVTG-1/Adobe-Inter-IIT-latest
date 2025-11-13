# Quick Reference Guide

## 📁 File Organization

### Where to Add New Code

#### New Workflow?
1. Create agent in `app/experts/agents/your_agent.py`
2. Extend `BaseAgent` class
3. Implement `process()` and `_select_tools()` methods
4. Add endpoint in `app/orchestrator/resources/edit_workflow.py`
5. Add route in orchestrator: `orchestrator.py`

#### New Tool/Model?
- Add to `app/experts/tools/image_tools.py`
- Register in `tool_registry`
- Tools are called by agents

#### New Service?
- **Internal**: `app/core/services/app/`
- **External**: `app/core/services/third_party/`
- Extend `BaseService` for external APIs

#### New Request/Response?
- Add Pydantic model in `app/core/models/schemas.py`
- Auto-validation via FastAPI

## 🔌 Integration Points

### Model Integration Checklist

**For Inpainting:**
```python
# File: app/experts/agents/inpainting_agent.py
# Lines: 89-98, 101-113

async def _generate_mask(self, image, prompt):
    # TODO: Integrate SAM model here
    from transformers import SamModel, SamProcessor
    # Your implementation
    
async def _apply_inpainting(self, image, mask, prompt):
    # TODO: Integrate SDXL Inpainting here
    from diffusers import StableDiffusionInpaintPipeline
    # Your implementation
```

**For Relighting:**
```python
# File: app/experts/agents/relighting_agent.py
# Lines: 122-138

async def _apply_relighting(self, image, style, intensity, prompt):
    # TODO: Integrate diffusion + LoRA here
    from diffusers import StableDiffusionPipeline
    # Load LoRA adapters based on style
    # Your implementation
```

**LangChain Tools:**
```python
# File: app/experts/tools/image_tools.py

# Replace placeholders with actual implementations:
async def sam_segmentation(image, prompt):
    # Actual SAM integration
    
async def sdxl_inpainting(image, mask, prompt):
    # Actual SDXL integration
    
async def diffusion_relighting(image, prompt, intensity):
    # Actual diffusion + LoRA integration
```

## 🚀 Common Tasks

### Add Environment Variable
1. Add to `.env.example`
2. Add to `app/config.py` Settings class
3. Use: `settings = get_settings()`

### Add Database Field
Currently using in-memory storage. For persistence:
1. Update `JobMetadata` in `metadata_dao.py`
2. Or replace with SQLAlchemy models in `app/core/models/entities.py`

### Add Endpoint
```python
# In app/orchestrator/resources/your_resource.py

from fastapi import APIRouter, Depends
from app.core.models import YourRequest, YourResponse

router = APIRouter(prefix="/your-prefix", tags=["your-tag"])

@router.post("/endpoint", response_model=YourResponse)
async def your_endpoint(request: YourRequest):
    # Implementation
    pass

# Then register in app/main.py:
# app.include_router(your_router, prefix=settings.api_v1_prefix)
```

### Add Test
```python
# In tests/test_your_feature.py

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_your_feature():
    response = client.post("/api/v1/your-endpoint", json={...})
    assert response.status_code == 200
```

## 🏗️ Architecture Patterns

### Dependency Injection Pattern
```python
# Define dependency
def get_service(settings: Settings = Depends(get_settings)):
    return YourService(settings)

# Use in endpoint
@router.post("/endpoint")
async def endpoint(service: YourService = Depends(get_service)):
    result = service.do_something()
    return result
```

### Agent Pattern
```python
class YourAgent(BaseAgent):
    async def process(self, image, prompt, **kwargs):
        self.reset()
        
        # Step 1: Thought
        self._add_thought("Analyzing task")
        
        # Step 2: Action
        self._add_thought("Executing action", action="tool_name")
        result = await self._your_method()
        
        # Step 3: Observation
        self._add_thought("Processing result", observation="what_happened")
        
        # Validate
        if not self._validate_result(result):
            raise ValueError("Failed")
        
        return result
```

## 🐛 Debugging

### Check Logs
```bash
# Enable debug mode
DEBUG=true in .env

# View startup logs
./run.sh
```

### Test Endpoint
```bash
# Health check
curl http://localhost:8000/api/v1/health

# With httpie (better formatting)
pip install httpie
http :8000/api/v1/health
```

### Inspect Job
```python
# In Python shell
from app.core.services import MetadataDAO
dao = MetadataDAO()
jobs = dao.list_jobs()
print(jobs[0].agent_thoughts)
```

### Check Agent Thoughts
Every workflow response includes `agent_thoughts` array showing reasoning steps.

## 📦 Deployment Checklist

- [ ] Set `DEBUG=false` in production
- [ ] Configure proper CORS origins
- [ ] Set up cloud storage (replace local storage)
- [ ] Add authentication/authorization
- [ ] Set up logging aggregation
- [ ] Configure rate limiting
- [ ] Set up model caching
- [ ] Configure monitoring/alerting
- [ ] Set up CI/CD pipeline
- [ ] Review security headers

## 🔒 Security Notes

Current implementation is for development. For production:

1. **Authentication**: Add JWT or OAuth2
2. **Rate Limiting**: Use Redis + slowapi
3. **Input Validation**: Already using Pydantic ✅
4. **File Upload**: Validate file types and size
5. **API Keys**: Store in secrets manager, not .env
6. **HTTPS**: Enforce in production
7. **CORS**: Restrict origins in production

## 💡 Tips

### Performance
- Use async/await for I/O operations ✅
- Enable quantization for faster inference
- Batch similar requests
- Cache model weights
- Use GPU when available

### Testing
- Use pytest fixtures for common setup
- Mock external services in tests
- Test error cases, not just happy path
- Use TestClient for API tests ✅

### Code Quality
- Run `black` before committing
- Use type hints everywhere ✅
- Write docstrings for public methods ✅
- Keep functions small and focused ✅

## 📚 Key Files to Know

| File | Purpose | Modify When |
|------|---------|-------------|
| `app/main.py` | App entry point | Adding routers |
| `app/config.py` | Configuration | Adding env vars |
| `orchestrator.py` | Workflow logic | Changing workflow steps |
| `base_agent.py` | Agent pattern | Changing TAO behavior |
| `schemas.py` | API contracts | Changing API |
| `image_tools.py` | Model inference | Integrating models |

## 🆘 Common Issues

**Import Error**: Check Python path and virtual environment
**Validation Error**: Check request schema matches Pydantic model
**Agent Error**: Check agent thought history for reasoning
**Storage Error**: Check `LOCAL_STORAGE_PATH` exists and is writable

## 📞 Next Steps

1. ✅ Base structure implemented
2. 🔄 Integrate actual models (SAM, SDXL, LoRA)
3. 🔄 Add LangChain tool wrappers
4. 🔄 Implement cloud storage
5. 🔄 Add comprehensive tests
6. 🔄 Build Streamlit demo
7. 🔄 Optimize for GPU memory
8. 🔄 Add production features

---

**Remember**: This is a solid foundation. All TODO comments mark integration points where actual models go. The architecture supports your needs - just drop in the implementations!
