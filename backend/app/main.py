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

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://your-domain.vercel.app"],
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
