from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from app.services.database import get_db
from app.models.domain import UserProfileDB
from pydantic import BaseModel
from typing import List

router = APIRouter()

class UserResponse(BaseModel):
    id: str
    full_name: str | None
    role: str
    is_active: bool

class UserUpdate(BaseModel):
    full_name: str | None
    role: str | None
    is_active: bool | None

# This is a placeholder for a real RBAC dependency
def is_admin(user_id: str = "admin_user"): # Replace with real auth
    if user_id != "admin_user":
        raise HTTPException(status_code=403, detail="Not authorized")
    return True

@router.get("/users", response_model=List[UserResponse], dependencies=[Depends(is_admin)])
async def list_users(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UserProfileDB).offset(skip).limit(limit))
    users = result.scalars().all()
    return users

@router.put("/users/{user_id}", response_model=UserResponse, dependencies=[Depends(is_admin)])
async def update_user(user_id: str, user_update: UserUpdate, db: AsyncSession = Depends(get_db)):
    update_data = user_update.dict(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
        
    await db.execute(
        update(UserProfileDB)
        .where(UserProfileDB.id == user_id)
        .values(**update_data)
    )
    await db.commit()

    result = await db.execute(select(UserProfileDB).where(UserProfileDB.id == user_id))
    updated_user = result.scalar_one_or_none()

    if not updated_user:
        raise HTTPException(status_code=404, detail="User not found")

    return updated_user

@router.delete("/users/{user_id}", dependencies=[Depends(is_admin)])
async def delete_user(user_id: str, db: AsyncSession = Depends(get_db)):
    # Soft delete by setting is_active to false
    await db.execute(
        update(UserProfileDB)
        .where(UserProfileDB.id == user_id)
        .values(is_active=False)
    )
    await db.commit()
    return {"message": "User deactivated"}
