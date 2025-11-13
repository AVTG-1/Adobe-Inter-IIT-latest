"""Health check endpoint."""

from datetime import datetime

from fastapi import APIRouter, Depends

from app.orchestration.application.config import Settings, get_settings
from app.core.models import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health_check(
    settings: Settings = Depends(get_settings)
) -> HealthResponse:
    """Health check endpoint.
    
    Returns:
        Health status and version information
    """
    return HealthResponse(
        status="healthy",
        version=settings.app_version,
        timestamp=datetime.utcnow()
    )
