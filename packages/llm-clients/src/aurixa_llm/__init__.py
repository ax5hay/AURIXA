"""AURIXA LLM Clients -- pluggable LLM abstraction layer.

Provides a unified interface for OpenAI, Anthropic, Google Gemini,
and OpenAI-compatible (LM Studio) backends with automatic fallback routing.
"""

from .anthropic_client import AnthropicClient
from .base import LLMClient
from .gemini_client import GeminiClient
from .openai_client import OpenAIClient
from .router import LLMRouter
from .types import (
    LLMMessage,
    LLMProvider,
    LLMRequest,
    LLMResponse,
    TokenUsage,
    ToolCall,
    ToolDefinition,
)

__all__ = [
    "AnthropicClient",
    "GeminiClient",
    "LLMClient",
    "LLMMessage",
    "LLMProvider",
    "LLMRequest",
    "LLMResponse",
    "LLMRouter",
    "OpenAIClient",
    "TokenUsage",
    "ToolCall",
    "ToolDefinition",
]
