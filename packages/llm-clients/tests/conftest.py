"""Pytest configuration for aurixa-llm-clients."""

from __future__ import annotations

import os

import pytest
import pytest_asyncio

from tests.support.lm_studio import (
    LIVE_TESTS_ENV,
    assert_lm_studio_available,
    host_lm_studio_base_url,
)


def pytest_configure(config: pytest.Config) -> None:
    config.addinivalue_line(
        "markers",
        "live: integration test against a running LM Studio instance",
    )


@pytest_asyncio.fixture(scope="session")
async def live_lm_studio() -> dict[str, str]:
    """Session-scoped LM Studio availability for live integration tests."""
    base_url = host_lm_studio_base_url()
    force = os.getenv(LIVE_TESTS_ENV) == "1"
    try:
        return await assert_lm_studio_available(base_url)
    except RuntimeError as exc:
        if force:
            pytest.fail(str(exc))
        pytest.skip(str(exc))
