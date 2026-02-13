"""Base model for all SQLAlchemy table definitions."""

from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import text
from typing import Any
import datetime

class Base(DeclarativeBase):
    """Base for all models, includes primary key and audit columns."""
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        server_default=text("TIMEZONE('utc', now())")
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        server_default=text("TIMEZONE('utc', now())"),
        onupdate=datetime.datetime.utcnow,
    )
