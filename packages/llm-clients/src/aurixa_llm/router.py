"""Config-driven LLM router with automatic provider detection and fallback."""

from __future__ import annotations

import os
from collections.abc import AsyncIterator
from typing import Any

from loguru import logger

from .anthropic_client import AnthropicClient
from .base import LLMClient
from .gemini_client import GeminiClient
from .openai_client import OpenAIClient
from .types import LLMProvider, LLMRequest, LLMResponse


class LLMRouter:
    """Routes LLM requests to configured providers with fallback support.

    On initialisation the router inspects environment variables to discover
    which provider API keys are available and builds an ordered fallback
    chain automatically.  Providers can also be registered (or hot-swapped)
    at runtime via :meth:`register`.
    """

    def __init__(self) -> None:
        self._clients: dict[LLMProvider, LLMClient] = {}
        self._fallback_order: list[LLMProvider] = []
        self._initialize_clients()

    # ------------------------------------------------------------------
    # Initialisation
    # ------------------------------------------------------------------

    def _initialize_clients(self) -> None:
        """Auto-detect providers. Local (LM Studio) first for cost savings; cloud as selectable options."""
        # 1. Local LM Studio - primary for dev (cost-free)
        # LM Studio serves at http://127.0.0.1:1234; OpenAI-compatible API is at /v1
        raw = os.getenv("LM_STUDIO_BASE_URL", "http://127.0.0.1:1234").rstrip("/")
        lm_studio_url = f"{raw}/v1" if "/v1" not in raw else raw
        try:
            self._clients[LLMProvider.LOCAL] = OpenAIClient(
                base_url=lm_studio_url, api_key="not-needed"
            )
            self._fallback_order.append(LLMProvider.LOCAL)
        except Exception as e:
            logger.warning("LM Studio not available: {}", e)

        # 2. Cloud providers - selectable (use placeholder keys if unset; calls fail until real key configured)
        try:
            key = os.getenv("OPENAI_API_KEY") or "sk-placeholder"
            self._clients[LLMProvider.OPENAI] = OpenAIClient(api_key=key)
            self._fallback_order.append(LLMProvider.OPENAI)
        except Exception as e:
            logger.warning("OpenAI provider not available: {}", e)
        try:
            key = os.getenv("ANTHROPIC_API_KEY") or "sk-ant-placeholder"
            self._clients[LLMProvider.ANTHROPIC] = AnthropicClient(api_key=key)
            self._fallback_order.append(LLMProvider.ANTHROPIC)
        except Exception as e:
            logger.warning("Anthropic provider not available: {}", e)
        try:
            key = os.getenv("GOOGLE_AI_API_KEY") or "placeholder"
            self._clients[LLMProvider.GEMINI] = GeminiClient(api_key=key)
            self._fallback_order.append(LLMProvider.GEMINI)
        except Exception as e:
            logger.warning("Gemini provider not available: {}", e)

        logger.info(
            "LLM Router initialized with providers: {}",
            [p.value for p in self._fallback_order],
        )

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    @property
    def providers(self) -> list[LLMProvider]:
        """Return the list of currently-registered providers in fallback order."""
        return list(self._fallback_order)

    def register(self, provider: LLMProvider, client: LLMClient) -> None:
        """Hot-swap or register a new provider client.

        If the provider is already present its client is replaced.  If it is
        new it is appended to the end of the fallback chain.
        """
        self._clients[provider] = client
        if provider not in self._fallback_order:
            self._fallback_order.append(provider)
        logger.info("Registered provider: {}", provider.value)

    def unregister(self, provider: LLMProvider) -> None:
        """Remove a provider from the router entirely."""
        self._clients.pop(provider, None)
        if provider in self._fallback_order:
            self._fallback_order.remove(provider)
        logger.info("Unregistered provider: {}", provider.value)

    async def generate(
        self,
        request: LLMRequest,
        provider: LLMProvider | None = None,
    ) -> LLMResponse:
        """Route a request to the specified provider or try the fallback chain.

        Args:
            request: The generation request.
            provider: Optional explicit provider.  When ``None`` the router
                iterates through the fallback chain until one succeeds.

        Returns:
            The first successful ``LLMResponse``.

        Raises:
            RuntimeError: If all providers fail (or none are registered).
        """
        if provider and provider in self._clients:
            return await self._clients[provider].generate(request)

        if not self._fallback_order:
            raise RuntimeError(
                "No LLM providers are configured. "
                "Set at least one of OPENAI_API_KEY, ANTHROPIC_API_KEY, "
                "GOOGLE_AI_API_KEY, or LM_STUDIO_BASE_URL."
            )

        last_error: Exception | None = None
        for p in self._fallback_order:
            try:
                return await self._clients[p].generate(request)
            except Exception as exc:
                logger.warning("Provider {} failed: {}", p.value, exc)
                last_error = exc
                continue

        raise RuntimeError(f"All LLM providers failed. Last error: {last_error}")

    async def generate_stream(
        self,
        request: LLMRequest,
        provider: LLMProvider | None = None,
    ) -> AsyncIterator[str]:
        """Stream completion tokens. Uses specified provider or fallback chain.
        Providers that do not implement generate_stream yield the full content once."""
        if provider and provider in self._clients:
            async for chunk in self._clients[provider].generate_stream(request):
                yield chunk
            return
        if not self._fallback_order:
            raise RuntimeError("No LLM providers configured.")
        last_error: Exception | None = None
        for p in self._fallback_order:
            try:
                async for chunk in self._clients[p].generate_stream(request):
                    yield chunk
                return
            except Exception as exc:
                logger.warning("Provider {} stream failed: {}", p.value, exc)
                last_error = exc
                continue
        raise RuntimeError(f"All LLM providers failed. Last error: {last_error}")

    async def health(self) -> dict[str, bool]:
        """Run health checks across all registered providers.

        Returns:
            Mapping of provider name to health status.
        """
        results: dict[str, bool] = {}
        for provider, client in self._clients.items():
            try:
                results[provider.value] = await client.health_check()
            except Exception:
                results[provider.value] = False
        return results
