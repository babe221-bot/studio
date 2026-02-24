from fastapi import APIRouter, UploadFile, File, HTTPException
from app.models.schemas import CADResponse, ProcessingRequest
from app.services import cad_service
import os

router = APIRouter()

@router.post("/generate-drawing", response_model=CADResponse)
async def generate_technical_drawing(request: ProcessingRequest):
    """
    Generate technical drawing using CAD pipeline
    """
    try:
        result = await cad_service.generate_drawing(
            dimensions=request.dimensions,
            material=request.material,
            style=request.style
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/process-slab")
async def process_slab(file: UploadFile = File(...)):
    """
    Process uploaded slab design file
    """
    contents = await file.read()
    
    # Save temporary file
    temp_path = f"/tmp/{file.filename}"
    with open(temp_path, "wb") as f:
        f.write(contents)
    
    try:
        result = await cad_service.process_slab_file(temp_path)
        return result
    finally:
        # Cleanup
        if os.path.exists(temp_path):
            os.remove(temp_path)

@router.get("/materials")
async def list_materials():
    """Get available materials"""
    return await cad_service.get_materials()
