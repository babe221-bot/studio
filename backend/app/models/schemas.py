from pydantic import BaseModel
from typing import Dict, Any, Optional

class Dimensions(BaseModel):
    width: float
    height: float
    thickness: float

class ProcessingRequest(BaseModel):
    dimensions: Dimensions
    material: str
    style: str

class CADResponse(BaseModel):
    success: bool
    url: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
