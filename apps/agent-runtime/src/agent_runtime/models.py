"""Pydantic models for the Agent Runtime service."""

from pydantic import BaseModel, Field
from typing import List, Dict, Any

from aurixa_llm.types import ToolDefinition

class AgentTask(BaseModel):
    """Represents a single task for an agent to execute."""
    prompt: str
    session_id: str | None = None
    tools: List[ToolDefinition] | None = None
    metadata: Dict[str, Any] = Field(default_factory=dict)

class AgentResult(BaseModel):
    """The result of an agent task execution."""
    output: str = Field(description="The final output from the agent.")
    tool_calls: List[Dict[str, Any]] = Field(description="A list of tool calls made by the agent.", default_factory=list)
    cost: float = Field(description="Estimated cost of the agent execution.", default=0.0)
    steps: List[Dict[str, Any]] = Field(description="A list of the agent's reasoning steps.", default_factory=list)

class RunTaskRequest(BaseModel):
    """Request to run an agent task."""
    task: AgentTask

class RunTaskResponse(BaseModel):
    """Response from running an agent task."""
    result: AgentResult
