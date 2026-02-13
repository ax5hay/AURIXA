"""AURIXA database models."""

from .base import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, JSON, ForeignKey, Text
from typing import List, Dict, Any

class Conversation(Base):
    """Represents a single conversation or session."""
    __tablename__ = "conversations"

    session_id: Mapped[str] = mapped_column(String, unique=True, index=True)
    metadata: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=True)

    pipeline_steps: Mapped[List["PipelineStep"]] = relationship(back_populates="conversation")

class PipelineStep(Base):
    """Represents a single step within a conversation pipeline."""
    __tablename__ = "pipeline_steps"

    conversation_id: Mapped[int] = mapped_column(ForeignKey("conversations.id"))
    step_name: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String)
    input: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=True)
    output: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=True)
    error_message: Mapped[str] = mapped_column(Text, nullable=True)
    start_time: Mapped[float] = mapped_column(nullable=True)
    end_time: Mapped[float] = mapped_column(nullable=True)

    conversation: Mapped["Conversation"] = relationship(back_populates="pipeline_steps")
