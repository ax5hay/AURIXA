"""Database connection and session management."""

import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from loguru import logger

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://aurixa:aurixa@localhost:5432/aurixa")

try:
    engine = create_async_engine(DATABASE_URL, echo=False, future=True)
    AsyncSessionLocal = async_sessionmaker(
        autocommit=False, 
        autoflush=False, 
        bind=engine
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
