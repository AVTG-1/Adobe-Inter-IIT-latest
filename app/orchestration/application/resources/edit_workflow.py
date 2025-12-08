from fastapi import APIRouter, HTTPException
from app.core.models.schemas import (
    EditRequest, WorkflowResponse, EditService, JobStatus,
    PoseRequest, PoseResponse
)
from app.core.services.third_party.imaginary import ImaginaryClient, EditOperation
from app.core.services.third_party.opencv import OpenCVClient
from app.core.services.app.storage_service import StorageService
from app.orchestration.orchestrator.general_edit_orchestrator import GeneralEditOrchestrator
from app.orchestration.application.config import get_settings
import uuid
import time
from PIL import Image
import requests
from io import BytesIO

router = APIRouter(prefix="/edit", tags=["general-edit"])


@router.post("/general", response_model=WorkflowResponse)
async def general_edit(request: EditRequest):
    """General editing workflow endpoint."""
    print("Received general edit request")

    try:
        # Get settings for Imaginary configuration
        settings = get_settings()
        print(request)
        
        # Convert Pydantic -> internal operation model
        legacy_field_aliases = {
            "angle": "rotate",
        }
        operations = []
        requires_opencv = False
        print(request.operations)
        for op in request.operations:
            op_data = op.model_dump()
            print( op_data)
            params = dict(op_data.get("params") or {})
            for field in ("value", "x", "y", "width", "height", "angle"):
                value = op_data.get(field)
                if value is None:
                    continue
                param_key = legacy_field_aliases.get(field, field)
                params.setdefault(param_key, value)

            use_service = op_data.get("use_service") or EditService.IMAGINARY
            if use_service == EditService.OPENCV:
                requires_opencv = True

            print("adding params to operation:", params)
            operations.append(
                (use_service, EditOperation(type=op_data["type"], params=params))
            )

        # Create storage service and processing clients
        storage_service = StorageService()
        imaginary = ImaginaryClient(
            base_url=settings.imaginary_base_url,
            timeout=settings.imaginary_timeout,
            storage_service=storage_service  # Pass storage for intermediate results
        )
        opencv_client = None
        if requires_opencv:
            try:
                opencv_client = OpenCVClient()
            except RuntimeError as exc:
                print("Error initializing OpenCVClient:", exc)
                raise HTTPException(status_code=500, detail=str(exc))

        orchestrator = GeneralEditOrchestrator(
            imaginary_client=imaginary,
            storage_service=storage_service,
            opencv_client=opencv_client,
        )

        # Run workflow
        # Convert Pydantic HttpUrl to string
        print("Running orchestrator with operations:", operations)
        result = await orchestrator.run(
            image_url=str(request.image_url),
            operations=operations,
        )

        # Map orchestrator response to WorkflowResponse schema
        # Convert status string to JobStatus enum
        status_map = {
            "SUCCESS": JobStatus.COMPLETED,
            "FAILED": JobStatus.FAILED,
            "PROCESSING": JobStatus.PROCESSING,
        }
        
        workflow_response = WorkflowResponse(
            job_id=result.get("job_id", ""),
            status=status_map.get(result.get("status", "FAILED"), JobStatus.FAILED),
            result_url=result.get("result_url"),
            agent_thoughts=[result.get("reasoning", "")] if result.get("reasoning") else [],
            processing_time_ms=result.get("processing_time_ms"),
            error=result.get("error"),
        )
        
        return workflow_response

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/pose", response_model=PoseResponse)
async def pose_change(request: PoseRequest):
    """
    Pose change workflow endpoint.
    Detects pose from source image and applies target keypoints.
    """
    print("Received pose change request")

    try:
        start_time = time.time()
        job_id = f"pose-job-{uuid.uuid4().hex[:12]}"

        agent_thoughts = [
            "🎯 Pose change workflow initiated",
            f"📥 Loading image from: {request.image_url}",
        ]

        # Download the image
        try:
            response = requests.get(str(request.image_url), timeout=30)
            response.raise_for_status()
            source_image = Image.open(BytesIO(response.content))
            agent_thoughts.append("✅ Image loaded successfully")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to load image: {str(e)}")

        # Import pose detector
        try:
            from app.core.services.third_party.repositioning.scripts.dwpose_detector import PoseDetectorWrapper

            # Initialize pose detector
            pose_detector = PoseDetectorWrapper(device="cuda")
            agent_thoughts.append("✅ DWPose detector initialized")
        except Exception as e:
            agent_thoughts.append(f"⚠️ Using mock detector: {str(e)}")
            from app.core.services.third_party.repositioning.scripts.dwpose_detector import PoseDetectorWrapper
            pose_detector = PoseDetectorWrapper(device="cpu")

        # Detect pose from source image
        agent_thoughts.append("🔍 Detecting pose in source image...")
        pose_map, detected_keypoints = pose_detector.detect_pose(source_image)
        agent_thoughts.append(f"✅ Detected {len(detected_keypoints['keypoints'])} keypoints")

        # Convert request keypoints to dict format
        target_keypoints_dict = {
            'keypoints': [kpt.model_dump() for kpt in request.keypoints],
            'bbox': [0.25, 0.1, 0.5, 0.8],  # Default bbox
            'score': 0.9
        }

        # Apply pose transformation
        agent_thoughts.append("🎨 Applying pose transformation using PCDM...")
        result_image = pose_detector.apply_pose_transformation(
            source_image=source_image,
            source_keypoints=detected_keypoints,
            target_keypoints=target_keypoints_dict,
            prompt=request.prompt or ""
        )
        agent_thoughts.append("✅ Pose transformation complete")

        # Save result image
        storage_service = StorageService()
        result_filename = f"pose_result_{job_id}.png"

        # Convert PIL image to bytes
        img_byte_arr = BytesIO()
        result_image.save(img_byte_arr, format='PNG')
        img_byte_arr.seek(0)

        # Upload to storage
        result_url = await storage_service.upload_file_async(
            file_content=img_byte_arr.read(),
            filename=result_filename
        )
        agent_thoughts.append(f"💾 Result saved: {result_url}")

        # Calculate processing time
        processing_time_ms = int((time.time() - start_time) * 1000)

        # Convert detected keypoints to PoseKeypoint schema
        from app.core.models.schemas import PoseKeypoint
        detected_kpts_schema = [
            PoseKeypoint(**kpt) for kpt in detected_keypoints['keypoints']
        ]

        return PoseResponse(
            job_id=job_id,
            status=JobStatus.COMPLETED,
            result_url=result_url,
            detected_keypoints=detected_kpts_schema,
            agent_thoughts=agent_thoughts,
            processing_time_ms=processing_time_ms,
        )

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()

        return PoseResponse(
            job_id=f"pose-job-{uuid.uuid4().hex[:12]}",
            status=JobStatus.FAILED,
            agent_thoughts=[
                "❌ Pose change workflow failed",
                f"Error: {str(e)}"
            ],
            error=str(e),
        )