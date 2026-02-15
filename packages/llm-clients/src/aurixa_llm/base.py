"""Abstract base class for all LLM provider clients."""

from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import AsyncIterator

from .types import LLMRequest, LLMResponse


class LLMClient(ABC):
    """Abstract base class for all LLM provider clients.

    Every concrete provider implementation must supply ``generate``,
    ``health_check``, and ``estimate_cost``.
    """

    async def generate_stream(self, request: LLMRequest) -> AsyncIterator[str]:
        """Stream completion tokens. Default: run generate() and yield full content once.
        Override in providers that support streaming (e.g. OpenAI/LM Studio)."""
        response = await self.generate(request)
        if response.content:
            yield response.content

    @abstractmethod
    async def generate(self, request: LLMRequest) -> LLMResponse:
        """Generate a completion from the LLM.

        Args:
            request: The fully-formed generation request.

        Returns:
            The provider's response mapped to the common schema.
        """
        ...

    @abstractmethod
    async def health_check(self) -> bool:
        """Check if the provider is reachable.

        Returns:
            ``True`` when the provider responds within a reasonable timeout.
        """
        ...

    @abstractmethod
    def estimate_cost(self, prompt_tokens: int, completion_tokens: int) -> float:
        """Estimate cost in USD for the given token usage.

        Args:
            prompt_tokens: Number of input tokens.
            completion_tokens: Number of output tokens.

        Returns:
            Estimated cost in US dollars.
        """
        ...
