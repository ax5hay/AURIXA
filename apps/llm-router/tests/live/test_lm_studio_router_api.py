"""Live LM Studio tests for llm-router HTTP API and gateway proxy."""

from __future__ import annotations

import json
import os
import uuid

import httpx
import pytest

from tests.support.lm_studio import DEFAULT_MODEL, REQUEST_TIMEOUT_SECONDS

LIVE_MAX_TOKENS = int(os.getenv("LM_STUDIO_LIVE_MAX_TOKENS", "256"))

pytestmark = pytest.mark.live


@pytest.mark.asyncio
async def test_route_selects_local_model(live_llm_router: dict[str, str]) -> None:
    async with httpx.AsyncClient(timeout=live_llm_router["timeout"]) as client:
        response = await client.post(
            f"{live_llm_router['base_url']}/api/v1/route",
            json={"prompt": "What are your clinic hours?"},
        )
        response.raise_for_status()
        payload = response.json()

    assert payload["provider"] == "local"
    assert payload["model"]


@pytest.mark.asyncio
async def test_generate_and_stream_via_router_api(live_llm_router: dict[str, str]) -> None:
    messages = [{"role": "user", "content": "Reply with the single word HELLO."}]
    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS) as client:
        generate = await client.post(
            f"{live_llm_router['base_url']}/api/v1/generate",
            json={"messages": messages, "model": DEFAULT_MODEL, "provider": "local", "max_tokens": LIVE_MAX_TOKENS},
        )
        generate.raise_for_status()
        body = generate.json()

        stream = await client.post(
            f"{live_llm_router['base_url']}/api/v1/generate/stream",
            json={"messages": messages, "model": DEFAULT_MODEL, "provider": "local", "max_tokens": LIVE_MAX_TOKENS},
        )
        stream.raise_for_status()
        deltas: list[str] = []
        async for line in stream.aiter_lines():
            if not line.strip():
                continue
            event = json.loads(line)
            if event.get("type") == "delta":
                deltas.append(event.get("content", ""))

    assert body["content"].strip()
    assert "hello" in body["content"].lower()
    assert "".join(deltas).strip()


@pytest.mark.asyncio
async def test_multi_turn_generate_via_router_api(live_llm_router: dict[str, str]) -> None:
    session_code = uuid.uuid4().hex[:8]
    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS) as client:
        first = await client.post(
            f"{live_llm_router['base_url']}/api/v1/generate",
            json={
                "messages": [
                    {"role": "system", "content": "Remember short codes the user gives you."},
                    {"role": "user", "content": f"Remember code {session_code}. Reply ACK."},
                ],
                "model": DEFAULT_MODEL,
                "provider": "local",
                "temperature": 0.0,
                "max_tokens": LIVE_MAX_TOKENS,
            },
        )
        first.raise_for_status()
        first_text = first.json()["content"]

        second = await client.post(
            f"{live_llm_router['base_url']}/api/v1/generate",
            json={
                "messages": [
                    {"role": "system", "content": "Remember short codes the user gives you."},
                    {"role": "user", "content": f"Remember code {session_code}. Reply ACK."},
                    {"role": "assistant", "content": first_text},
                    {"role": "user", "content": "What code did I give you? Reply with the code only."},
                ],
                "model": DEFAULT_MODEL,
                "provider": "local",
                "temperature": 0.0,
                "max_tokens": LIVE_MAX_TOKENS,
            },
        )
        second.raise_for_status()

    assert session_code in second.json()["content"]


@pytest.mark.asyncio
async def test_generate_via_api_gateway_proxy(live_llm_router: dict[str, str], live_api_gateway: dict[str, str]) -> None:
    del live_llm_router
    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS) as client:
        response = await client.post(
            f"{live_api_gateway['base_url']}/api/v1/llm/generate",
            json={
                "messages": [{"role": "user", "content": "Say OK."}],
                "model": DEFAULT_MODEL,
                "provider": "local",
                "max_tokens": LIVE_MAX_TOKENS,
            },
        )
        response.raise_for_status()

    assert response.json()["content"].strip()
