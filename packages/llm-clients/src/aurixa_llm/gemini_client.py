"""Google Gemini LLM client implementation."""

from __future__ import annotations

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
_GEMINI_PRICING: dict[str, dict[str, float]] = {
    "gemini-2.0-flash": {"prompt": 0.0001, "completion": 0.0004},
    "gemini-2.0-flash-lite": {"prompt": 0.000075, "completion": 0.0003},
    "gemini-1.5-pro": {"prompt": 0.00125, "completion": 0.005},
    "gemini-1.5-flash": {"prompt": 0.000075, "completion": 0.0003},
    "gemini-1.5-flash-8b": {"prompt": 0.0000375, "completion": 0.00015},
}

DEFAULT_MODEL = "gemini-2.0-flash"


class GeminiClient(LLMClient):
    """Async client for the Google Generative AI (Gemini) API.

    Args:
        api_key: API key.  Falls back to ``GOOGLE_AI_API_KEY`` env var.
        default_model: Model to use when the request does not specify one.
    """

    def __init__(
        self,
        api_key: str | None = None,
        default_model: str = DEFAULT_MODEL,
    ) -> None:
        import google.generativeai as genai

        self._api_key = api_key or os.getenv("GOOGLE_AI_API_KEY", "")
        self._default_model = default_model
        self._genai = genai
        self._genai.configure(api_key=self._api_key)
        logger.debug("GeminiClient initialised (model={})", self._default_model)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def generate(self, request: LLMRequest) -> LLMResponse:
        """Send a generation request and return a normalised response."""
        import google.generativeai as genai

        model_name = request.model or self._default_model

        # Build generation config.
        generation_config = genai.GenerationConfig(
            temperature=request.temperature,
            max_output_tokens=request.max_tokens,
        )

        # Extract system instruction from messages.
        system_instruction, conversation = self._split_messages(request.messages)

        # Build the model instance.
        model_kwargs: dict[str, Any] = {
            "model_name": model_name,
            "generation_config": generation_config,
        }
        if system_instruction:
            model_kwargs["system_instruction"] = system_instruction

        # Attach tools if provided.
        if request.tools:
            model_kwargs["tools"] = self._map_tools(request.tools)

        model = genai.GenerativeModel(**model_kwargs)

        # Gemini expects a list of Content objects or plain dicts.
        contents = self._build_contents(conversation)

        start = time.perf_counter()
        try:
            response = await model.generate_content_async(contents)
        except Exception as exc:
            logger.error("Gemini generate failed for model {}: {}", model_name, exc)
            raise
        latency_ms = (time.perf_counter() - start) * 1000

        # Parse response.
        content_text = ""
        tool_calls: list[ToolCall] = []

        for candidate in response.candidates:
            for part in candidate.content.parts:
                if part.text:
                    content_text += part.text
                if hasattr(part, "function_call") and part.function_call:
                    fc = part.function_call
                    tool_calls.append(
                        ToolCall(
                            id=str(uuid.uuid4()),
                            name=fc.name,
                            arguments=dict(fc.args) if fc.args else {},
                        )
                    )

        # Token usage – Gemini exposes usage_metadata on the response.
        prompt_tokens = getattr(response.usage_metadata, "prompt_token_count", 0) or 0
        completion_tokens = (
            getattr(response.usage_metadata, "candidates_token_count", 0) or 0
        )
        total_tokens = prompt_tokens + completion_tokens
        estimated_cost = self.estimate_cost(prompt_tokens, completion_tokens, model_name)

        logger.info(
            "Gemini response: model={} tokens={}/{} latency={:.0f}ms cost=${:.6f}",
            model_name,
            prompt_tokens,
            completion_tokens,
            latency_ms,
            estimated_cost,
        )

        return LLMResponse(
            content=content_text,
            model=model_name,
            provider=LLMProvider.GEMINI,
            tool_calls=tool_calls if tool_calls else None,
            usage=TokenUsage(
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=total_tokens,
                estimated_cost_usd=estimated_cost,
            ),
            latency_ms=round(latency_ms, 2),
        )

    async def health_check(self) -> bool:
        """Verify connectivity by listing available models."""
        try:
            list(self._genai.list_models())
            return True
        except Exception as exc:
            logger.warning("Gemini health-check failed: {}", exc)
            return False

    def estimate_cost(
        self,
        prompt_tokens: int,
        completion_tokens: int,
        model: str | None = None,
    ) -> float:
        """Return estimated USD cost based on known pricing tables."""
        model = model or self._default_model
        pricing = _GEMINI_PRICING.get(model)
        if pricing is None:
            for key in _GEMINI_PRICING:
                if model.startswith(key):
                    pricing = _GEMINI_PRICING[key]
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
    def _split_messages(
        messages: list[LLMMessage],
    ) -> tuple[str | None, list[LLMMessage]]:
        """Separate system messages from the conversation."""
        system_parts: list[str] = []
        conversation: list[LLMMessage] = []
        for msg in messages:
            if msg.role == "system":
                system_parts.append(msg.content)
            else:
                conversation.append(msg)
        system_instruction = "\n".join(system_parts) if system_parts else None
        return system_instruction, conversation

    @staticmethod
    def _build_contents(messages: list[LLMMessage]) -> list[dict[str, Any]]:
        """Map internal messages to Gemini content dicts.

        Gemini uses ``user`` and ``model`` roles (not ``assistant``).
        """
        role_map = {"user": "user", "assistant": "model", "tool": "user"}
        contents: list[dict[str, Any]] = []
        for msg in messages:
            role = role_map.get(msg.role, "user")
            parts: list[dict[str, str]] = [{"text": msg.content}]
            contents.append({"role": role, "parts": parts})
        return contents

    @staticmethod
    def _map_tools(tools: list[ToolDefinition]) -> list[Any]:
        """Convert ``ToolDefinition`` objects to Gemini function declarations."""
        import google.generativeai as genai

        declarations = []
        for t in tools:
            declarations.append(
                genai.protos.FunctionDeclaration(
                    name=t.name,
                    description=t.description,
                    parameters=t.parameters,
                )
            )
        return [genai.protos.Tool(function_declarations=declarations)]
