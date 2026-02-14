"""Pydantic models for the orchestration engine."""

import time
import uuid
from typing import Any, Dict, Literal

from pydantic import BaseModel, Field


class PipelineRequest(BaseModel):
    """Request to initiate a new orchestration pipeline."""
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    prompt: str
    tenant_id: str | None = None
    user_id: str | None = None
    patient_id: int | None = None  # Links voice/chat to patient profile


class PipelineStep(BaseModel):
    """Represents a single step in an orchestration pipeline."""
    name: str
    status: Literal["pending", "in_progress", "success", "error"] = "pending"
    input: Dict[str, Any] | None = None
    output: Dict[str, Any] | None = None
    error_message: str | None = None
    start_time: float | None = None
    end_time: float | None = None

    @property
    def duration_ms(self) -> float | None:
        if self.start_time and self.end_time:
            return (self.end_time - self.start_time) * 1000
        return None


class ConversationState(BaseModel):
    """Tracks the full state of a conversation pipeline."""
    session_id: str
    request: PipelineRequest
    steps: list[PipelineStep] = []
    final_response: str | None = None
    created_at: float = Field(default_factory=time.time)
    updated_at: float = Field(default_factory=time.time)

    def add_step(self, name: str, input: Dict[str, Any] | None = None) -> PipelineStep:
        step = PipelineStep(name=name, input=input)
        self.steps.append(step)
        return step
