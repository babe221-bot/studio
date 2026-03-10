from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from app.services.database import get_db
from app.models.domain import OrderDB, UserProfileDB
from pydantic import BaseModel
from typing import List, Any
import datetime

router = APIRouter()

class RevenueStat(BaseModel):
    date: str
    revenue: float

class SummaryStats(BaseModel):
    total_users: int
    total_orders: int
    total_revenue: float

def is_admin(user_id: str = "admin_user"): # Placeholder
    # In a real app, this would check JWT token for admin role
    if user_id != "admin_user":
        raise HTTPException(status_code=403, detail="Not authorized")
    return True

@router.get("/analytics/summary", response_model=SummaryStats, dependencies=[Depends(is_admin)])
async def get_summary_stats(db: AsyncSession = Depends(get_db)):
    total_users_result = await db.execute(select(func.count(UserProfileDB.id)))
    total_users = total_users_result.scalar_one()

    total_orders_result = await db.execute(select(func.count(OrderDB.id)))
    total_orders = total_orders_result.scalar_one()

    total_revenue_result = await db.execute(select(func.sum(OrderDB.total_amount)).where(OrderDB.status == 'paid'))
    total_revenue = total_revenue_result.scalar_one() or 0.0

    return SummaryStats(
        total_users=total_users,
        total_orders=total_orders,
        total_revenue=float(total_revenue)
    )

@router.get("/analytics/revenue", response_model=List[RevenueStat], dependencies=[Depends(is_admin)])
async def get_revenue_over_time(days: int = 30, db: AsyncSession = Depends(get_db)):
    # This query is simplified. For production, use more robust date grouping.
    # Note: This is dialect-specific for date functions.
    end_date = datetime.date.today()
    start_date = end_date - datetime.timedelta(days=days)

    # The following query uses SQLite specific functions. 
    # Use appropriate functions for PostgreSQL in production.
    query = text(
        f"""
        SELECT 
            strftime('%Y-%m-%d', created_at) as date,
            SUM(total_amount) as revenue
        FROM orders
        WHERE status = 'paid' AND created_at >= '{start_date}'
        GROUP BY date
        ORDER BY date
        """
    )

    result = await db.execute(query)
    rows = result.fetchall()
    
    return [RevenueStat(date=row[0], revenue=float(row[1])) for row in rows]
