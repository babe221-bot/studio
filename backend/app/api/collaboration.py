from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.services.database import get_db
from app.models.domain import ConfigurationDB, ConfigCollaboratorDB
from app.models.schemas import CADAIResponse # Use a generic response or create new one
from pydantic import BaseModel
import uuid

router = APIRouter()

class InviteRequest(BaseModel):
    user_id: str
    permission: str = "view"

class InviteResponse(BaseModel):
    success: bool
    message: str

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
