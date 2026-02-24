from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import NullPool
import os

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://user:password@localhost:5432/studio"
)

# SQLite for local dev if DATABASE_URL doesn't start with postgresql
if not DATABASE_URL.startswith("postgresql"):
    DATABASE_URL = "sqlite+aiosqlite:///./studio.db"

engine = create_async_engine(
    DATABASE_URL,
    echo=True,
    poolclass=NullPool if DATABASE_URL.startswith("postgresql") else None,
    future=True
)

AsyncSessionLocal = sessionmaker(
    engine, 
    class_=AsyncSession, 
    expire_on_commit=False
)

Base = declarative_base()

async def init_db():
    """Initialize database tables"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
