import os
import tempfile
import io
import struct
import numpy as np
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import StreamingResponse
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


# ── CAD Export Endpoints ───────────────────────────────────────────────────────

class ExportRequest(BaseModel):
    """Request for CAD export."""
    dimensions: Dict[str, float]
    material_name: Optional[str] = "Stone"
    surface_finish: Optional[str] = "polished"
    edge_profile: Optional[str] = "sharp"


def generate_box_mesh(length: float, width: float, height: float):
    """
    Generate vertices and faces for a simple box mesh.
    Dimensions in cm, convert to mm for CAD.
    """
    l, w, h = length * 10, width * 10, height * 10  # cm to mm
    
    # 8 vertices of a box
    vertices = np.array([
        [0, 0, 0],
        [l, 0, 0],
        [l, w, 0],
        [0, w, 0],
        [0, 0, h],
        [l, 0, h],
        [l, w, h],
        [0, w, h],
    ], dtype=np.float32)
    
    # 12 triangular faces (2 per side)
    faces = np.array([
        [0, 1, 2], [0, 2, 3],  # bottom
        [4, 6, 5], [4, 7, 6],  # top
        [0, 4, 5], [0, 5, 1],  # front
        [2, 6, 7], [2, 7, 3],  # back
        [0, 3, 7], [0, 7, 4],  # left
        [1, 5, 6], [1, 6, 2],  # right
    ], dtype=np.uint32)
    
    return vertices, faces


def generate_stl(vertices, faces) -> bytes:
    """Generate binary STL file."""
    header = b'Stone Studio CAD Export' + b'\x00' * (80 - len(b'Stone Studio CAD Export'))
    
    triangles = []
    for face in faces:
        v0, v1, v2 = vertices[face]
        normal = np.cross(v1 - v0, v2 - v0)
        normal = normal / (np.linalg.norm(normal) + 1e-10)
        
        triangle = struct.pack('<3f3f3f3f', 
            normal[0], normal[1], normal[2],
            v0[0], v0[1], v0[2],
            v1[0], v1[1], v1[2],
            v2[0], v2[1], v2[2],
            0  # attribute byte count
        )
        triangles.append(triangle)
    
    return header + struct.pack('<I', len(faces)) + b''.join(triangles)


def generate_obj(vertices, faces, material: str = "Stone") -> str:
    """Generate OBJ file with MTL support."""
    lines = [
        "# Stone Studio CAD Export",
        "# OBJ format",
        "",
        "mtllib materials.mtl",
        "",
    ]
    
    # Vertices
    for v in vertices:
        lines.append(f"v {v[0]:.4f} {v[1]:.4f} {v[2]:.4f}")
    
    lines.append("")
    
    # Faces (use material)
    lines.append("usemtl stone_material")
    for face in faces:
        lines.append(f"f {face[0]+1} {face[1]+1} {face[2]+1}")  # OBJ is 1-indexed
    
    return "\n".join(lines)


def generate_mtl(material_name: str) -> str:
    """Generate MTL file for material."""
    return f"""# Stone Studio Material
newmtl stone_material
Ka 0.8 0.8 0.8
Kd 0.7 0.7 0.7
Ks 0.3 0.3 0.3
Ns 50.0
d 1.0
"""


def generate_step(length: float, width: float, height: float, material: str) -> str:
    """
    Generate a basic STEP file (ISO 10303-21).
    This creates a simple rectangular cuboid representation.
    """
    l, w, h = length * 10, width * 10, height * 10  # mm
    
    # Simplified STEP file with a box representation
    step_content = f"""ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('Stone Studio Export'),'2.1');
FILE_NAME('slab_export.step','2026-03-09T00:00:00',('Stone Studio'),('Stone Studio'),'','','');
FILE_SCHEMA(('AUTOMOTIVE_DESIGN'));
ENDSEC;
DATA;
#10=CARTESIAN_POINT('',(0,0,0));
#11=CARTESIAN_POINT('',({l},0,0));
#12=CARTESIAN_POINT('',({l},{w},0));
#13=CARTESIAN_POINT('',(0,{w},0));
#14=CARTESIAN_POINT('',(0,0,{h}));
#15=CARTESIAN_POINT('',({l},0,{h}));
#16=CARTESIAN_POINT('',({l},{w},{h}));
#17=CARTESIAN_POINT('',(0,{w},{h}));
#20=DIRECTION('',(0,0,1));
#21=DIRECTION('',(0,1,0));
#22=DIRECTION('',(1,0,0));
#30=AXIS2_PLACEMENT_3D('',#10,#20,#22);
#40=MANIFOLD_SOLID_BREP('Slab',#100);
#100=CLOSED_SHELL('',(#101));
#101=ADVANCED_FACE('',(#110),#30,.T.);
#110=FACE_BOUND('',#111,.T.);
#111=EDGE_LOOP('',(#120,#121,#122,#123));
#120=EDGE_CURVE('',#200,#201,#210,.T.);
#121=EDGE_CURVE('',#201,#202,#220,.T.);
#122=EDGE_CURVE('',#202,#203,#230,.T.);
#123=EDGE_CURVE('',#203,#200,#240,.T.);
#200=VERTEX_POINT('',#10);
#201=VERTEX_POINT('',#11);
#202=VERTEX_POINT('',#12);
#203=VERTEX_POINT('',#13);
#210=LINE('',#10,#22);
#220=LINE('',#11,#21);
#230=LINE('',#12,#22);
#240=LINE('',#13,#21);
#999=PRODUCT('{material}','','',(#1000));
#1000=PRODUCT_CONTEXT('',#999,'mechanical');
#1001=PRODUCT_DEFINITION_FORMATION('','',#999);
#1002=PRODUCT_DEFINITION('','',#1001);
ENDSEC;
ENDISO-10303-21;
"""
    return step_content


@router.post("/export/stl")
async def export_stl(request: ExportRequest):
    """
    Export configuration as STL (Stereolithography) file.
    Returns binary STL format.
    """
    logger.info(f"[CAD API] STL export requested for: {request.dimensions}")
    
    dims = request.dimensions
    vertices, faces = generate_box_mesh(
        dims.get("length", 100),
        dims.get("width", 60),
        dims.get("height", 3)
    )
    
    stl_data = generate_stl(vertices, faces)
    
    return StreamingResponse(
        io.BytesIO(stl_data),
        media_type="application/octet-stream",
        headers={"Content-Disposition": f"attachment; filename=slab_{dims.get('length', 100)}x{dims.get('width', 60)}.stl"}
    )


@router.post("/export/obj")
async def export_obj(request: ExportRequest):
    """
    Export configuration as OBJ file with MTL material.
    """
    logger.info(f"[CAD API] OBJ export requested for: {request.dimensions}")
    
    dims = request.dimensions
    vertices, faces = generate_box_mesh(
        dims.get("length", 100),
        dims.get("width", 60),
        dims.get("height", 3)
    )
    
    obj_data = generate_obj(vertices, faces, request.material_name or "Stone")
    mtl_data = generate_mtl(request.material_name or "Stone")
    
    # Return OBJ with MTL inline for simplicity
    obj_with_mtl = obj_data + "\n\n" + mtl_data
    
    return StreamingResponse(
        io.BytesIO(obj_with_mtl.encode()),
        media_type="model/obj",
        headers={"Content-Disposition": f"attachment; filename=slab_{dims.get('length', 100)}x{dims.get('width', 60)}.obj"}
    )


@router.post("/export/step")
async def export_step(request: ExportRequest):
    """
    Export configuration as STEP file (ISO 10303-21).
    Returns STEP format for CAD software.
    """
    logger.info(f"[CAD API] STEP export requested for: {request.dimensions}")
    
    dims = request.dimensions
    step_data = generate_step(
        dims.get("length", 100),
        dims.get("width", 60),
        dims.get("height", 3),
        request.material_name or "Stone"
    )
    
    return StreamingResponse(
        io.BytesIO(step_data.encode()),
        media_type="application/step",
        headers={"Content-Disposition": f"attachment; filename=slab_{dims.get('length', 100)}x{dims.get('width', 60)}.step"}
    )


@router.get("/export/formats")
async def list_export_formats():
    """List available export formats."""
    return {
        "formats": [
            {"id": "stl", "name": "STL", "description": "Stereolithography - 3D printing"},
            {"id": "obj", "name": "OBJ", "description": "Wavefront - CAD/CAM software"},
            {"id": "step", "name": "STEP", "description": "ISO 10303 - Industrial CAD exchange"},
            {"id": "glb", "name": "GLB", "description": "glTF Binary - Web/AR"},
        ]
    }
