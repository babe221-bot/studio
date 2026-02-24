from fastapi import APIRouter

router = APIRouter()

@router.get("/status")
async def data_status():
    """
    Status of the data processing service
    """
    return {"status": "operational"}
