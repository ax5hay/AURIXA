"""
AURIXA Python Logger
====================
Thin wrapper around Loguru that mirrors the structured logging conventions
used by the TypeScript @aurixa/logging package.

Usage:
    from packages.logging.python_logger import create_logger

    logger = create_logger("market-data")
    logger.info("Server started", port=4001)
    logger.bind(correlation_id="abc-123").info("Processing request")
"""

import sys
import os
from loguru import logger as _logger


def create_logger(service: str):
    """Create a configured Loguru logger for a service.

    Parameters
    ----------
    service:
        Logical service name, included in every log entry.

    Environment variables
    ---------------------
    LOG_LEVEL   : Minimum log level (default ``DEBUG``).
    LOG_DIR     : Directory for rotating file logs (default ``logs``).
    NODE_ENV    : ``development`` for human-readable output,
                  anything else for JSON structured output.
    """
    _logger.remove()  # Remove default handler

    log_level = os.getenv("LOG_LEVEL", "DEBUG").upper()
    log_dir = os.getenv("LOG_DIR", "logs")

    # JSON structured format for production
    json_format = (
        '{{"timestamp":"{time:YYYY-MM-DDTHH:mm:ss.SSS}","level":"{level}",'
        '"service":"' + service + '","message":"{message}",{extra}}}'
    )

    # Human-readable for dev
    dev_format = (
        "<green>{time:HH:mm:ss.SSS}</green> | "
        "<level>{level: <8}</level> | "
        f"<cyan>{service}</cyan> | "
        "<level>{message}</level> | {extra}"
    )

    env = os.getenv("NODE_ENV", "development")
    fmt = dev_format if env == "development" else json_format

    # STDOUT
    _logger.add(sys.stdout, format=fmt, level=log_level, colorize=(env == "development"))

    # Rotating file
    os.makedirs(log_dir, exist_ok=True)
    _logger.add(
        f"{log_dir}/{service}.log",
        format=json_format,
        level=log_level,
        rotation="50 MB",
        retention="7 days",
        compression="gz",
    )

    return _logger.bind(service=service)
