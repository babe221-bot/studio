from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os

from app.api import cad, data
from app.services.database import init_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    yield
    # Shutdown
    pass

app = FastAPI(
    title="Studio API",
    description="Python backend for CAD processing and data operations",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS from environment variable
# Set ALLOWED_ORIGINS as comma-separated string, e.g., "http://localhost:3000,https://your-app.vercel.app"
allowed_origins_str = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
ALLOWED_ORIGINS = [origin.strip() for origin in allowed_origins_str.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(cad.router, prefix="/api/cad", tags=["CAD"])
app.include_router(data.router, prefix="/api/data", tags=["Data"])

@app.get("/")
async def root():
    return {"message": "Studio Python API", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
