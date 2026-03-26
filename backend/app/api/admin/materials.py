import json
from typing import List

from app.models.domain import AdminAuditLogDB, MaterialDB, UserProfileDB
from app.services.auth_utils import get_current_admin_user
from app.services.database import get_db
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


class MaterialResponse(BaseModel):
    id: int
    name: str
    inventory_count: int
    is_active: bool


class MaterialUpdate(BaseModel):
    name: str | None = None
    inventory_count: int | None = None
    is_active: bool | None = None


@router.get(
    "/materials",
    response_model=List[MaterialResponse],
    dependencies=[Depends(get_current_admin_user)],
)
async def list_materials(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(MaterialDB).offset(skip).limit(limit))
    materials = result.scalars().all()
    return materials


@router.put("/materials/{material_id}", response_model=MaterialResponse)
async def update_material(
    material_id: int,
    material_update: MaterialUpdate,
    db: AsyncSession = Depends(get_db),
    admin_user: UserProfileDB = Depends(get_current_admin_user),
):
    # Fetch old value
    old_result = await db.execute(
        select(MaterialDB).where(MaterialDB.id == material_id)
    )
    old_material = old_result.scalar_one_or_none()
    if not old_material:
        raise HTTPException(status_code=404, detail="Material not found")

    old_data = {
        "name": old_material.name,
        "inventory_count": old_material.inventory_count,
        "is_active": old_material.is_active,
    }

    update_data = material_update.dict(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")

    await db.execute(
        update(MaterialDB).where(MaterialDB.id == material_id).values(**update_data)
    )

    # Log audit
    audit_log = AdminAuditLogDB(
        admin_id=str(admin_user.id),
        action="UPDATE_MATERIAL",
        resource_type="material",
        resource_id=str(material_id),
        old_value=json.dumps(old_data),
        new_value=json.dumps(update_data),
    )
    db.add(audit_log)

    await db.commit()

    # Re-fetch for response
    result = await db.execute(select(MaterialDB).where(MaterialDB.id == material_id))
    updated_material = result.scalar_one_or_none()

    return updated_material
