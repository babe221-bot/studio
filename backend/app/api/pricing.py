from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.database import get_db
from app.services.pricing_service import PriceCalculationRequest, PriceCalculationResponse, calculate_price

router = APIRouter()

@router.post("/calculate", response_model=PriceCalculationResponse)
async def calculate_order_price(
    request: PriceCalculationRequest,
    db: AsyncSession = Depends(get_db)
):
    try:
        return await calculate_price(request, db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error during calculation")
