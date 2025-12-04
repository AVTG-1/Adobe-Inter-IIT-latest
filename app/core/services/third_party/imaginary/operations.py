from typing import Any, Dict, Literal

from pydantic import BaseModel, Field


class EditOperation(BaseModel):
    """Internal representation of a single Imaginary edit operation."""

    type: Literal[
        "brightness",
        "contrast",
        "sharpness",
        "saturation",
        "exposure",
        "info",
        "crop",
        "smartcrop",
        "resize",
        "enlarge",
        "extract",
        "zoom",
        "thumbnail",
        "fit",
        "rotate",
        "autorotate",
        "flip",
        "flop",
        "convert",
        "pipeline",
        "watermark",
        "watermarkimage",
        "blur",
    ]
    params: Dict[str, Any] = Field(default_factory=dict)
