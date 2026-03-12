from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.services.database import get_db
from app.models.domain import AdminAuditLogDB
from app.models.schemas import AdminAuditLogResponse
from typing import List

router = APIRouter()

def is_admin(user_id: str = "admin_user"): # Placeholder
    # In a real app, this would check JWT token for admin role
    if user_id != "admin_user":
        raise HTTPException(status_code=403, detail="Not authorized")
    return True

@router.get("/", response_model=List[AdminAuditLogResponse], dependencies=[Depends(is_admin)])
async def list_audit_logs(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """
    List admin audit logs with pagination, ordered by most recent first.
    """
    result = await db.execute(
        select(AdminAuditLogDB)
        .order_by(desc(AdminAuditLogDB.created_at))
        .offset(offset)
        .limit(limit)
    )
    logs = result.scalars().all()
    return logs
