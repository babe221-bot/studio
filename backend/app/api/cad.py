import os
import tempfile
from fastapi import APIRouter, UploadFile, File, HTTPException

from app.models.schemas import CADResponse, ProcessingRequest
from app.services import cad_service

router = APIRouter()


@router.post("/generate-drawing", response_model=CADResponse)
async def generate_technical_drawing(request: ProcessingRequest):
    """
    Generate DXF + SVG from a full slab configuration.
    Returns base64-encoded SVG for immediate preview.
    """
    config = request.model_dump()
    result = await cad_service.generate_drawing(config)
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "CAD generation failed"))
    return CADResponse(**result)


@router.post("/process-slab", response_model=CADResponse)
async def process_slab(file: UploadFile = File(...)):
    """
    Accept a JSON params file and process it through the CAD pipeline.
    """
    contents = await file.read()

    # Windows-safe temp file (avoid hardcoded /tmp/)
    fd, tmp_path = tempfile.mkstemp(suffix=".json", prefix="slab_upload_")
    try:
        with os.fdopen(fd, "wb") as fh:
            fh.write(contents)
        result = await cad_service.process_slab_file(tmp_path)
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "Processing failed"))
    return CADResponse(**result)


@router.get("/materials")
async def list_materials():
    """Get available stone materials."""
    return await cad_service.get_materials()
