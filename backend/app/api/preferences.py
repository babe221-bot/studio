from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.services.database import get_db
from app.models.domain import UserProfileDB
from pydantic import BaseModel
from typing import Dict, Any
import json
import uuid

from app.services.auth_utils import get_current_active_user # Assuming this exists

router = APIRouter()

class EmailPreferences(BaseModel):
    welcome: bool = True
    order_confirmation: bool = True
    receipt: bool = True

class PreferencesUpdate(BaseModel):
    email_preferences: Dict[str, bool]

# Use the existing get_current_active_user for user identification
def get_current_user(user: UserProfileDB = Depends(get_current_active_user)):
    return user.id

@router.get("/preferences", response_model=EmailPreferences)
async def get_user_preferences(user_id: str = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UserProfileDB.email_preferences).where(UserProfileDB.id == user_id))
    preferences_str = result.scalar_one_or_none()
    if preferences_str:
        try:
            # Safely parse JSON string from DB
            prefs = json.loads(preferences_str)
            return EmailPreferences(**prefs)
        except (json.JSONDecodeError, TypeError):
            # Handle cases where preferences might be invalid JSON or null
            print(f"Warning: Could not parse email preferences for user {user_id}: {preferences_str}")
            return EmailPreferences()
    else:
        return EmailPreferences()

@router.put("/preferences", response_model=EmailPreferences)
async def update_user_preferences(prefs_update: PreferencesUpdate, user_id: str = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # Fetch current preferences safely
    current_prefs_result = await db.execute(select(UserProfileDB.email_preferences).where(UserProfileDB.id == user_id))
    current_prefs_str = current_prefs_result.scalar_one_or_none()
    
    current_prefs = {}
    if current_prefs_str:
        try:
            current_prefs = json.loads(current_prefs_str)
        except (json.JSONDecodeError, TypeError):
            print(f"Warning: Could not parse existing email preferences for user {user_id}: {current_prefs_str}")

    # Merge new preferences, ensuring all keys from EmailPreferences are present
    default_prefs = EmailPreferences().model_dump()
    updated_prefs = {**default_prefs, **current_prefs, **prefs_update.email_preferences}

    await db.execute(
        update(UserProfileDB)
        .where(UserProfileDB.id == user_id)
        .values(email_preferences=json.dumps(updated_prefs)) # Store as JSON string
    )
    await db.commit()
    
    return EmailPreferences(**updated_prefs)
