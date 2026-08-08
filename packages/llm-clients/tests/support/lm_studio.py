"""Shared helpers for live LM Studio integration tests."""

from __future__ import annotations

import os

import httpx

DEFAULT_MODEL = os.getenv("LM_STUDIO_MODEL", "nvidia/nemotron-3-nano-4b")
LIVE_TESTS_ENV = "RUN_LIVE_LLM_TESTS"
REQUEST_TIMEOUT_SECONDS = float(os.getenv("LM_STUDIO_TEST_TIMEOUT", "120"))


def lm_studio_base_url() -> str:
    raw = os.getenv("LM_STUDIO_BASE_URL", "http://127.0.0.1:1234").rstrip("/")
    return raw if "/v1" in raw else f"{raw}/v1"


def host_lm_studio_base_url() -> str:
    """URL for tests running on the host against a local LM Studio instance."""
    return "http://127.0.0.1:1234/v1"


async def is_lm_studio_reachable(base_url: str | None = None) -> bool:
    base = (base_url or host_lm_studio_base_url()).rstrip("/").replace("/v1", "")
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{base}/v1/models")
            if response.status_code != 200:
                return False
            models = response.json().get("data", [])
            return any(model.get("id") for model in models)
    except Exception:
        return False


async def assert_lm_studio_available(base_url: str | None = None) -> dict[str, str]:
    """Return LM Studio connection info or raise/skip via pytest in conftest."""
    url = base_url or host_lm_studio_base_url()
    if not await is_lm_studio_reachable(url):
        raise RuntimeError(f"LM Studio is not reachable at {url}")
    return {"base_url": url, "model": DEFAULT_MODEL}
