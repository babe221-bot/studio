from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.services.database import get_db
from app.models.domain import OrderDB, AdminAuditLogDB
from pydantic import BaseModel
from typing import List
import json

router = APIRouter()

class OrderResponse(BaseModel):
    id: str
    user_id: str | None
    status: str
    fulfillment_status: str | None
    total_amount: float

class OrderUpdate(BaseModel):
    status: str | None
    fulfillment_status: str | None

def is_admin(user_id: str = "admin_user"): # Placeholder
    if user_id != "admin_user":
        raise HTTPException(status_code=403, detail="Not authorized")
    return True

@router.get("/orders", response_model=List[OrderResponse], dependencies=[Depends(is_admin)])
async def list_orders(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(OrderDB).order_by(OrderDB.created_at.desc()).offset(skip).limit(limit))
    orders = result.scalars().all()
    return [
        OrderResponse(
            id=o.id,
            user_id=o.user_id,
            status=o.status,
            fulfillment_status=o.fulfillment_status,
            total_amount=float(o.total_amount)
        ) for o in orders
    ]

@router.put("/orders/{order_id}", response_model=OrderResponse, dependencies=[Depends(is_admin)])
async def update_order(order_id: str, order_update: OrderUpdate, db: AsyncSession = Depends(get_db)):
    # Fetch old value
    old_result = await db.execute(select(OrderDB).where(OrderDB.id == order_id))
    old_order = old_result.scalar_one_or_none()
    if not old_order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    old_data = {
        "status": old_order.status,
        "fulfillment_status": old_order.fulfillment_status
    }

    update_data = order_update.dict(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
        
    await db.execute(
        update(OrderDB)
        .where(OrderDB.id == order_id)
        .values(**update_data)
    )

    # Log audit
    audit_log = AdminAuditLogDB(
        admin_id="admin_user", # Placeholder matching is_admin
        action="UPDATE_ORDER",
        resource_type="order",
        resource_id=order_id,
        old_value=json.dumps(old_data),
        new_value=json.dumps(update_data)
    )
    db.add(audit_log)

    await db.commit()

    # Re-fetch for response
    result = await db.execute(select(OrderDB).where(OrderDB.id == order_id))
    updated_order = result.scalar_one_or_none()
    
    return OrderResponse(
        id=updated_order.id,
        user_id=updated_order.user_id,
        status=updated_order.status,
        fulfillment_status=updated_order.fulfillment_status,
        total_amount=float(updated_order.total_amount)
    )
