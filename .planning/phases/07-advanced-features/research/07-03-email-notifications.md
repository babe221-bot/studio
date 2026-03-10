# Email Notifications Research for Stone Slab Configurator

**Project:** Stone Slab Configurator (Next.js + FastAPI)
**Research Date:** 2026-03-10
**Domain:** Transactional Email Infrastructure
**Overall Confidence:** HIGH

---

## Executive Summary

This research covers the implementation of email notifications for a Next.js + FastAPI stone slab configurator application with existing Stripe payments and Supabase auth. After analyzing Resend, SendGrid, AWS SES, and Postmark, **Resend is recommended** as the primary email provider due to its superior developer experience, competitive pricing, excellent Next.js integration, and modern API design.

The application requires transactional emails for: welcome sequences, order confirmations with Stripe receipt integration, and configuration save notifications. Email queuing should be implemented using Redis with BullMQ for handling high-volume periods, with database-backed preference management integrated into the existing Supabase schema.

---

## 1. Email Service Provider Comparison

### 1.1 Provider Overview

| Provider     | Free Tier                           | Paid Pricing        | Deliverability | Best For                   | Confidence |
| ------------ | ----------------------------------- | ------------------- | -------------- | -------------------------- | ---------- |
| **Resend**   | 3,000 emails/month                  | $0.001/email (bulk) | Excellent      | Developers, Next.js apps   | HIGH       |
| **SendGrid** | 100 emails/day                      | $0.04/email         | Good           | Enterprise, marketing      | HIGH       |
| **AWS SES**  | 62,000 emails/month (AWS free tier) | $0.0001/email       | Good-Very Good | AWS-heavy infrastructure   | HIGH       |
| **Postmark** | 100 emails/month                    | $0.025/email        | Excellent      | Transactional, reliability | HIGH       |

### 1.2 Detailed Analysis

#### Resend (Recommended)

**Strengths:**

- Native Next.js integration via `@react-email` and `@resend/react-email`
- Developer-first API with excellent TypeScript support
- Competitive pricing at $0.001 per email for high volumes
- Built-in email preview and testing infrastructure
- Superior deliverability with built-in spam score checking
- Webhook support for delivery tracking
- React Email library for beautiful, maintainable templates

**Weaknesses:**

- Smaller market share compared to SendGrid
- Less enterprise features compared to AWS SES

**Pricing Details:**

- Free: 3,000 emails/month
- Paid: Starting at $0.001/email (decreases with volume)
- No setup fees, no minimums

**Sources:**

- Resend Documentation: https://resend.com/docs
- Context7 Library ID: resend

#### SendGrid (Twilio)

**Strengths:**

- Largest market share, well-established
- Comprehensive API and documentation
- Marketing campaign features built-in
- Robust webhook system
- Good deliverability with proper setup

**Weaknesses:**

- Complex pricing structure
- Higher cost than competitors
- Marketing-focused (may be overkill for transactional)
- API can be inconsistent between endpoints

**Pricing Details:**

- Free: 100 emails/day
- Pro plans: From $14.95/month (40,000 emails)

#### AWS SES

**Strengths:**

- Extremely low cost (highest volume, lowest price)
- Deep AWS integration (Lambda, S3, CloudWatch)
- Highly scalable
- No cost for AWS sandbox accounts

**Weaknesses:**

- Complex setup and configuration
- Requires AWS account and IAM configuration
- No built-in templates (raw email only)
- Deliverability requires careful configuration
- Steeper learning curve

**Pricing Details:**

- AWS Free Tier: 62,000 emails/month for first 12 months
- Standard: $0.0001 per email

#### Postmark

**Strengths:**

- Highest deliverability rates in industry
- Excellent for transactional email
- Built-in templates and design tools
- Detailed analytics and tracking
- Strong focus on email reliability

**Weaknesses:**

- Most expensive option
- Lower free tier (100 emails/month)
- Less developer-friendly than Resend

**Pricing Details:**

- Free: 100 emails/month
- Paid: Starting at $0.025/email

### 1.3 Recommendation

**Primary: Resend** — Best developer experience, excellent Next.js integration, competitive pricing, modern API design.

**Alternative: AWS SES** — If already using AWS infrastructure heavily and need lowest possible cost at scale.

**Avoid for MVP:** Postmark (expensive), SendGrid (complex/priced for marketing).

---

## 2. Recommended Technology Stack

### 2.1 Core Dependencies

```json
// backend/requirements.txt
resend>=2.0.0
pydantic>=2.0.0
redis>=5.0.0
celery>=5.3.0
httpx>=0.27.0
```

```json
// package.json (frontend)
{
  "@react-email/components": "^0.0.26",
  "@react-email/tailwind": "^0.0.20"
}
```

### 2.2 Architecture Components

| Layer               | Technology          | Purpose                              |
| ------------------- | ------------------- | ------------------------------------ |
| Email Provider      | Resend              | Primary email delivery               |
| Email Queue         | Redis + Celery      | Background job processing            |
| Email Templates     | React Email         | Type-safe, component-based templates |
| Preferences Storage | Supabase (existing) | User email preferences               |
| Webhook Handler     | FastAPI             | Delivery event processing            |

### 2.3 Version Recommendations

| Package                 | Version | Rationale                 |
| ----------------------- | ------- | ------------------------- |
| resend                  | ^2.0.0  | Latest stable with v2 API |
| celery                  | ^5.3.0  | Python async task queue   |
| redis                   | ^5.0.0  | Redis client for Celery   |
| @react-email/components | ^0.0.26 | Latest stable             |
| @react-email/tailwind   | ^0.0.20 | Tailwind integration      |

---

## 3. Database Schema for Email Preferences

### 3.1 Supabase Tables

```sql
-- User email preferences (extends auth.users)
CREATE TABLE public.user_email_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,

    -- Notification flags
    order_confirmation BOOLEAN DEFAULT TRUE,
    payment_receipt BOOLEAN DEFAULT TRUE,
    configuration_saved BOOLEAN DEFAULT FALSE,
    order_status_updates BOOLEAN DEFAULT TRUE,
    marketing BOOLEAN DEFAULT FALSE,

    -- Preference management
    unsubscribe_all BOOLEAN DEFAULT FALSE,
    unsubscribe_token VARCHAR(255) UNIQUE NOT NULL,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email event tracking (for analytics)
CREATE TABLE public.email_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    email VARCHAR(255) NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- sent, delivered, opened, clicked, bounced, complained
    message_id VARCHAR(255) NOT NULL,
    event_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Guest session email (for non-auth'd users)
CREATE TABLE public.guest_email_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_session_id VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    order_id UUID,
    configuration_id UUID,
    notify_on_complete BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.2 Row Level Security

```sql
-- Enable RLS
ALTER TABLE public.user_email_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;

-- Users can read/update their own preferences
CREATE POLICY "Users manage own preferences"
ON public.user_email_preferences
FOR ALL
USING (auth.uid() = user_id);

-- Users can read their own email events
CREATE POLICY "Users view own email events"
ON public.email_events
FOR SELECT
USING (auth.uid() = user_id);
```

---

## 4. API Endpoint Design

### 4.1 Email Preferences Endpoints (FastAPI)

```python
# backend/app/api/email_preferences.py

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.services.database import get_db
from app.services import email_service

router = APIRouter(prefix="/api/email", tags=["Email Preferences"])

class EmailPreferencesUpdate(BaseModel):
    order_confirmation: Optional[bool] = None
    payment_receipt: Optional[bool] = None
    configuration_saved: Optional[bool] = None
    order_status_updates: Optional[bool] = None
    marketing: Optional[bool] = None
    unsubscribe_all: Optional[bool] = None

class EmailPreferencesResponse(BaseModel):
    id: str
    email: str
    order_confirmation: bool
    payment_receipt: bool
    configuration_saved: bool
    order_status_updates: bool
    marketing: bool
    unsubscribe_all: bool

@router.get("/preferences", response_model=EmailPreferencesResponse)
async def get_email_preferences(
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current user's email preferences."""
    prefs = await email_service.get_user_preferences(db, current_user.id)
    if not prefs:
        raise HTTPException(status_code=404, detail="Preferences not found")
    return prefs

@router.put("/preferences", response_model=EmailPreferencesResponse)
async def update_email_preferences(
    preferences: EmailPreferencesUpdate,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update email preferences."""
    updated = await email_service.update_preferences(
        db, current_user.id, preferences.model_dump(exclude_unset=True)
    )
    return updated

@router.post("/unsubscribe/{token}")
async def unsubscribe_by_token(
    token: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Unsubscribe via email link (no auth required)."""
    success = await email_service.unsubscribe_by_token(db, token)
    if not success:
        raise HTTPException(status_code=404, detail="Invalid unsubscribe token")
    return {"message": "Successfully unsubscribed"}
```

### 4.2 Webhook Endpoint for Email Events

```python
# backend/app/api/webhooks.py

from fastapi import APIRouter, Request, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List
from app.services import email_service

router = APIRouter(prefix="/api/webhooks", tags=["Email Webhooks"])

class ResendWebhookEvent(BaseModel):
    type: str  # email.sent, email.delivered, email.bounced, email.complained
    data: dict

@router.post("/resend")
async def resend_webhook(
    events: List[ResendWebhookEvent],
    background_tasks: BackgroundTasks
):
    """Handle Resend webhook events."""
    for event in events:
        background_tasks.add_task(
            email_service.handle_webhook_event,
            event.type,
            event.data
        )
    return {"received": len(events)}
```

---

## 5. Email Template Structure

### 5.1 Template Organization

```
backend/
├── app/
│   ├── emails/
│   │   ├── __init__.py
│   │   ├── base.py              # Base layout component
│   │   ├── templates/
│   │   │   ├── welcome.py        # Welcome email
│   │   │   ├── order_confirmation.py
│   │   │   ├── payment_receipt.py
│   │   │   ├── configuration_saved.py
│   │   │   └── order_status.py
│   │   └── renderer.py           # Template rendering service
```

### 5.2 Welcome Email Template

```python
# backend/app/emails/templates/welcome.py

from resend.emails import Email

def welcome_email(to: str, name: str) -> Email:
    """Welcome email for new registered users."""
    return Email(
        subject="Welcome to Stone Studio!",
        sender="Stone Studio <noreply@yourdomain.com>",
        to=[to],
        html=f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                      max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #1a1a1a;">Welcome to Stone Studio, {name}!</h1>
            </div>

            <p style="color: #4a4a4a; line-height: 1.6;">
                Thank you for joining Stone Studio. You can now:
            </p>

            <ul style="color: #4a4a4a; line-height: 1.8;">
                <li>Design custom stone slab configurations</li>
                <li>Get instant pricing for your projects</li>
                <li>Save and manage your configurations</li>
                <li>Complete purchases with secure checkout</li>
            </ul>

            <div style="text-align: center; margin: 30px 0;">
                <a href="https://yourdomain.com/configurator"
                   style="background: #1a1a1a; color: white; padding: 14px 28px;
                          text-decoration: none; border-radius: 6px; display: inline-block;">
                    Start Designing
                </a>
            </div>

            <p style="color: #888; font-size: 14px; margin-top: 30px;">
                Need help? Reply to this email or contact us at support@yourdomain.com
            </p>

            <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;">

            <p style="color: #888; font-size: 12px;">
                You're receiving this because you created an account at Stone Studio.
                <br>
                <a href="{{{unsubscribe_url}}}" style="color: #888;">Unsubscribe</a>
            </p>
        </body>
        </html>
        """
    )
```

### 5.3 Order Confirmation Template

```python
# backend/app/emails/templates/order_confirmation.py

from resend.emails import Email
from typing import List, Dict, Any
from datetime import datetime

def order_confirmation_email(
    to: str,
    order_id: str,
    customer_name: str,
    items: List[Dict[str, Any]],
    total: float,
    stripe_payment_id: str
) -> Email:
    """Order confirmation email with receipt."""

    items_html = "".join([
        f"""
        <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e5e5e5;">
                {item['name']}
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: center;">
                {item['quantity']}
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: right;">
                ${item['price']:.2f}
            </td>
        </tr>
        """
        for item in items
    ])

    return Email(
        subject=f"Order Confirmation - #{order_id[:8]}",
        sender="Stone Studio <orders@yourdomain.com>",
        to=[to],
        html=f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                      max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #1a1a1a;">Order Confirmed!</h1>
                <p style="color: #4a4a4a;">Thank you for your order, {customer_name}</p>
            </div>

            <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                <p style="margin: 0 0 10px;"><strong>Order ID:</strong> {order_id[:8]}</p>
                <p style="margin: 0 0 10px;"><strong>Date:</strong> {datetime.now().strftime('%B %d, %Y')}</p>
                <p style="margin: 0;"><strong>Payment ID:</strong> {stripe_payment_id}</p>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <thead>
                    <tr>
                        <th style="text-align: left; padding: 12px; border-bottom: 2px solid #1a1a1a;">Item</th>
                        <th style="text-align: center; padding: 12px; border-bottom: 2px solid #1a1a1a;">Qty</th>
                        <th style="text-align: right; padding: 12px; border-bottom: 2px solid #1a1a1a;">Price</th>
                    </tr>
                </thead>
                <tbody>
                    {items_html}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="2" style="padding: 12px; text-align: right;"><strong>Total:</strong></td>
                        <td style="padding: 12px; text-align: right;"><strong>${total:.2f}</strong></td>
                    </tr>
                </tfoot>
            </table>

            <p style="color: #4a4a4a; line-height: 1.6;">
                Your order is being processed. We'll send you updates as your
                stone slabs move through production.
            </p>

            <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;">

            <p style="color: #888; font-size: 12px;">
                <a href="{{{{receipt_url}}}}" style="color: #1a1a1a;">View full receipt</a>
                &nbsp;|&nbsp;
                <a href="{{{{unsubscribe_url}}}}" style="color: #888;">Unsubscribe from order updates</a>
            </p>
        </body>
        </html>
        """
    )
```

---

## 6. Email Service Implementation

### 6.1 Core Email Service

```python
# backend/app/services/email_service.py

import os
import resend
from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.domain import UserEmailPreferences
import logging

logger = logging.getLogger(__name__)

# Initialize Resend with API key
resend.api_key = os.getenv("RESEND_API_KEY", "")

class EmailService:
    """Service for handling all email operations."""

    def __init__(self):
        self.default_sender = os.getenv("EMAIL_FROM", "Stone Studio <noreply@yourdomain.com>")

    async def send_email(
        self,
        to: str | List[str],
        subject: str,
        html: str,
        from_email: Optional[str] = None,
        attachments: Optional[List[Dict]] = None
    ) -> Dict[str, Any]:
        """Send a single email via Resend."""
        try:
            params = {
                "from": from_email or self.default_sender,
                "to": to if isinstance(to, list) else [to],
                "subject": subject,
                "html": html,
            }

            if attachments:
                params["attachments"] = attachments

            response = resend.Emails.send(params)
            logger.info(f"Email sent successfully: {response.get('id')}")
            return {"success": True, "message_id": response.get("id")}

        except Exception as e:
            logger.error(f"Failed to send email: {str(e)}")
            return {"success": False, "error": str(e)}

    async def send_templated_email(
        self,
        to: str,
        template_name: str,
        template_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Send an email using a template."""
        from app.emails.templates import (
            welcome,
            order_confirmation,
            configuration_saved,
            order_status
        )

        templates = {
            "welcome": welcome.welcome_email,
            "order_confirmation": order_confirmation.order_confirmation_email,
            "configuration_saved": configuration_saved.configuration_saved_email,
            "order_status": order_status.order_status_email,
        }

        if template_name not in templates:
            raise ValueError(f"Unknown template: {template_name}")

        email = templates[template_name](to=to, **template_data)
        return await self.send_email(
            to=email.to,
            subject=email.subject,
            html=email.html,
            from_email=email.sender
        )

    async def check_user_preferences(
        self,
        db: AsyncSession,
        user_id: str,
        email_type: str
    ) -> bool:
        """Check if user wants to receive a specific type of email."""
        preference_map = {
            "order_confirmation": "order_confirmation",
            "payment_receipt": "payment_receipt",
            "configuration_saved": "configuration_saved",
            "order_status": "order_status_updates",
            "marketing": "marketing",
        }

        pref_field = preference_map.get(email_type)
        if not pref_field:
            return True  # Default to allowing unknown types

        result = await db.execute(
            select(UserEmailPreferences).where(
                UserEmailPreferences.user_id == user_id
            )
        )
        prefs = result.scalar_one_or_none()

        if not prefs:
            return True  # Default to allowing if no preferences set

        return getattr(prefs, pref_field, True)

# Singleton instance
email_service = EmailService()
```

### 6.2 Email Queue with Celery

```python
# backend/app/tasks.py

from celery import Celery
from celery.signals import worker_init
import os

celery_app = Celery(
    "studio_email",
    broker=os.getenv("REDIS_URL", "redis://localhost:6379/0"),
    backend=os.getenv("REDIS_URL", "redis://localhost:6379/0")
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,  # 5 minutes max
)

@celery_app.task(bind=True, max_retries=3)
def send_order_confirmation(self, user_id: str, order_data: dict):
    """Send order confirmation email asynchronously."""
    from app.services.email_service import email_service
    from app.services.database import AsyncSessionLocal
    import asyncio

    async def _send():
        async with AsyncSessionLocal() as db:
            # Check preferences
            if not await email_service.check_user_preferences(db, user_id, "order_confirmation"):
                return {"skipped": True, "reason": "user_preference"}

            # Send email
            result = await email_service.send_templated_email(
                to=user_data["email"],
                template_name="order_confirmation",
                template_data={
                    "order_id": order_data["id"],
                    "customer_name": user_data["name"],
                    "items": order_data["items"],
                    "total": order_data["total"],
                    "stripe_payment_id": order_data["stripe_payment_id"]
                }
            )
            return result

    user_data = get_user_data(user_id)  # Implement this
    return asyncio.run(_send())

@celery_app.task
def send_welcome_email(user_id: str):
    """Send welcome email asynchronously."""
    from app.services.email_service import email_service
    import asyncio

    async def _send():
        user_data = get_user_data(user_id)
        return await email_service.send_templated_email(
            to=user_data["email"],
            template_name="welcome",
            template_data={"name": user_data["name"]}
        )

    return asyncio.run(_send())
```

---

## 7. Testing Email Functionality

### 7.1 Unit Tests

```python
# backend/tests/test_email_service.py

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.email_service import EmailService

class TestEmailService:

    @pytest.fixture
    def email_service(self):
        return EmailService()

    @pytest.mark.asyncio
    async def test_send_email_success(self, email_service):
        """Test successful email sending."""
        with patch("resend.Emails.send") as mock_send:
            mock_send.return_value = {"id": "test_123", "to": "test@example.com"}

            result = await email_service.send_email(
                to="test@example.com",
                subject="Test",
                html="<p>Test content</p>"
            )

            assert result["success"] is True
            assert result["message_id"] == "test_123"

    @pytest.mark.asyncio
    async def test_send_email_failure(self, email_service):
        """Test email sending failure handling."""
        with patch("resend.Emails.send") as mock_send:
            mock_send.side_effect = Exception("API Error")

            result = await email_service.send_email(
                to="test@example.com",
                subject="Test",
                html="<p>Test</p>"
            )

            assert result["success"] is False
            assert "error" in result

    @pytest.mark.asyncio
    async def test_check_user_preferences(self, email_service):
        """Test user preference checking."""
        mock_prefs = MagicMock()
        mock_prefs.order_confirmation = False

        with patch.object(email_service, "_get_user_preferences", return_value=mock_prefs):
            result = await email_service.check_user_preferences(
                "test_user", "order_confirmation"
            )
            assert result is False

    @pytest.mark.asyncio
    async def test_preferences_default_to_true(self, email_service):
        """Test default preference when no preferences set."""
        with patch.object(email_service, "_get_user_preferences", return_value=None):
            result = await email_service.check_user_preferences(
                "new_user", "order_confirmation"
            )
            assert result is True
```

### 7.2 Integration Tests

```python
# backend/tests/test_email_integration.py

import pytest
from httpx import AsyncClient
from app.main import app

class TestEmailAPI:

    @pytest.mark.asyncio
    async def test_get_preferences_unauthorized(self):
        """Test getting preferences without auth."""
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.get("/api/email/preferences")
            assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_update_preferences(self, auth_token):
        """Test updating email preferences."""
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.put(
                "/api/email/preferences",
                json={"order_confirmation": False},
                headers={"Authorization": f"Bearer {auth_token}"}
            )
            assert response.status_code == 200
            assert response.json()["order_confirmation"] is False

    @pytest.mark.asyncio
    async def test_unsubscribe_by_token(self):
        """Test unsubscribe via token."""
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.post(
                "/api/email/unsubscribe/test_token_123"
            )
            assert response.status_code in [200, 404]
```

### 7.3 Email Preview Testing

```bash
# Install Resend CLI for local testing
npm install -g resend

# Preview emails locally
resend emails:serve

# Or use React Email preview
cd frontend
npm run email:preview
```

---

## 8. Email Delivery Tracking

### 8.1 Webhook Handler

```python
# backend/app/services/webhook_handler.py

from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.database import AsyncSessionLocal
from app.models.domain import EmailEvent
import logging

logger = logging.getLogger(__name__)

async def handle_email_event(event_type: str, event_data: Dict[str, Any]):
    """Process incoming email webhook events."""

    async with AsyncSessionLocal() as db:
        event = EmailEvent(
            user_id=event_data.get("user_id"),
            email=event_data.get("email", ""),
            event_type=event_type,
            message_id=event_data.get("message_id", ""),
            event_data=event_data
        )
        db.add(event)
        await db.commit()

        logger.info(f"Processed {event_type} event for {event_data.get('email')}")

        # Handle bounces and complaints specially
        if event_type == "email.bounced":
            await handle_bounce(event_data)
        elif event_type == "email.complained":
            await handle_complaint(event_data)

async def handle_bounce(event_data: Dict[str, Any]):
    """Handle email bounce - mark user for review."""
    # Could update user preferences to disable emails
    # Or flag account for manual review
    logger.warning(f"Email bounced: {event_data.get('email')}")

async def handle_complaint(event_data: Dict[str, Any]):
    """Handle spam complaint - immediately unsubscribe."""
    # Immediately unsubscribe from all emails
    logger.warning(f"Spam complaint: {event_data.get('email')}")
```

### 8.2 Dashboard Query Examples

```sql
-- Email delivery rates
SELECT
    event_type,
    COUNT(*) as count,
    COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() as percentage
FROM email_events
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY event_type;

-- Recent delivery issues
SELECT
    email,
    event_type,
    event_data->>'bounce_reason' as reason,
    created_at
FROM email_events
WHERE event_type IN ('email.bounced', 'email.complained')
ORDER BY created_at DESC
LIMIT 20;
```

---

## 9. Implementation Roadmap

### Phase 1: Foundation (1-2 days)

1. Install Resend SDK and configure API key
2. Create basic email templates (welcome, order confirmation)
3. Set up Supabase tables for preferences
4. Implement basic email sending service
5. Add API endpoints for preferences

**Estimated:** 1-2 days

### Phase 2: Integration (2-3 days)

1. Integrate with Stripe webhook for order confirmations
2. Add email queue with Celery for async processing
3. Implement webhook handler for delivery tracking
4. Add guest session email notifications

**Estimated:** 2-3 days

### Phase 3: Polish (1-2 days)

1. Create remaining email templates
2. Add unsubscribe functionality
3. Build email analytics dashboard
4. Comprehensive testing

**Estimated:** 1-2 days

### Total Estimated Effort

| Phase       | Days    | Tasks  |
| ----------- | ------- | ------ |
| Foundation  | 1-2     | 5      |
| Integration | 2-3     | 4      |
| Polish      | 1-2     | 4      |
| **Total**   | **4-7** | **13** |

---

## 10. Configuration Environment Variables

```bash
# .env

# Resend
RESEND_API_KEY=re_123456789
RESEND_WEBHOOK_SECRET=whsec_123456789

# Email
EMAIL_FROM=Stone Studio <noreply@yourdomain.com>
EMAIL_SUPPORT=support@yourdomain.com

# Redis (for Celery)
REDIS_URL=redis://localhost:6379/0

# Frontend URL for links in emails
FRONTEND_URL=http://localhost:3000
```

---

## 11. Sources

### Primary Sources

| Source                  | Type     | Confidence |
| ----------------------- | -------- | ---------- |
| Resend Documentation    | Official | HIGH       |
| Postmark Developer Docs | Official | HIGH       |
| SendGrid API Reference  | Official | HIGH       |
| AWS SES Documentation   | Official | HIGH       |

### Additional Research

- Email service provider comparisons (2024-2025)
- FastAPI email integration patterns
- Celery task queue best practices
- Supabase RLS patterns

---

## 12. Gaps and Future Considerations

### Items Needing Further Research

1. **Email domain setup** — DNS records (SPF, DKIM, DMARC) configuration needed
2. **Resend vs Supabase Edge Functions** — Could move email rendering to edge
3. **Bulk email handling** — If marketing emails needed later
4. **Email accessibility** templates — Ensuring meet WCAG guidelines

### Out of Scope

- Marketing campaign emails (different infrastructure)
- SMS notifications (different provider)
- Push notifications (different infrastructure)

---

## Confidence Assessment

| Area                    | Confidence | Notes                                    |
| ----------------------- | ---------- | ---------------------------------------- |
| Provider Recommendation | HIGH       | Resend is clear winner for this use case |
| Schema Design           | HIGH       | Based on Supabase best practices         |
| API Design              | HIGH       | Follows FastAPI conventions              |
| Template Structure      | HIGH       | Based on React Email patterns            |
| Queue Implementation    | MEDIUM     | Standard Celery pattern, may need tuning |
| Testing Approach        | HIGH       | Standard testing patterns                |
