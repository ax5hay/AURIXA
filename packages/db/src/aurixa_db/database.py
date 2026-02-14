"""Database connection and session management."""

import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from loguru import logger

_raw = os.getenv("DATABASE_URL", "postgresql+asyncpg://aurixa:aurixa@localhost:5432/aurixa")
# Ensure async driver (postgresql:// -> postgresql+asyncpg://)
if _raw.startswith("postgresql://") and "+asyncpg" not in _raw:
    DATABASE_URL = _raw.replace("postgresql://", "postgresql+asyncpg://", 1)
else:
    DATABASE_URL = _raw

try:
    engine = create_async_engine(DATABASE_URL, echo=False, future=True)
    AsyncSessionLocal = async_sessionmaker(
        autocommit=False, 
        autoflush=False, 
        bind=engine,
        expire_on_commit=False,
    )
    logger.info("Database engine created successfully for URL: {}", DATABASE_URL)
except Exception as e:
    logger.error("Failed to create database engine: {}", e)
    engine = None
    AsyncSessionLocal = None

async def get_db_session():
    """FastAPI dependency to get a database session."""
    if AsyncSessionLocal is None:
        raise RuntimeError("Database not initialized.")
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
