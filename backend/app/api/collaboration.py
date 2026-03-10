from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.services.database import get_db
from app.models.domain import ConfigurationDB, ConfigCollaboratorDB, ConfigLockDB
from app.models.schemas import CADResponse # Use a generic response or create new one
from pydantic import BaseModel
import uuid

router = APIRouter()

class InviteRequest(BaseModel):
    user_id: str
    permission: str = "view"

class InviteResponse(BaseModel):
    success: bool
    message: str

class LockRequest(BaseModel):
    field: str
    client_id: str

class LockResponse(BaseModel):
    success: bool
    acquired: bool
    current_holder: str | None = None

@router.post("/{config_id}/lock", response_model=LockResponse)
async def acquire_lock(
    config_id: str,
    lock: LockRequest,
    db: AsyncSession = Depends(get_db)
):
    # Check if lock already exists
    result = await db.execute(
        select(ConfigLockDB).where(
            ConfigLockDB.config_id == config_id,
            ConfigLockDB.field == lock.field
        )
    )
    existing = result.scalar_one_or_none()
    
    if existing:
        if existing.client_id == lock.client_id:
            return LockResponse(success=True, acquired=True, current_holder=lock.client_id)
        else:
            return LockResponse(success=True, acquired=False, current_holder=existing.client_id)
            
    # Create new lock
    new_lock = ConfigLockDB(
        config_id=config_id,
        field=lock.field,
        client_id=lock.client_id
    )
    db.add(new_lock)
    await db.commit()
    
    return LockResponse(success=True, acquired=True, current_holder=lock.client_id)

@router.delete("/{config_id}/lock/{field}")
async def release_lock(
    config_id: str,
    field: str,
    client_id: str,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ConfigLockDB).where(
            ConfigLockDB.config_id == config_id,
            ConfigLockDB.field == field,
            ConfigLockDB.client_id == client_id
        )
    )
    lock = result.scalar_one_or_none()
    
    if lock:
        await db.delete(lock)
        await db.commit()
        return {"success": True}
    else:
        return {"success": False, "message": "Lock not found or not held by client"}

@router.post("/{config_id}/invite", response_model=InviteResponse)
async def invite_collaborator(
    config_id: str,
    invite: InviteRequest,
    db: AsyncSession = Depends(get_db)
):
    # Check if config exists
    result = await db.execute(select(ConfigurationDB).where(ConfigurationDB.id == config_id))
    config = result.scalar_one_or_none()
    
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")
        
    # Check if already a collaborator
    result = await db.execute(
        select(ConfigCollaboratorDB).where(
            ConfigCollaboratorDB.config_id == config_id,
            ConfigCollaboratorDB.user_id == invite.user_id
        )
    )
    existing = result.scalar_one_or_none()
    
    if existing:
        existing.permission = invite.permission
    else:
        new_collaborator = ConfigCollaboratorDB(
            config_id=config_id,
            user_id=invite.user_id,
            permission=invite.permission
        )
        db.add(new_collaborator)
        
    await db.commit()
    return InviteResponse(success=True, message="Collaborator invited successfully")
