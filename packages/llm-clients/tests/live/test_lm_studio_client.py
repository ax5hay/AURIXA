"""Live LM Studio tests for the OpenAI-compatible client and router abstraction."""

from __future__ import annotations

import os

import pytest

from aurixa_llm.openai_client import OpenAIClient
from aurixa_llm.router import LLMRouter
from aurixa_llm.types import LLMMessage, LLMProvider, LLMRequest

from tests.support.lm_studio import DEFAULT_MODEL, REQUEST_TIMEOUT_SECONDS

LIVE_MAX_TOKENS = int(os.getenv("LM_STUDIO_LIVE_MAX_TOKENS", "256"))


pytestmark = pytest.mark.live


@pytest.mark.asyncio
async def test_openai_client_lists_models_and_generates(live_lm_studio: dict[str, str]) -> None:
    client = OpenAIClient(
        base_url=live_lm_studio["base_url"],
        api_key="not-needed",
        default_model=DEFAULT_MODEL,
        timeout=REQUEST_TIMEOUT_SECONDS,
    )

    assert await client.health_check() is True

    response = await client.generate(
        LLMRequest(
            messages=[LLMMessage(role="user", content="Reply with exactly the word READY.")],
            model=DEFAULT_MODEL,
            temperature=0.0,
            max_tokens=LIVE_MAX_TOKENS,
        )
    )

    assert response.content.strip()
    assert "ready" in response.content.lower()
    assert response.provider == LLMProvider.LOCAL
    assert response.usage.total_tokens > 0


@pytest.mark.asyncio
async def test_openai_client_streams_completion(live_lm_studio: dict[str, str]) -> None:
    client = OpenAIClient(
        base_url=live_lm_studio["base_url"],
        api_key="not-needed",
        default_model=DEFAULT_MODEL,
        timeout=REQUEST_TIMEOUT_SECONDS,
    )

    chunks: list[str] = []
    async for delta in client.generate_stream(
        LLMRequest(
            messages=[LLMMessage(role="user", content="Count from one to three separated by spaces.")],
            model=DEFAULT_MODEL,
            temperature=0.0,
            max_tokens=LIVE_MAX_TOKENS,
            stream=True,
        )
    ):
        chunks.append(delta)

    streamed = "".join(chunks).strip()
    assert streamed
    assert any(token in streamed.lower() for token in ("1", "one", "2", "two", "3", "three"))


@pytest.mark.asyncio
async def test_llm_router_multi_turn_conversation(live_lm_studio: dict[str, str]) -> None:
    router = LLMRouter.__new__(LLMRouter)
    router._clients = {}
    router._fallback_order = []
    router.register(
        LLMProvider.LOCAL,
        OpenAIClient(
            base_url=live_lm_studio["base_url"],
            api_key="not-needed",
            default_model=DEFAULT_MODEL,
            timeout=REQUEST_TIMEOUT_SECONDS,
        ),
    )

    first = await router.generate(
        LLMRequest(
            messages=[
                LLMMessage(role="system", content="You are a concise assistant. Remember facts the user gives you."),
                LLMMessage(role="user", content="My favorite color is teal. Reply with ACK only."),
            ],
            model=DEFAULT_MODEL,
            temperature=0.0,
            max_tokens=LIVE_MAX_TOKENS,
        ),
        provider=LLMProvider.LOCAL,
    )
    assert first.content.strip()

    second = await router.generate(
        LLMRequest(
            messages=[
                LLMMessage(role="system", content="You are a concise assistant. Remember facts the user gives you."),
                LLMMessage(role="user", content="My favorite color is teal. Reply with ACK only."),
                LLMMessage(role="assistant", content=first.content),
                LLMMessage(role="user", content="What is my favorite color? Reply with one word only."),
            ],
            model=DEFAULT_MODEL,
            temperature=0.0,
            max_tokens=LIVE_MAX_TOKENS,
        ),
        provider=LLMProvider.LOCAL,
    )

    assert "teal" in second.content.lower()
