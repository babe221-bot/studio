from pydantic import BaseModel
from typing import Dict, Any, Optional


class Dimensions(BaseModel):
    length: float
    width: float
    height: float  # slab thickness in mm


class Material(BaseModel):
    name: str
    color: Optional[str] = "#f5f5dc"
    texture: Optional[str] = None


class Finish(BaseModel):
    name: str
    roughness: float = 0.1


class Profile(BaseModel):
    name: str
    radius: float = 0.0


class EdgeFlags(BaseModel):
    front: bool = False
    back: bool = False
    left: bool = False
    right: bool = False


class ProcessingRequest(BaseModel):
    """Full CAD config — matches params_example.json shape."""
    dims: Dimensions
    material: Material
    finish: Finish
    profile: Profile
    processedEdges: EdgeFlags = EdgeFlags()
    okapnikEdges: EdgeFlags = EdgeFlags()


class CADResponse(BaseModel):
    success: bool
    svg: Optional[str] = None       # base64-encoded SVG preview
    dxf_filename: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
