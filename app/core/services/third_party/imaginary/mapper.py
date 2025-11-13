from urllib.parse import quote_plus
from .operations import EditOperation


class ImaginaryOperationMapper:
    """Maps EditOperation objects to Imaginary API endpoint URLs.
    
    Imaginary API format: /operation?url=<encoded_url>&param=value
    """

    @staticmethod
    def map_operation(op: EditOperation, image_url: str) -> str:
        """Return Imaginary API endpoint path with query parameters.
        
        Args:
            op: Edit operation to perform
            image_url: URL of the image (will be URL-encoded)
            
        Returns:
            API endpoint path with query string (e.g., "/brightness?url=...&amount=0.5")
        """
        # URL-encode the image URL to handle special characters
        encoded_url = quote_plus(image_url)
        base = f"?url={encoded_url}"

        if op.type == "brightness":
            # Imaginary doesn't support brightness/contrast directly
            # These operations are not available in Imaginary
            raise ValueError(
                "Brightness operation is not supported by Imaginary API. "
                "Supported operations: resize, crop, rotate, blur"
            )

        if op.type == "contrast":
            # Imaginary doesn't support contrast
            raise ValueError(
                "Contrast operation is not supported by Imaginary API. "
                "Supported operations: resize, crop, rotate, blur"
            )

        if op.type == "sharpness":
            # Imaginary doesn't support sharpen
            raise ValueError(
                "Sharpness operation is not supported by Imaginary API. "
                "Supported operations: resize, crop, rotate, blur"
            )

        if op.type == "saturation":
            # Imaginary doesn't support saturation
            raise ValueError(
                "Saturation operation is not supported by Imaginary API. "
                "Supported operations: resize, crop, rotate, blur"
            )

        if op.type == "exposure":
            # Imaginary doesn't support exposure
            raise ValueError(
                "Exposure operation is not supported by Imaginary API. "
                "Supported operations: resize, crop, rotate, blur"
            )

        if op.type == "blur":
            if op.value is None:
                raise ValueError("Blur operation requires 'value' parameter (sigma)")
            return f"/blur{base}&sigma={op.value}"

        if op.type == "crop":
            if op.width is None or op.height is None or op.x is None or op.y is None:
                raise ValueError("Crop operation requires 'width', 'height', 'x', and 'y' parameters")
            return (
                f"/crop{base}&width={op.width}&height={op.height}"
                f"&x={op.x}&y={op.y}"
            )

        if op.type == "resize":
            if op.width is None or op.height is None:
                raise ValueError("Resize operation requires 'width' and 'height' parameters")
            return f"/resize{base}&width={op.width}&height={op.height}"

        if op.type == "rotate":
            if op.angle is None:
                raise ValueError("Rotate operation requires 'angle' parameter")
            # Imaginary uses 'rotate' parameter, not 'angle'
            return f"/rotate{base}&rotate={op.angle}"

        raise ValueError(f"Unsupported edit operation: {op.type}")
