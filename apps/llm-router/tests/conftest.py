"""Pytest configuration for aurixa-llm-router live integration tests."""

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

LLM_ROUTER_URL = os.getenv("LLM_ROUTER_URL", "http://localhost:8002")
API_GATEWAY_URL = os.getenv("API_GATEWAY_URL", "http://localhost:3000")


def pytest_configure(config: pytest.Config) -> None:
    config.addinivalue_line(
        "markers",
        "live: integration test against running LM Studio and llm-router",
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
async def live_llm_router(live_lm_studio: dict[str, str]) -> dict[str, str]:
    del live_lm_studio
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            health = await client.get(f"{LLM_ROUTER_URL}/health")
            health.raise_for_status()
            providers = await client.get(f"{LLM_ROUTER_URL}/api/v1/providers")
            providers.raise_for_status()
            payload = providers.json()
            local = next((p for p in payload.get("providers", []) if p.get("id") == "local"), None)
            if not local or not local.get("healthy"):
                raise RuntimeError(
                    "llm-router local provider is not healthy; set LM_STUDIO_BASE_URL=http://host.docker.internal:1234/v1 for Docker"
                )
    except Exception as exc:
        if os.getenv(LIVE_TESTS_ENV) == "1":
            pytest.fail(str(exc))
        pytest.skip(str(exc))
    return {"base_url": LLM_ROUTER_URL, "timeout": REQUEST_TIMEOUT_SECONDS}


@pytest.fixture(scope="session")
def live_api_gateway() -> dict[str, str]:
    return {"base_url": API_GATEWAY_URL, "timeout": REQUEST_TIMEOUT_SECONDS}
