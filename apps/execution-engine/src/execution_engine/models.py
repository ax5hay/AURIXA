"""Pydantic models for the Execution Engine service."""

from pydantic import BaseModel, Field
from typing import Dict, Any, Literal
import uuid

class ExecutionRequest(BaseModel):
    """Request to the execution engine to perform an action."""
    action_name: str = Field(description="The name of the action to execute (e.g., 'send_email', 'write_to_db').")
    params: Dict[str, Any] = Field(description="The parameters for the action.", default_factory=dict)
    idempotency_key: str = Field(description="A unique key to prevent duplicate executions.", default_factory=lambda: str(uuid.uuid4()))
    
class ExecutionResponse(BaseModel):
    """Response from the execution engine."""
    status: Literal["success", "error"] = Field(description="The status of the execution.")
    result: Dict[str, Any] = Field(description="The result of the execution.", default_factory=dict)
    error_message: str | None = Field(description="An error message if the execution failed.", default=None)
