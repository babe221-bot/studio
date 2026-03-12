from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from app.services.database import get_db
from app.models.domain import OrderDB
from typing import List, Optional
import datetime
import numpy as np

router = APIRouter()

def is_admin(user_id: str = "admin_user"): # Placeholder
    if user_id != "admin_user":
        raise HTTPException(status_code=403, detail="Not authorized")
    return True

@router.get("/", dependencies=[Depends(is_admin)])
async def get_forecast(
    metric: str = Query("orders", pattern="^(orders|revenue)$"),
    days_back: int = 30,
    days_ahead: int = 7,
    db: AsyncSession = Depends(get_db)
):
    """
    Get predictive forecast for orders or revenue.
    """
    end_date = datetime.date.today()
    start_date = end_date - datetime.timedelta(days=days_back)

    # Get historical data
    if metric == "orders":
        sql = f"""
            SELECT strftime('%Y-%m-%d', created_at) as date, COUNT(id) as value
            FROM orders
            WHERE created_at >= '{start_date}'
            GROUP BY date
            ORDER BY date
        """
    else: # revenue
        sql = f"""
            SELECT strftime('%Y-%m-%d', created_at) as date, SUM(total_amount) as value
            FROM orders
            WHERE status = 'paid' AND created_at >= '{start_date}'
            GROUP BY date
            ORDER BY date
        """

    result = await db.execute(text(sql))
    rows = result.fetchall()

    if not rows:
        return []

    # Prepare data for regression
    dates = [datetime.datetime.strptime(row[0], '%Y-%m-%d').date() for row in rows]
    values = [float(row[1]) for row in rows]
    
    # Map dates to integers (days since start)
    x = np.array([(d - dates[0]).days for d in dates])
    y = np.array(values)
    
    # Linear regression: y = mx + c
    if len(x) > 1:
        m, c = np.polyfit(x, y, 1)
    else:
        m, c = 0, y[0] if len(y) > 0 else 0

    # Generate results (historical + predicted)
    full_data = []
    
    # Add historical data
    for d, v in zip(dates, values):
        full_data.append({
            "date": d.isoformat(),
            "actual": v,
            "predicted": m * (d - dates[0]).days + c
        })
        
    # Add predicted future data
    last_date = dates[-1]
    for i in range(1, days_ahead + 1):
        future_date = last_date + datetime.timedelta(days=i)
        full_data.append({
            "date": future_date.isoformat(),
            "actual": None,
            "predicted": max(0, m * (future_date - dates[0]).days + c)
        })

    return full_data
