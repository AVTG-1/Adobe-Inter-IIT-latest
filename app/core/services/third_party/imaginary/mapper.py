import json
from urllib.parse import quote_plus
from typing import Any, Dict

from .operations import EditOperation


class ImaginaryOperationMapper:
    """Maps EditOperation objects to Imaginary API endpoint URLs."""

    ENDPOINTS: Dict[str, str] = {
        "info": "/info",
        "crop": "/crop",
        "smartcrop": "/smartcrop",
        "resize": "/resize",
        "enlarge": "/enlarge",
        "extract": "/extract",
        "zoom": "/zoom",
        "thumbnail": "/thumbnail",
        "fit": "/fit",
        "rotate": "/rotate",
        "autorotate": "/autorotate",
        "flip": "/flip",
        "flop": "/flop",
        "convert": "/convert",
        "pipeline": "/pipeline",
        "watermark": "/watermark",
        "watermarkimage": "/watermarkimage",
        "blur": "/blur",
    }

    LEGACY_TYPE_ALIASES = {
        "watermark_image": "watermarkimage",
    }

    PIPELINE_OPERATION_NAMES = {
        "crop": "crop",
        "smartcrop": "smartcrop",
        "resize": "resize",
        "enlarge": "enlarge",
        "extract": "extract",
        "zoom": "zoom",
        "thumbnail": "thumbnail",
        "rotate": "rotate",
        "autorotate": "autorotate",
        "flip": "flip",
        "flop": "flop",
        "convert": "convert",
        "watermark": "watermark",
        "watermarkimage": "watermarkImage",
        "blur": "blur",
    }

    PIPELINE_MAX_OPERATIONS = 10

    @classmethod
    def map_operation(cls, op: EditOperation, image_url: str) -> str:
        """Return Imaginary API endpoint path with query parameters."""
        op_type = cls.LEGACY_TYPE_ALIASES.get(op.type, op.type)
        endpoint = cls.ENDPOINTS.get(op_type)
        if not endpoint:
            raise ValueError(
                f"Unsupported edit operation '{op.type}'. "
                f"Supported operations: {', '.join(sorted(cls.ENDPOINTS.keys()))}"
            )

        query_params: Dict[str, Any] = {"url": image_url}

        for key, value in (op.params or {}).items():
            if value is None:
                continue
            if key == "url":
                # URL is managed by the orchestrator to avoid SSRF vectors.
                continue
            query_params[key] = value

        query_string = cls._build_query_string(query_params)
        return f"{endpoint}?{query_string}"

    @classmethod
    def can_use_pipeline(cls, operations: Any) -> bool:
        """Return True if all operations can be combined into a pipeline call."""
        if not operations:
            return False
        if len(operations) > cls.PIPELINE_MAX_OPERATIONS:
            return False

        for op in operations:
            op_type = cls.LEGACY_TYPE_ALIASES.get(op.type, op.type)
            if op_type not in cls.PIPELINE_OPERATION_NAMES:
                return False
        return True

    @classmethod
    def map_pipeline(cls, operations: Any, image_url: str) -> str:
        """Return Imaginary pipeline endpoint URL for the provided operations."""
        pipeline_ops = []
        for op in operations:
            op_type = cls.LEGACY_TYPE_ALIASES.get(op.type, op.type)
            operation_name = cls.PIPELINE_OPERATION_NAMES[op_type]
            params = {}
            for key, value in (op.params or {}).items():
                if key == "url" or value is None:
                    continue
                params[key] = value

            pipeline_ops.append(
                {
                    "operation": operation_name,
                    "params": params,
                }
            )

        query = cls._build_query_string(
            {
                "url": image_url,
                "operations": json.dumps(pipeline_ops, separators=(",", ":")),
            }
        )
        return f"/pipeline?{query}"

    @staticmethod
    def _build_query_string(params: Dict[str, Any]) -> str:
        pairs = []
        for key, value in params.items():
            serialized_value = ImaginaryOperationMapper._serialize_value(value)
            pairs.append(
                f"{quote_plus(str(key))}={quote_plus(serialized_value)}"
            )
        return "&".join(pairs)

    @staticmethod
    def _serialize_value(value: Any) -> str:
        if isinstance(value, bool):
            return "true" if value else "false"
        if isinstance(value, (dict, list)):
            return json.dumps(value, separators=(",", ":"))
        return str(value)
