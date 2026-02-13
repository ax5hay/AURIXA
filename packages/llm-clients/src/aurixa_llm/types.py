"""Core types for the AURIXA LLM abstraction layer."""

from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class LLMProvider(str, Enum):
    """Supported LLM provider backends."""

    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GEMINI = "gemini"
    LOCAL = "local"  # LM Studio / OpenAI-compatible


class ToolDefinition(BaseModel):
    """Schema definition for a tool that can be invoked by the LLM."""

    name: str
    description: str
    parameters: dict[str, Any]


class ToolCall(BaseModel):
    """A tool invocation requested by the LLM."""

    id: str
    name: str
    arguments: dict[str, Any]


class LLMMessage(BaseModel):
    """A single message in a conversation."""

    role: str  # system, user, assistant, tool
    content: str
    tool_calls: list[ToolCall] | None = None
    tool_call_id: str | None = None


class TokenUsage(BaseModel):
    """Token consumption and estimated cost for a single request."""

    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    estimated_cost_usd: float | None = None


class LLMRequest(BaseModel):
    """Parameters for an LLM generation request."""

    messages: list[LLMMessage]
    model: str | None = None
    temperature: float = 0.7
    max_tokens: int = 4096
    tools: list[ToolDefinition] | None = None
    stream: bool = False
    metadata: dict[str, Any] = Field(default_factory=dict)


class LLMResponse(BaseModel):
    """Result returned by an LLM provider after generation."""

    content: str
    model: str
    provider: LLMProvider
    tool_calls: list[ToolCall] | None = None
    usage: TokenUsage
    latency_ms: float
    metadata: dict[str, Any] = Field(default_factory=dict)
