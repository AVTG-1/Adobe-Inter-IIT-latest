from fastapi import APIRouter, HTTPException
from app.core.models.schemas import EditRequest, WorkflowResponse, EditService, JobStatus
from app.core.services.third_party.imaginary import ImaginaryClient, EditOperation
from app.core.services.third_party.opencv import OpenCVClient
from app.core.services.app.storage_service import StorageService
from app.orchestration.orchestrator.general_edit_orchestrator import GeneralEditOrchestrator
from app.orchestration.application.config import get_settings

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