from pydantic import BaseModel
from typing import Literal, Optional


class EditOperation(BaseModel):
    type: Literal[
        "brightness",
        "contrast",
        "sharpness",
        "saturation",
        "crop",
        "resize",
        "rotate",
        "blur",
        "exposure",
    ]

    value: Optional[float] = None
    x: Optional[int] = None
    y: Optional[int] = None
    width: Optional[int] = None
    height: Optional[int] = None
    angle: Optional[int] = None
