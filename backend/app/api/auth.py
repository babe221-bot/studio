from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.services.database import get_db
from app.models.domain import UserProfileDB
from app.models.schemas import UserResponse, UserCreateSchema
from app.services.auth import get_password_hash, authenticate_user, create_access_token
from app.services.email import send_email
from app.services.database import get_db
from app.models.domain import UserProfileDB
from app.services.auth_utils import get_current_active_user
from pydantic import EmailStr

router = APIRouter()

@router.post("/register", response_model=UserResponse)
async def register_user(
    user: UserCreateSchema,
    request: Request, # Not used here, but required for middleware
    db: AsyncSession = Depends(get_db),
):
    # Check if user already exists
    result = await db.execute(
        select(UserProfileDB).where(UserProfileDB.email == user.email)
    )
    existing_user = result.scalar_one_or_none()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    hashed_password = get_password_hash(user.password)
    new_user = UserProfileDB(
        id=str(uuid.uuid4()), # Use UUID for user ID
        email=user.email,
        full_name=user.full_name,
        password=hashed_password,
        role='customer' # Default role
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    # Send welcome email
    try:
        send_email(
            to=new_user.email,
            subject="Dobrodošli u Kamena Galanterija!",
            html="<p>Hvala na registraciji!</p>" # Simple HTML, will be replaced by template
        )
    except Exception as e:
        # Log the error, but don't fail the registration
        print(f"Error sending welcome email: {e}")

    return UserResponse(
        id=new_user.id,
        email=new_user.email,
        full_name=new_user.full_name,
        role=new_user.role,
        is_active=new_user.is_active
    )

@router.post("/login")
async def login_for_access_token(
    request: Request,
    db: AsyncSession = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends(),
):
    user = await authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "user_id": user.id, "role": user.role},
        expires_delta=access_token_expires,
    )
    return {"access_token": access_token, "token_type": "bearer", "user_id": user.id, "role": user.role}


@router.get("/users/me", response_model=UserResponse)
async def read_users_me(
    current_user: UserProfileDB = Depends(get_current_active_user),
):
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        is_active=current_user.is_active,
    )
