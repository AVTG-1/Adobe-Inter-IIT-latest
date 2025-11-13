"""Pydantic models for API request/response validation."""

from datetime import datetime
from typing import List, Optional
from enum import Enum

from pydantic import BaseModel, Field, HttpUrl


class JobStatus(str, Enum):
    """Job processing status."""
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class MaskCoordinates(BaseModel):
    """Coordinates for image masking."""
    x: int = Field(..., ge=0, description="X coordinate of top-left corner")
    y: int = Field(..., ge=0, description="Y coordinate of top-left corner")
    width: int = Field(..., gt=0, description="Mask width")
    height: int = Field(..., gt=0, description="Mask height")


class InpaintRequest(BaseModel):
    """Request schema for inpainting workflow."""
    image_url: HttpUrl = Field(..., description="URL of input image")
    prompt: str = Field(..., min_length=1, max_length=500, description="Editing instruction")
    mask_coordinates: Optional[MaskCoordinates] = Field(None, description="Region to inpaint")


class RelightRequest(BaseModel):
    """Request schema for relighting workflow."""
    image_url: HttpUrl = Field(..., description="URL of input image")
    prompt: str = Field(..., min_length=1, max_length=500, description="Lighting instruction")
    intensity: float = Field(0.5, ge=0.0, le=1.0, description="Effect intensity")


class EditOperationSchema(BaseModel):
    """Schema for edit operation."""
    type: str = Field(..., description="Operation type")
    value: Optional[float] = Field(None, description="Operation value")
    x: Optional[int] = Field(None, description="X coordinate")
    y: Optional[int] = Field(None, description="Y coordinate")
    width: Optional[int] = Field(None, description="Width")
    height: Optional[int] = Field(None, description="Height")
    angle: Optional[int] = Field(None, description="Angle")


class EditRequest(BaseModel):
    """Request schema for general editing workflow."""
    image_url: HttpUrl = Field(..., description="URL of input image")
    operations: List[EditOperationSchema] = Field(..., min_length=1, description="List of edit operations to apply")


class WorkflowResponse(BaseModel):
    """Response schema for all workflows."""
    job_id: str = Field(..., description="Unique job identifier")
    status: JobStatus = Field(..., description="Job status")
    result_url: Optional[str] = Field(None, description="URL of edited image")
    agent_thoughts: List[str] = Field(default_factory=list, description="Agent reasoning steps")
    processing_time_ms: Optional[int] = Field(None, description="Processing duration in milliseconds")
    error: Optional[str] = Field(None, description="Error message if failed")


class HealthResponse(BaseModel):
    """Health check response."""
    status: str = Field(..., description="Service status")
    version: str = Field(..., description="API version")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Current timestamp")
