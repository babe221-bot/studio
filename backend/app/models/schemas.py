from pydantic import BaseModel
from typing import Dict, Any, Optional


import datetime

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
    grainOffset: Dict[str, float] = {"x": 0.0, "y": 0.0}
    grainRotation: float = 0.0
    mirrorGrain: bool = False


class CADResponse(BaseModel):
    success: bool
    svg: Optional[str] = None       # base64-encoded SVG preview
    dxf_filename: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class AdminAuditLogCreate(BaseModel):
    admin_id: str
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    request_id: Optional[str] = None


class AdminAuditLogResponse(AdminAuditLogCreate):
    id: int
    created_at: datetime.datetime

    class Config:
        from_attributes = True


class AdminWidgetCreate(BaseModel):
    title: str
    metric_type: str
    chart_type: str
    config: Optional[str] = "{}"


class AdminWidgetResponse(AdminWidgetCreate):
    id: int
    admin_id: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True
