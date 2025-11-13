from fastapi import APIRouter, HTTPException
from app.core.models.schemas import EditRequest, WorkflowResponse
from app.core.services.third_party.imaginary import ImaginaryClient, EditOperation
from app.core.services.app.storage_service import StorageService
from app.orchestration.orchestrator.general_edit_orchestrator import GeneralEditOrchestrator
from app.orchestration.application.config import get_settings

router = APIRouter(prefix="/edit", tags=["general-edit"])


@router.post("/general", response_model=WorkflowResponse)
async def general_edit(request: EditRequest):
    """General editing workflow endpoint."""

    try:
        # Get settings for Imaginary configuration
        settings = get_settings()
        
        # Convert Pydantic -> internal operation model
        operations = [
            EditOperation(**op.model_dump())
            for op in request.operations
        ]

        # Create storage service and Imaginary client + orchestrator
        storage_service = StorageService()
        imaginary = ImaginaryClient(
            base_url=settings.imaginary_base_url,
            timeout=settings.imaginary_timeout,
            storage_service=storage_service  # Pass storage for intermediate results
        )
        orchestrator = GeneralEditOrchestrator(imaginary_client=imaginary)

        # Run workflow
        # Convert Pydantic HttpUrl to string
        result = await orchestrator.run(
            image_url=str(request.image_url),
            operations=operations,
        )

        # Map orchestrator response to WorkflowResponse schema
        from app.core.models.schemas import JobStatus
        
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
