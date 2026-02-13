import time
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from loguru import logger

SERVICE_NAME = "execution-engine"
PORT = 8007


@asynccontextmanager
async def lifespan(app: FastAPI):
    start = time.monotonic()
    logger.info(f"{SERVICE_NAME} starting on port {PORT}")
    yield
    logger.info(f"{SERVICE_NAME} shutting down")


app = FastAPI(
    title=f"AURIXA {SERVICE_NAME}",
    version="0.1.0",
    lifespan=lifespan,
)


@app.get("/health")
async def health():
    return {"service": SERVICE_NAME, "status": "healthy"}
