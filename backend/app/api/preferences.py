from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.services.database import get_db
from app.models.domain import UserProfileDB
from pydantic import BaseModel
from typing import Dict, Any

router = APIRouter()

class EmailPreferences(BaseModel):
    welcome: bool = True
    order_confirmation: bool = True
    receipt: bool = True

class PreferencesUpdate(BaseModel):
    email_preferences: Dict[str, bool]

def get_current_user(request: Request): # Placeholder for actual auth
    # In a real app, this would extract user ID from JWT or session
    return "user_id_123"

@router.get("/preferences", response_model=EmailPreferences)
async def get_user_preferences(user_id: str = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UserProfileDB.email_preferences).where(UserProfileDB.id == user_id))
    preferences_str = result.scalar_one_or_none()
    if preferences_str:
        return EmailPreferences(**(preferences_str if isinstance(preferences_str, dict) else eval(preferences_str)))
    else:
        return EmailPreferences()

@router.put("/preferences", response_model=EmailPreferences)
async def update_user_preferences(prefs_update: PreferencesUpdate, user_id: str = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    current_prefs = await get_user_preferences(user_id=user_id, db=db)
    updated_prefs = current_prefs.model_dump()
    
    for key, value in prefs_update.email_preferences.items():
        if key in updated_prefs:
            updated_prefs[key] = value

    await db.execute(
        update(UserProfileDB)
        .where(UserProfileDB.id == user_id)
        .values(email_preferences=str(updated_prefs))
    )
    await db.commit()
    
    return EmailPreferences(**updated_prefs)
