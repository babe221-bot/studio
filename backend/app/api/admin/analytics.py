from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from app.services.database import get_db
from app.models.domain import OrderDB, UserProfileDB
from pydantic import BaseModel
from typing import List, Any
import datetime
import io
import csv
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter

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

@router.get("/analytics/export", dependencies=[Depends(is_admin)])
async def export_analytics(format: str = Query("csv", pattern="^(csv|pdf)$"), days: int = 30, db: AsyncSession = Depends(get_db)):
    summary = await get_summary_stats(db=db)
    revenue = await get_revenue_over_time(days=days, db=db)
    
    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Summary Data
        writer.writerow(["--- Summary Stats ---"])
        writer.writerow(["Total Users", "Total Orders", "Total Revenue"])
        writer.writerow([summary.total_users, summary.total_orders, summary.total_revenue])
        writer.writerow([])
        
        # Revenue Data
        writer.writerow([f"--- Revenue Over Time (Last {days} days) ---"])
        writer.writerow(["Date", "Revenue"])
        for stat in revenue:
            writer.writerow([stat.date, stat.revenue])
            
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=analytics_{datetime.date.today()}.csv"}
        )
        
    elif format == "pdf":
        output = io.BytesIO()
        p = canvas.Canvas(output, pagesize=letter)
        p.setFont("Helvetica-Bold", 16)
        p.drawString(50, 750, f"Analytics Report - {datetime.date.today()}")
        
        p.setFont("Helvetica-Bold", 12)
        p.drawString(50, 710, "Summary Stats:")
        p.setFont("Helvetica", 12)
        p.drawString(70, 690, f"Total Users: {summary.total_users}")
        p.drawString(70, 670, f"Total Orders: {summary.total_orders}")
        p.drawString(70, 650, f"Total Revenue: ${summary.total_revenue:.2f}")
        
        p.setFont("Helvetica-Bold", 12)
        p.drawString(50, 610, f"Revenue Over Time (Last {days} days):")
        p.setFont("Helvetica", 12)
        
        y_position = 590
        for stat in revenue:
            p.drawString(70, y_position, f"{stat.date}: ${stat.revenue:.2f}")
            y_position -= 20
            if y_position < 50:
                p.showPage()
                p.setFont("Helvetica", 12)
                y_position = 750
                
        p.save()
        output.seek(0)
        return StreamingResponse(
            output,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=analytics_{datetime.date.today()}.pdf"}
        )
