import logging
import os
import time
import uuid
from contextlib import asynccontextmanager

import sentry_sdk
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.api import cad, collaboration, data, design_review, preferences, pricing
from app.api.admin import analytics as admin_analytics
from app.api.admin import audit as admin_audit
from app.api.admin import forecast as admin_forecast
from app.api.admin import materials as admin_materials
from app.api.admin import orders as admin_orders
from app.api.admin import users as admin_users
from app.api.admin import widgets as admin_widgets
from app.services.database import init_db

logger = logging.getLogger(__name__)

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

# Initialize Sentry
sentry_dsn = os.getenv("SENTRY_DSN")
if sentry_dsn:
    sentry_sdk.init(
        dsn=sentry_dsn,
        traces_sample_rate=1.0,
        profiles_sample_rate=1.0,
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    yield
    # Shutdown
    pass


app = FastAPI(
    title="Studio API",
    description="""
    Python backend for CAD processing, photorealistic 3D rendering,
    and AI-powered stone design optimization.

    ### Core Capabilities:
    * **CAD Operations:** DXF and SVG generation for stone slab manufacturing.
    * **3D Rendering:** Headless Blender integration for production renders.
    * **AI Analysis:** Structural integrity verification and layout optimization.
    * **Pricing Engine:** Real-time cost calculation based on materials.
    """,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Add rate limiter
app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={
            "error": "Rate limit exceeded",
            "detail": str(exc),
            "retry_after": exc.detail,
        },
        headers={"Retry-After": str(exc.detail)},
    )


# Configure CORS
# In production, set ALLOWED_ORIGINS to specific domains (e.g., "https://stone-studio.vercel.app")
# For local development, it defaults to localhost:3000
_default_origins = (
    "http://localhost:3000,http://127.0.0.1:3000"
    ",http://localhost:3001,http://localhost:3333"
)
allowed_origins_str = os.getenv("ALLOWED_ORIGINS", _default_origins)
ALLOWED_ORIGINS = [
    origin.strip() for origin in allowed_origins_str.split(",") if origin.strip()
]

# Security: Ensure we don't accidentally leave it open if no origins are specified
if not ALLOWED_ORIGINS:
    ALLOWED_ORIGINS = ["http://localhost:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)


# ── Security Middleware ─────────────────────────────────────────────────────────


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """Add security headers and request ID tracking."""
    # Generate request ID for audit logging
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id

    # Track request start time
    start_time = time.time()

    # Process request
    response = await call_next(request)

    # Add security headers
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = (
        "max-age=31536000; includeSubDomains"
    )

    # Add rate limit headers
    if hasattr(request.state, "rate_limit"):
        response.headers["X-RateLimit-Limit"] = str(
            request.state.rate_limit.get("limit", 100)
        )
        response.headers["X-RateLimit-Remaining"] = str(
            request.state.rate_limit.get("remaining", 99)
        )

    # Log request duration for performance monitoring
    duration = time.time() - start_time
    if duration > 1.0:  # Log slow requests
        logger.info(
            f"[SLOW REQUEST] {request.method} {request.url.path} "
            f"took {duration:.2f}s - Request ID: {request_id}"
        )

    return response


# ── Input Sanitization ─────────────────────────────────────────────────────────


def sanitize_input(value: str, max_length: int = 1000) -> str:
    """Basic input sanitization to prevent injection attacks."""
    if not isinstance(value, str):
        return str(value)

    # Remove null bytes and control characters (except newlines/tabs)
    sanitized = value.replace("\x00", "")
    sanitized = "".join(
        char for char in sanitized if char.isprintable() or char in "\n\t"
    )

    # Truncate to max length
    return sanitized[:max_length]


# Include routers
app.include_router(cad.router, prefix="/api/cad", tags=["CAD"])
app.include_router(data.router, prefix="/api/data", tags=["Data"])
app.include_router(pricing.router, prefix="/api/pricing", tags=["Pricing"])
app.include_router(design_review.router, prefix="/api/ai", tags=["AI"])
app.include_router(
    collaboration.router, prefix="/api/collaboration", tags=["Collaboration"]
)

# Admin Routers
app.include_router(admin_users.router, prefix="/api/admin", tags=["Admin: Users"])
app.include_router(admin_orders.router, prefix="/api/admin", tags=["Admin: Orders"])
app.include_router(
    admin_materials.router, prefix="/api/admin", tags=["Admin: Materials"]
)
app.include_router(
    admin_analytics.router, prefix="/api/admin", tags=["Admin: Analytics"]
)
app.include_router(admin_audit.router, prefix="/api/admin/audit", tags=["Admin: Audit"])
app.include_router(pricing.router, prefix="/api/admin/pricing", tags=["Admin: Pricing"])
app.include_router(
    admin_widgets.router, prefix="/api/admin/widgets", tags=["Admin: Widgets"]
)
app.include_router(
    admin_forecast.router, prefix="/api/admin/forecast", tags=["Admin: Forecast"]
)

# Preferences Router
app.include_router(preferences.router, prefix="/api/preferences", tags=["Preferences"])


@app.get("/")
async def root():
    return {"message": "Studio Python API", "status": "running"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


# trigger reload
