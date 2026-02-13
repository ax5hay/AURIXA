"""Anthropic Claude LLM client implementation."""

from __future__ import annotations

import json
import os
import time
import uuid
from typing import Any

from loguru import logger

from .base import LLMClient
from .types import (
    LLMMessage,
    LLMProvider,
    LLMRequest,
    LLMResponse,
    TokenUsage,
    ToolCall,
    ToolDefinition,
)

# Pricing per 1K tokens (USD).
_ANTHROPIC_PRICING: dict[str, dict[str, float]] = {
    "claude-opus-4-20250514": {"prompt": 0.015, "completion": 0.075},
    "claude-sonnet-4-20250514": {"prompt": 0.003, "completion": 0.015},
    "claude-3-5-sonnet-20241022": {"prompt": 0.003, "completion": 0.015},
    "claude-3-5-haiku-20241022": {"prompt": 0.0008, "completion": 0.004},
    "claude-3-opus-20240229": {"prompt": 0.015, "completion": 0.075},
    "claude-3-sonnet-20240229": {"prompt": 0.003, "completion": 0.015},
    "claude-3-haiku-20240307": {"prompt": 0.00025, "completion": 0.00125},
}

DEFAULT_MODEL = "claude-sonnet-4-20250514"


class AnthropicClient(LLMClient):
    """Async client for the Anthropic Messages API.

    Args:
        api_key: API key.  Falls back to ``ANTHROPIC_API_KEY`` env var.
        default_model: Model to use when the request does not specify one.
        timeout: HTTP request timeout in seconds.
        max_retries: Maximum number of automatic retries on transient errors.
    """

    def __init__(
        self,
        api_key: str | None = None,
        default_model: str = DEFAULT_MODEL,
        timeout: float = 120.0,
        max_retries: int = 2,
    ) -> None:
        # Import lazily so the package can be installed without anthropic
        # if only other providers are used.
        import anthropic

        self._api_key = api_key or os.getenv("ANTHROPIC_API_KEY", "")
        self._default_model = default_model
        self._client = anthropic.AsyncAnthropic(
            api_key=self._api_key,
            timeout=timeout,
            max_retries=max_retries,
        )
        logger.debug("AnthropicClient initialised (model={})", self._default_model)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def generate(self, request: LLMRequest) -> LLMResponse:
        """Send a message-creation request and return a normalised response."""
        model = request.model or self._default_model
        system_prompt, messages = self._split_system(request.messages)

        kwargs: dict[str, Any] = {
            "model": model,
            "messages": messages,
            "temperature": request.temperature,
            "max_tokens": request.max_tokens,
        }
        if system_prompt:
            kwargs["system"] = system_prompt
        if request.tools:
            kwargs["tools"] = self._map_tools(request.tools)

        start = time.perf_counter()
        try:
            response = await self._client.messages.create(**kwargs)
        except Exception as exc:
            logger.error("Anthropic generate failed for model {}: {}", model, exc)
            raise
        latency_ms = (time.perf_counter() - start) * 1000

        # Extract content and tool-use blocks.
        content_parts: list[str] = []
        tool_calls: list[ToolCall] = []
        for block in response.content:
            if block.type == "text":
                content_parts.append(block.text)
            elif block.type == "tool_use":
                tool_calls.append(
                    ToolCall(
                        id=block.id,
                        name=block.name,
                        arguments=block.input if isinstance(block.input, dict) else {},
                    )
                )

        content = "\n".join(content_parts)
        prompt_tokens = response.usage.input_tokens
        completion_tokens = response.usage.output_tokens
        total_tokens = prompt_tokens + completion_tokens
        estimated_cost = self.estimate_cost(prompt_tokens, completion_tokens, model)

        logger.info(
            "Anthropic response: model={} tokens={}/{} latency={:.0f}ms cost=${:.6f}",
            response.model,
            prompt_tokens,
            completion_tokens,
            latency_ms,
            estimated_cost,
        )

        return LLMResponse(
            content=content,
            model=response.model,
            provider=LLMProvider.ANTHROPIC,
            tool_calls=tool_calls if tool_calls else None,
            usage=TokenUsage(
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=total_tokens,
                estimated_cost_usd=estimated_cost,
            ),
            latency_ms=round(latency_ms, 2),
            metadata={"stop_reason": response.stop_reason},
        )

    async def health_check(self) -> bool:
        """Verify connectivity with a minimal request."""
        try:
            await self._client.messages.create(
                model=self._default_model,
                max_tokens=1,
                messages=[{"role": "user", "content": "ping"}],
            )
            return True
        except Exception as exc:
            logger.warning("Anthropic health-check failed: {}", exc)
            return False

    def estimate_cost(
        self,
        prompt_tokens: int,
        completion_tokens: int,
        model: str | None = None,
    ) -> float:
        """Return estimated USD cost based on known pricing tables."""
        model = model or self._default_model
        pricing = _ANTHROPIC_PRICING.get(model)
        if pricing is None:
            for key in _ANTHROPIC_PRICING:
                if model.startswith(key.rsplit("-", 1)[0]):
                    pricing = _ANTHROPIC_PRICING[key]
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
    def _split_system(
        messages: list[LLMMessage],
    ) -> tuple[str | None, list[dict[str, Any]]]:
        """Separate the system prompt from conversation messages.

        Anthropic requires the system prompt to be passed as a top-level
        parameter rather than inside the messages array.
        """
        system_prompt: str | None = None
        mapped: list[dict[str, Any]] = []

        for msg in messages:
            if msg.role == "system":
                # Concatenate multiple system messages (rare but possible).
                system_prompt = (
                    f"{system_prompt}\n{msg.content}" if system_prompt else msg.content
                )
                continue

            if msg.role == "tool":
                # Anthropic expects tool results with content as a list.
                mapped.append(
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "tool_result",
                                "tool_use_id": msg.tool_call_id or str(uuid.uuid4()),
                                "content": msg.content,
                            }
                        ],
                    }
                )
                continue

            entry: dict[str, Any] = {"role": msg.role, "content": msg.content}

            # If the assistant message contains tool calls, convert them to
            # Anthropic's content-block format.
            if msg.role == "assistant" and msg.tool_calls:
                content_blocks: list[dict[str, Any]] = []
                if msg.content:
                    content_blocks.append({"type": "text", "text": msg.content})
                for tc in msg.tool_calls:
                    content_blocks.append(
                        {
                            "type": "tool_use",
                            "id": tc.id,
                            "name": tc.name,
                            "input": tc.arguments,
                        }
                    )
                entry["content"] = content_blocks

            mapped.append(entry)

        return system_prompt, mapped

    @staticmethod
    def _map_tools(tools: list[ToolDefinition]) -> list[dict[str, Any]]:
        """Convert ``ToolDefinition`` objects to Anthropic tool format."""
        return [
            {
                "name": t.name,
                "description": t.description,
                "input_schema": t.parameters,
            }
            for t in tools
        ]
