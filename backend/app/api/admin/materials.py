from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.services.database import get_db
from app.models.domain import MaterialDB
from pydantic import BaseModel
from typing import List

router = APIRouter()

class MaterialResponse(BaseModel):
    id: int
    name: str
    inventory_count: int
    is_active: bool

class MaterialUpdate(BaseModel):
    name: str | None
    inventory_count: int | None
    is_active: bool | None

def is_admin(user_id: str = "admin_user"): # Placeholder
    if user_id != "admin_user":
        raise HTTPException(status_code=403, detail="Not authorized")
    return True

@router.get("/materials", response_model=List[MaterialResponse], dependencies=[Depends(is_admin)])
async def list_materials(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MaterialDB).offset(skip).limit(limit))
    materials = result.scalars().all()
    return materials

@router.put("/materials/{material_id}", response_model=MaterialResponse, dependencies=[Depends(is_admin)])
async def update_material(material_id: int, material_update: MaterialUpdate, db: AsyncSession = Depends(get_db)):
    update_data = material_update.dict(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
        
    await db.execute(
        update(MaterialDB)
        .where(MaterialDB.id == material_id)
        .values(**update_data)
    )
    await db.commit()

    result = await db.execute(select(MaterialDB).where(MaterialDB.id == material_id))
    updated_material = result.scalar_one_or_none()
    if not updated_material:
        raise HTTPException(status_code=404, detail="Material not found")

    return updated_material
