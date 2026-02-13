"""OpenAI (and OpenAI-compatible) LLM client implementation."""

from __future__ import annotations

import json
import os
import time
from typing import Any

from loguru import logger
from openai import AsyncOpenAI

from .base import LLMClient
from .types import (
    LLMProvider,
    LLMRequest,
    LLMResponse,
    TokenUsage,
    ToolCall,
    ToolDefinition,
)

# Pricing per 1K tokens (USD) for common models – used for cost estimation.
# Kept as a simple dict so it is easy to extend without touching logic.
_OPENAI_PRICING: dict[str, dict[str, float]] = {
    "gpt-4o": {"prompt": 0.0025, "completion": 0.01},
    "gpt-4o-mini": {"prompt": 0.00015, "completion": 0.0006},
    "gpt-4-turbo": {"prompt": 0.01, "completion": 0.03},
    "gpt-4": {"prompt": 0.03, "completion": 0.06},
    "gpt-3.5-turbo": {"prompt": 0.0005, "completion": 0.0015},
    "o1": {"prompt": 0.015, "completion": 0.06},
    "o1-mini": {"prompt": 0.003, "completion": 0.012},
    "o3-mini": {"prompt": 0.0011, "completion": 0.0044},
}

DEFAULT_MODEL = "gpt-4o"


class OpenAIClient(LLMClient):
    """Async client for OpenAI and any OpenAI-compatible endpoint (e.g. LM Studio).

    Args:
        api_key: API key.  Falls back to ``OPENAI_API_KEY`` env var.
        base_url: Override the API base URL (useful for LM Studio or Azure).
        default_model: Model to use when the request does not specify one.
        timeout: HTTP request timeout in seconds.
    """

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        default_model: str = DEFAULT_MODEL,
        timeout: float = 120.0,
    ) -> None:
        self._api_key = api_key or os.getenv("OPENAI_API_KEY", "")
        self._base_url = base_url
        self._default_model = default_model
        self._timeout = timeout

        client_kwargs: dict[str, Any] = {
            "api_key": self._api_key,
            "timeout": self._timeout,
        }
        if self._base_url:
            client_kwargs["base_url"] = self._base_url

        self._client = AsyncOpenAI(**client_kwargs)
        self._provider = LLMProvider.LOCAL if self._base_url else LLMProvider.OPENAI

        logger.debug(
            "OpenAIClient initialised (base_url={}, model={})",
            self._base_url or "default",
            self._default_model,
        )

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def generate(self, request: LLMRequest) -> LLMResponse:
        """Send a chat-completion request and return a normalised response."""
        model = request.model or self._default_model
        messages = self._map_messages(request.messages)
        kwargs: dict[str, Any] = {
            "model": model,
            "messages": messages,
            "temperature": request.temperature,
            "max_tokens": request.max_tokens,
        }

        if request.tools:
            kwargs["tools"] = self._map_tools(request.tools)
            kwargs["tool_choice"] = "auto"

        start = time.perf_counter()
        try:
            response = await self._client.chat.completions.create(**kwargs)
        except Exception as exc:
            logger.error("OpenAI generate failed for model {}: {}", model, exc)
            raise
        latency_ms = (time.perf_counter() - start) * 1000

        choice = response.choices[0]
        content = choice.message.content or ""

        tool_calls: list[ToolCall] | None = None
        if choice.message.tool_calls:
            tool_calls = []
            for tc in choice.message.tool_calls:
                try:
                    arguments = json.loads(tc.function.arguments)
                except (json.JSONDecodeError, TypeError):
                    arguments = {"raw": tc.function.arguments}
                tool_calls.append(
                    ToolCall(
                        id=tc.id,
                        name=tc.function.name,
                        arguments=arguments,
                    )
                )

        usage = response.usage
        prompt_tokens = usage.prompt_tokens if usage else 0
        completion_tokens = usage.completion_tokens if usage else 0
        total_tokens = usage.total_tokens if usage else 0
        estimated_cost = self.estimate_cost(prompt_tokens, completion_tokens, model)

        logger.info(
            "OpenAI response: model={} tokens={}/{} latency={:.0f}ms cost=${:.6f}",
            response.model,
            prompt_tokens,
            completion_tokens,
            latency_ms,
            estimated_cost,
        )

        return LLMResponse(
            content=content,
            model=response.model,
            provider=self._provider,
            tool_calls=tool_calls,
            usage=TokenUsage(
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=total_tokens,
                estimated_cost_usd=estimated_cost,
            ),
            latency_ms=round(latency_ms, 2),
            metadata={"finish_reason": choice.finish_reason},
        )

    async def health_check(self) -> bool:
        """Verify connectivity by listing models."""
        try:
            await self._client.models.list()
            return True
        except Exception as exc:
            logger.warning("OpenAI health-check failed: {}", exc)
            return False

    def estimate_cost(
        self,
        prompt_tokens: int,
        completion_tokens: int,
        model: str | None = None,
    ) -> float:
        """Return estimated USD cost based on known pricing tables."""
        model = model or self._default_model
        # Find the best matching pricing entry (prefix match for versioned models).
        pricing = _OPENAI_PRICING.get(model)
        if pricing is None:
            for key in _OPENAI_PRICING:
                if model.startswith(key):
                    pricing = _OPENAI_PRICING[key]
                    break
        if pricing is None:
            return 0.0
        return (prompt_tokens / 1000 * pricing["prompt"]) + (
            completion_tokens / 1000 * pricing["completion"]
        )

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _map_messages(messages: list) -> list[dict[str, Any]]:
        """Convert ``LLMMessage`` objects to the OpenAI dict format."""
        result: list[dict[str, Any]] = []
        for msg in messages:
            entry: dict[str, Any] = {"role": msg.role, "content": msg.content}
            if msg.tool_calls:
                entry["tool_calls"] = [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {
                            "name": tc.name,
                            "arguments": json.dumps(tc.arguments),
                        },
                    }
                    for tc in msg.tool_calls
                ]
            if msg.tool_call_id:
                entry["tool_call_id"] = msg.tool_call_id
            result.append(entry)
        return result

    @staticmethod
    def _map_tools(tools: list[ToolDefinition]) -> list[dict[str, Any]]:
        """Convert ``ToolDefinition`` objects to the OpenAI function-calling format."""
        return [
            {
                "type": "function",
                "function": {
                    "name": t.name,
                    "description": t.description,
                    "parameters": t.parameters,
                },
            }
            for t in tools
        ]
