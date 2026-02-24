from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import NullPool
import os

# Load .env if present (useful when running the backend standalone)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

_raw_url = os.getenv(
    "DATABASE_URL",
    "postgresql://user:password@localhost:5432/studio",
)

# SQLAlchemy async driver requires the +asyncpg dialect prefix
if _raw_url.startswith("postgresql://"):
    DATABASE_URL = _raw_url.replace("postgresql://", "postgresql+asyncpg://", 1)
elif _raw_url.startswith("postgresql"):
    DATABASE_URL = _raw_url
else:
    # Fallback to local SQLite for offline dev
    DATABASE_URL = "sqlite+aiosqlite:///./studio.db"

engine = create_async_engine(
    DATABASE_URL,
    echo=os.getenv("DB_ECHO", "false").lower() == "true",
    poolclass=NullPool if DATABASE_URL.startswith("postgresql") else None,
    future=True,
)

AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

Base = declarative_base()


async def init_db():
    """Initialize database tables (no-op if tables already exist)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    """FastAPI dependency — yields an async DB session."""
    async with AsyncSessionLocal() as session:
        yield session
