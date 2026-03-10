from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.services.database import get_db
from app.services.pricing_service import PriceCalculationRequest, PriceCalculationResponse, calculate_price
from app.services.email import send_email
import uuid

router = APIRouter()

@router.post("/calculate", response_model=PriceCalculationResponse)
async def calculate_order_price(
    request: PriceCalculationRequest,
    db: AsyncSession = Depends(get_db)
):
    try:
        calculation_result = await calculate_price(request, db)
        total_amount = calculation_result.total_amount

        # In a real app, payment processing would happen here,
        # and we'd get payment_status and transaction_id from Stripe or similar.
        payment_status = "paid"
        transaction_id = f"txn_{uuid.uuid4()}" # Placeholder

        # Send order confirmation email
        try:
            send_email(
                to=request.customer_email, # Assuming customer_email is available
                subject=f"Potvrda narudžbe #{request.order_id}",
                html="<p>Hvala na narudžbi!</p>" # Placeholder HTML - will be replaced by template rendering logic
            )
            # Send receipt email
            send_email(
                to=request.customer_email,
                subject=f"Račun za narudžbu #{request.order_id}",
                html="<p>Vaš račun je spreman.</p>" # Placeholder HTML - will be replaced by template rendering logic
            )
        except Exception as e:
            print(f"Error sending order emails: {e}")

        return PriceCalculationResponse(
            order_id=request.order_id,
            total_amount=total_amount,
            payment_status=payment_status,
            transaction_id=transaction_id,
            items=request.items
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error during calculation")

router = APIRouter()

@router.post("/calculate", response_model=PriceCalculationResponse)
async def calculate_order_price(
    request: PriceCalculationRequest,
    db: AsyncSession = Depends(get_db)
):
    try:
        calculation_result = await calculate_price(request, db)
        total_amount = calculation_result.total_amount

        # In a real app, payment processing would happen here,
        # and we'd get payment_status and transaction_id from Stripe or similar.
        payment_status = "paid"
        transaction_id = f"txn_{uuid.uuid4()}" # Placeholder

        # Send order confirmation email
        try:
            send_email(
                to=request.customer_email, # Assuming customer_email is available
                subject=f"Potvrda narudžbe #{request.order_id}",
                html=render_template(
                    'OrderConfirmationEmail',
                    {
                        "orderId": request.order_id,
                        "orderItems": request.items,
                        "totalAmount": float(total_amount),
                    }
                )
            )
            # Send receipt email
            send_email(
                to=request.customer_email,
                subject=f"Račun za narudžbu #{request.order_id}",
                html=render_template(
                    'ReceiptEmail',
                    {
                        "orderId": request.order_id,
                        "orderItems": request.items,
                        "totalAmount": float(total_amount),
                        "paymentStatus": payment_status,
                        "transactionId": transaction_id,
                    }
                )
            )
        except Exception as e:
            print(f"Error sending order emails: {e}")

        return PriceCalculationResponse(
            order_id=request.order_id,
            total_amount=total_amount,
            payment_status=payment_status,
            transaction_id=transaction_id,
            items=request.items
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error during calculation")
