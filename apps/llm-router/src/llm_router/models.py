"""Pydantic models for the LLM Router service."""

from pydantic import BaseModel, Field
from typing import List, Dict, Any

from aurixa_llm.types import LLMProvider, LLMMessage, ToolDefinition, LLMResponse


class RouteRequest(BaseModel):
    """Request to the LLM Router to get a model assignment."""
    prompt: str
    session_id: str | None = None
    user_id: str | None = None
    tenant_id: str | None = None


class RouteResponse(BaseModel):
    """Response from the LLM Router."""
    model: str = Field(description="The suggested model to use for this request.")
    provider: LLMProvider = Field(description="The provider for the suggested model.")
    confidence: float = Field(description="Confidence score for the routing decision.", default=1.0)
    metadata: Dict[str, Any] = Field(description="Additional metadata about the routing decision.", default_factory=dict)


class GenerateRequest(BaseModel):
    """Request to generate text using a specific model."""
    messages: List[LLMMessage]
    model: str | None = None
    provider: LLMProvider | None = None
    temperature: float = 0.7
    max_tokens: int = 1024
    tools: List[ToolDefinition] | None = None


# The response from the generate endpoint is the same as the one from the client
GenerateResponse = LLMResponse
