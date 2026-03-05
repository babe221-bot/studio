from fastapi import APIRouter, HTTPException
from app.services.ai_design_review import DesignAnalysisRequest, analyze_structural_limits, Warning

router = APIRouter()

@router.post("/analyze-design", response_model=list[Warning])
async def analyze_design(request: DesignAnalysisRequest):
    try:
        warnings = analyze_structural_limits(request)
        return warnings
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
