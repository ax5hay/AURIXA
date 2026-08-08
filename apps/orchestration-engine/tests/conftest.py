"""Pytest configuration for orchestration-engine live integration tests."""

from __future__ import annotations

import os

import httpx
import pytest
import pytest_asyncio

from tests.support.lm_studio import (
    LIVE_TESTS_ENV,
    REQUEST_TIMEOUT_SECONDS,
    assert_lm_studio_available,
)

ORCHESTRATION_URL = os.getenv("ORCHESTRATION_URL", "http://localhost:8001")
API_GATEWAY_URL = os.getenv("API_GATEWAY_URL", "http://localhost:3000")
LLM_ROUTER_URL = os.getenv("LLM_ROUTER_URL", "http://localhost:8002")


def pytest_configure(config: pytest.Config) -> None:
    config.addinivalue_line(
        "markers",
        "live: integration test against running stack and LM Studio",
    )


@pytest_asyncio.fixture(scope="session")
async def live_lm_studio() -> dict[str, str]:
    force = os.getenv(LIVE_TESTS_ENV) == "1"
    try:
        return await assert_lm_studio_available()
    except RuntimeError as exc:
        if force:
            pytest.fail(str(exc))
        pytest.skip(str(exc))


@pytest_asyncio.fixture(scope="session")
async def live_orchestration_stack(live_lm_studio: dict[str, str]) -> dict[str, str]:
    del live_lm_studio
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            await client.get(f"{ORCHESTRATION_URL}/health").raise_for_status()
            await client.get(f"{LLM_ROUTER_URL}/health").raise_for_status()
            providers = await client.get(f"{LLM_ROUTER_URL}/api/v1/providers")
            providers.raise_for_status()
            local = next((p for p in providers.json().get("providers", []) if p.get("id") == "local"), None)
            if not local or not local.get("healthy"):
                raise RuntimeError("llm-router local provider is not healthy")
    except Exception as exc:
        if os.getenv(LIVE_TESTS_ENV) == "1":
            pytest.fail(str(exc))
        pytest.skip(str(exc))
    return {
        "orchestration_url": ORCHESTRATION_URL,
        "gateway_url": API_GATEWAY_URL,
        "timeout": REQUEST_TIMEOUT_SECONDS,
    }
