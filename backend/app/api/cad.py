import os
import tempfile
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.schemas import CADResponse, ProcessingRequest
from app.services import cad_service
from app.services.database import get_db
import logging

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

router = APIRouter()


# ── AI-powered CAD Operations ─────────────────────────────────────────────────

class GeometryAnalysisRequest(BaseModel):
    """Request for geometry analysis."""
    dimensions: Dict[str, float]
    material: Optional[str] = None
    constraints: Optional[List[Dict[str, Any]]] = None


class LayoutOptimizationRequest(BaseModel):
    """Request for layout optimization."""
    slab_dimensions: Dict[str, float]
    items: List[Dict[str, Any]]
    kerf_width: float = 5.0  # mm


class AIAnalysisResponse(BaseModel):
    """Response for AI-powered analysis."""
    success: bool
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


@router.post("/ai/analyze_geometry", response_model=AIAnalysisResponse)
async def analyze_geometry(request: GeometryAnalysisRequest):
    """
    Analyze geometry for structural integrity and manufacturing constraints.
    Uses CAD service for calculations.
    """
    try:
        dims = request.dimensions
        logger.info(f"[CAD API] analyze_geometry called with dimensions: {dims}")
        
        result = {
            "area_cm2": dims.get("length", 0) * dims.get("width", 0),
            "perimeter_cm": 2 * (dims.get("length", 0) + dims.get("width", 0)),
            "volume_cm3": dims.get("length", 0) * dims.get("width", 0) * dims.get("height", 2),
            "aspect_ratio": dims.get("length", 1) / max(dims.get("width", 1), 1),
            "warnings": [],
            "recommendations": []
        }
        
        # Check for common issues
        if result["aspect_ratio"] > 4:
            result["warnings"].append({
                "severity": "warning",
                "message": "Visok omjer duljine i širine može uzrokovati probleme s transportom"
            })
        
        thickness = dims.get("height", 2)
        if thickness < 2:
            result["warnings"].append({
                "severity": "error",
                "message": "Debljina manja od 2 cm nije preporučena za radne površine"
            })
        elif thickness > 5:
            result["recommendations"].append({
                "description": "Deblje ploče zahtijevaju pojačanu konstrukciju nosača",
                "confidence": 0.9
            })
            
        logger.debug(f"[CAD API] Validation result generated")
        if result["warnings"]:
            logger.warning(f"[CAD API] Warnings generated: {result['warnings']}")
        
        return AIAnalysisResponse(success=True, result=result)
    except Exception as e:
        logger.error(f"[CAD API] Error in analyze_geometry: {str(e)}")
        return AIAnalysisResponse(success=False, error=str(e))


@router.post("/ai/optimize_layout", response_model=AIAnalysisResponse)
async def optimize_layout(request: LayoutOptimizationRequest):
    """
    Optimize cutting layout for multiple items on a slab.
    Returns positions and rotations for minimal waste.
    """
    try:
        slab_area = request.slab_dimensions.get("length", 300) * request.slab_dimensions.get("width", 200)
        
        # Simple greedy placement algorithm
        # In production, this would use a more sophisticated bin-packing algorithm
        positions = []
        current_x = 0
        current_y = 0
        row_height = 0
        
        for item in request.items:
            item_dims = item.get("dims", {})
            item_width = item_dims.get("width", 60)
            item_length = item_dims.get("length", 60)
            
            # Check if item fits in current row
            if current_x + item_width > request.slab_dimensions.get("width", 200):
                # Move to next row
                current_x = 0
                current_y += row_height + request.kerf_width
                row_height = 0
            
            positions.append({
                "itemId": item.get("id", "unknown"),
                "position": {"x": current_x, "y": current_y},
                "rotation": 0,
                "fits": current_y + item_length <= request.slab_dimensions.get("length", 300)
            })
            
            current_x += item_width + request.kerf_width
            row_height = max(row_height, item_length)
        
        used_area = sum(
            item.get("dims", {}).get("width", 60) * item.get("dims", {}).get("length", 60)
            for item in request.items
        )
        
        return AIAnalysisResponse(
            success=True,
            result={
                "layout": positions,
                "efficiency": round(used_area / slab_area * 100, 1) if slab_area > 0 else 0,
                "total_items": len(request.items),
                "fits_all": all(p["fits"] for p in positions)
            }
        )
    except Exception as e:
        return AIAnalysisResponse(success=False, error=str(e))


# ── Standard CAD Operations ───────────────────────────────────────────────────

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
async def list_materials(db: AsyncSession = Depends(get_db)):
    """Get available stone materials."""
    return await cad_service.get_materials(db)

@router.get("/finishes")
async def list_finishes(db: AsyncSession = Depends(get_db)):
    """Get available surface finishes."""
    return await cad_service.get_surface_finishes(db)

@router.get("/profiles")
async def list_profiles(db: AsyncSession = Depends(get_db)):
    """Get available edge profiles."""
    return await cad_service.get_edge_profiles(db)

@router.post("/render-3d")
async def render_3d(request: ProcessingRequest):
    """
    Generate photorealistic 3D renders using Blender.
    This is an expensive operation that runs headlessly.
    """
    # Create config dict for the service
    config = {
        "dims": {
            "length": request.dimensions.length,
            "width": request.dimensions.width,
            "height": request.dimensions.height
        },
        "material": {"name": request.material_name or "Granite"},
        "finish": {"name": request.surface_finish_name or "brushed"},
        "profile": {"name": request.edge_profile_name or "c8_chamfer"},
        "processedEdges": {edge: True for edge in request.processed_edges or []},
        "okapnikEdges": {edge: True for edge in request.okapnik_edges or []},
    }
    
    result = await cad_service.render_3d_simulation(config)
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error"))
    
    return result

@router.post("/export-glb")
async def export_glb(request: ProcessingRequest):
    """
    Generate a GLB 3D model for AR viewing.
    """
    config = {
        "dims": {
            "length": request.dimensions.length,
            "width": request.dimensions.width,
            "height": request.dimensions.height
        },
        "material": {"name": request.material_name or "Granite"},
        "finish": {"name": request.surface_finish_name or "brushed"},
        "profile": {"name": request.edge_profile_name or "c8_chamfer"},
        "processedEdges": {edge: True for edge in request.processed_edges or []},
        "okapnikEdges": {edge: True for edge in request.okapnik_edges or []},
    }
    
    # We call render_3d_simulation but with format="glb"
    result = await cad_service.render_3d_simulation(config, format="glb")
    
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error"))
    
    return result
