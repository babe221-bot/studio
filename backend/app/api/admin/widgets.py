from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.services.database import get_db
from app.models.domain import AdminWidgetDB
from app.models.schemas import AdminWidgetCreate, AdminWidgetResponse
from typing import List

router = APIRouter()

def is_admin(user_id: str = "admin_user"): # Placeholder
    # In a real app, this would check JWT token for admin role
    if user_id != "admin_user":
        raise HTTPException(status_code=403, detail="Not authorized")
    return True

@router.get("/", response_model=List[AdminWidgetResponse], dependencies=[Depends(is_admin)])
async def list_widgets(db: AsyncSession = Depends(get_db)):
    """
    List widgets for the current admin.
    """
    # For now, listing all for admin_user
    result = await db.execute(select(AdminWidgetDB).where(AdminWidgetDB.admin_id == "admin_user"))
    widgets = result.scalars().all()
    return widgets

@router.post("/", response_model=AdminWidgetResponse, dependencies=[Depends(is_admin)])
async def create_widget(widget_create: AdminWidgetCreate, db: AsyncSession = Depends(get_db)):
    """
    Create a new custom widget.
    """
    new_widget = AdminWidgetDB(
        admin_id="admin_user",
        title=widget_create.title,
        metric_type=widget_create.metric_type,
        chart_type=widget_create.chart_type,
        config=widget_create.config
    )
    db.add(new_widget)
    await db.commit()
    await db.refresh(new_widget)
    return new_widget

@router.delete("/{widget_id}", dependencies=[Depends(is_admin)])
async def remove_widget(widget_id: int, db: AsyncSession = Depends(get_db)):
    """
    Delete a custom widget.
    """
    await db.execute(delete(AdminWidgetDB).where(AdminWidgetDB.id == widget_id))
    await db.commit()
    return {"message": "Widget removed successfully"}
