from typing import List

from app.models.domain import AdminWidgetDB, UserProfileDB
from app.models.schemas import AdminWidgetCreate, AdminWidgetResponse
from app.services.auth_utils import get_current_admin_user
from app.services.database import get_db
from fastapi import APIRouter, Depends
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


@router.get("/", response_model=List[AdminWidgetResponse])
async def list_widgets(
    db: AsyncSession = Depends(get_db),
    admin_user: UserProfileDB = Depends(get_current_admin_user),
):
    """
    List widgets for the current admin.
    """
    # For now, listing all for admin_user
    result = await db.execute(
        select(AdminWidgetDB).where(AdminWidgetDB.admin_id == str(admin_user.id))
    )
    widgets = result.scalars().all()
    return widgets


@router.post("/", response_model=AdminWidgetResponse)
async def create_widget(
    widget_create: AdminWidgetCreate,
    db: AsyncSession = Depends(get_db),
    admin_user: UserProfileDB = Depends(get_current_admin_user),
):
    """
    Create a new custom widget.
    """
    new_widget = AdminWidgetDB(
        admin_id=str(admin_user.id),
        title=widget_create.title,
        metric_type=widget_create.metric_type,
        chart_type=widget_create.chart_type,
        config=widget_create.config,
    )
    db.add(new_widget)
    await db.commit()
    await db.refresh(new_widget)
    return new_widget


@router.delete("/{widget_id}", dependencies=[Depends(get_current_admin_user)])
async def remove_widget(widget_id: int, db: AsyncSession = Depends(get_db)):
    """
    Delete a custom widget.
    """
    await db.execute(delete(AdminWidgetDB).where(AdminWidgetDB.id == widget_id))
    await db.commit()
    return {"message": "Widget removed successfully"}
