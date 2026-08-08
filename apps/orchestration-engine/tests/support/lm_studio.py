"""Shared helpers for orchestration-engine live LM Studio integration tests."""

from __future__ import annotations

import os

import httpx

DEFAULT_MODEL = os.getenv("LM_STUDIO_MODEL", "nvidia/nemotron-3-nano-4b")
LIVE_TESTS_ENV = "RUN_LIVE_LLM_TESTS"
REQUEST_TIMEOUT_SECONDS = float(os.getenv("LM_STUDIO_TEST_TIMEOUT", "120"))


async def is_lm_studio_reachable() -> bool:
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get("http://127.0.0.1:1234/v1/models")
            if response.status_code != 200:
                return False
            return bool(response.json().get("data"))
    except Exception:
        return False


async def assert_lm_studio_available() -> dict[str, str]:
    if not await is_lm_studio_reachable():
        raise RuntimeError("LM Studio is not reachable at http://127.0.0.1:1234")
    return {"model": DEFAULT_MODEL}
