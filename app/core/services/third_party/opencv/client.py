import asyncio
import imghdr
from typing import List, Tuple

import numpy as np

from app.core.services.third_party.imaginary.operations import EditOperation

try:
    import cv2
except ImportError as exc:  # pragma: no cover - handled at runtime
    cv2 = None
    _cv_import_error = exc
else:
    _cv_import_error = None


class OpenCVClient:
    """Local image processor that mirrors Imaginary operations using OpenCV."""

    SUPPORTED_OPERATIONS = {
        "brightness",
        "contrast",
        "sharpness",
        "saturation",
        "exposure",
        "resize",
        "crop",
        "rotate",
        "flip",
        "flop",
        "blur",
        "convert",
    }

    def __init__(self, default_output_format: str = "png"):
        if cv2 is None:
            raise RuntimeError(
                "OpenCV is not installed. Please add opencv-python-headless to your environment."
            ) from _cv_import_error
        self.default_output_format = default_output_format

    async def apply(self, image_bytes: bytes, operations: List[EditOperation]) -> bytes:
        """Apply edit operations locally using OpenCV."""
        if not operations:
            raise ValueError("At least one edit operation must be provided")
        return await asyncio.to_thread(self._process_operations, image_bytes, operations)

    def _process_operations(self, image_bytes: bytes, operations: List[EditOperation]) -> bytes:
        image = self._decode_image(image_bytes)
        current_ext = self._infer_extension(image_bytes)

        for op in operations:
            image, current_ext = self._apply_operation(image, op, current_ext)

        return self._encode_image(image, current_ext)

    def _decode_image(self, image_bytes: bytes) -> np.ndarray:
        array = np.frombuffer(image_bytes, dtype=np.uint8)
        image = cv2.imdecode(array, cv2.IMREAD_UNCHANGED)
        if image is None:
            raise ValueError("Failed to decode image bytes for OpenCV processing")
        return image

    def _apply_operation(
        self,
        image: np.ndarray,
        operation: EditOperation,
        current_ext: str,
    ) -> Tuple[np.ndarray, str]:
        params = operation.params or {}
        op_type = operation.type

        if op_type not in self.SUPPORTED_OPERATIONS:
            raise ValueError(f"Operation '{op_type}' is not supported by the OpenCV backend.")

        if op_type == "resize":
            image = self._resize(image, params)
        elif op_type == "crop":
            image = self._crop(image, params)
        elif op_type == "rotate":
            image = self._rotate(image, params)
        elif op_type == "flip":
            image = cv2.flip(image, 0)
        elif op_type == "flop":
            image = cv2.flip(image, 1)
        elif op_type == "blur":
            image = self._blur(image, params)
        elif op_type == "brightness":
            image = self._adjust_brightness(image, params)
        elif op_type == "contrast":
            image = self._adjust_contrast(image, params)
        elif op_type == "saturation":
            image = self._adjust_saturation(image, params)
        elif op_type == "sharpness":
            image = self._adjust_sharpness(image, params)
        elif op_type == "exposure":
            image = self._adjust_exposure(image, params)
        elif op_type == "convert":
            current_ext = self._convert_extension(params, current_ext)

        return image, current_ext

    def _resize(self, image: np.ndarray, params: dict) -> np.ndarray:
        width = params.get("width")
        height = params.get("height")
        if width is None or height is None:
            raise ValueError("Resize operation requires both 'width' and 'height' parameters")
        return cv2.resize(image, (int(width), int(height)), interpolation=cv2.INTER_AREA)

    def _crop(self, image: np.ndarray, params: dict) -> np.ndarray:
        width = params.get("width")
        height = params.get("height")
        x = params.get("x", 0)
        y = params.get("y", 0)
        if width is None or height is None:
            raise ValueError("Crop operation requires 'width' and 'height' parameters")
        x, y, width, height = map(int, (x, y, width, height))
        return image[y : y + height, x : x + width]

    def _rotate(self, image: np.ndarray, params: dict) -> np.ndarray:
        angle = params.get("rotate") or params.get("angle")
        if angle is None:
            raise ValueError("Rotate operation requires 'rotate' or 'angle' parameter")
        angle = float(angle)
        (h, w) = image.shape[:2]
        center = (w / 2, h / 2)

        matrix = cv2.getRotationMatrix2D(center, angle, 1.0)
        cos = abs(matrix[0, 0])
        sin = abs(matrix[0, 1])

        new_w = int((h * sin) + (w * cos))
        new_h = int((h * cos) + (w * sin))

        matrix[0, 2] += (new_w / 2) - center[0]
        matrix[1, 2] += (new_h / 2) - center[1]

        return cv2.warpAffine(image, matrix, (new_w, new_h))

    def _blur(self, image: np.ndarray, params: dict) -> np.ndarray:
        sigma = params.get("sigma")
        if sigma is None:
            raise ValueError("Blur operation requires 'sigma' parameter")
        sigma = float(sigma)
        kernel = max(1, int(2 * round(sigma * 3) + 1))
        kernel = kernel + 1 if kernel % 2 == 0 else kernel
        return cv2.GaussianBlur(image, (kernel, kernel), sigmaX=sigma)

    def _adjust_brightness(self, image: np.ndarray, params: dict) -> np.ndarray:
        value = float(params.get("value", params.get("amount", 0)))
        beta = np.clip(value, -1.0, 1.0) * 100
        return cv2.convertScaleAbs(image, alpha=1.0, beta=beta)

    def _adjust_contrast(self, image: np.ndarray, params: dict) -> np.ndarray:
        value = float(params.get("value", params.get("amount", 0)))
        alpha = max(0.0, 1.0 + value)
        return cv2.convertScaleAbs(image, alpha=alpha, beta=0)

    def _adjust_saturation(self, image: np.ndarray, params: dict) -> np.ndarray:
        value = float(params.get("value", params.get("amount", 0)))
        factor = max(0.0, 1.0 + value)
        if image.shape[2] < 3:
            return image
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        hsv[:, :, 1] = np.clip(hsv[:, :, 1] * factor, 0, 255)
        return cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)

    def _adjust_sharpness(self, image: np.ndarray, params: dict) -> np.ndarray:
        value = float(params.get("value", params.get("amount", 0)))
        amount = np.clip(value, 0.0, 5.0)
        kernel = np.array(
            [
                [0, -1, 0],
                [-1, 5 + amount, -1],
                [0, -1, 0],
            ]
        )
        return cv2.filter2D(image, -1, kernel)

    def _adjust_exposure(self, image: np.ndarray, params: dict) -> np.ndarray:
        value = float(params.get("value", params.get("amount", 0)))
        gamma = max(0.1, 1.0 - value)
        inv_gamma = 1.0 / gamma
        table = np.array([(i / 255.0) ** inv_gamma * 255 for i in np.arange(0, 256)]).astype("uint8")
        return cv2.LUT(image, table)

    def _convert_extension(self, params: dict, current_ext: str) -> str:
        image_type = params.get("type")
        if not image_type:
            return current_ext
        image_type = image_type.lower().strip(".")
        return f".{image_type}"

    def _infer_extension(self, image_bytes: bytes) -> str:
        detected = imghdr.what(None, image_bytes)
        if detected in (None, "unknown"):
            return f".{self.default_output_format}"
        if detected == "jpeg":
            return ".jpg"
        return f".{detected}"

    def _encode_image(self, image: np.ndarray, extension: str) -> bytes:
        ext = extension if extension.startswith(".") else f".{extension}"
        success, buffer = cv2.imencode(ext, image)
        if not success:
            # Fallback to PNG encoding
            success, buffer = cv2.imencode(f".{self.default_output_format}", image)
        if not success:
            raise ValueError("Failed to encode image after OpenCV processing")
        return buffer.tobytes()

