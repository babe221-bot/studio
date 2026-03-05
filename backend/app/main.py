# Apply mocks if needed
import sys
try:
    import bpy
except ImportError:
    # If we are not running inside Blender, insert mock
    # This prevents ImportErrors in services that might import bpy at top level
    from app.mocks import bpy as mock_bpy
    sys.modules["bpy"] = mock_bpy

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os

from app.api import cad, data, pricing, design_review
from app.services.database import init_db
import sentry_sdk

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
    Python backend for CAD processing, photorealistic 3D rendering, and AI-powered stone design optimization.
    
    ### Core Capabilities:
    * **CAD Operations:** DXF and SVG generation for stone slab manufacturing.
    * **3D Rendering:** Headless Blender integration for high-quality production renders and AR models.
    * **AI Analysis:** Structural integrity verification and layout optimization.
    * **Pricing Engine:** Real-time cost calculation based on materials and processing.
    """,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
# In production, set ALLOWED_ORIGINS to specific domains (e.g., "https://stone-studio.vercel.app")
# For local development, it defaults to localhost:3000
allowed_origins_str = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001")
ALLOWED_ORIGINS = [origin.strip() for origin in allowed_origins_str.split(",") if origin.strip()]

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

# Include routers
app.include_router(cad.router, prefix="/api/cad", tags=["CAD"])
app.include_router(data.router, prefix="/api/data", tags=["Data"])
app.include_router(pricing.router, prefix="/api/pricing", tags=["Pricing"])
app.include_router(design_review.router, prefix="/api/ai", tags=["AI"])


@app.get("/")
async def root():
    return {"message": "Studio Python API", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
    
# trigger reload
