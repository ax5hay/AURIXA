from __future__ import annotations

import time
from contextlib import asynccontextmanager
from typing import Any

import httpx
import jwt

from .config import Settings


class GitHubConfigurationError(RuntimeError):
    pass


class GitHubAppClient:
    """Minimal GitHub App client for workflow dispatch and run cancellation."""

    def __init__(self, settings: Settings, client: httpx.AsyncClient | None = None):
        self.settings = settings
        self._client = client

    def _app_jwt(self) -> str:
        if not self.settings.github_app_id or not self.settings.github_app_private_key:
            raise GitHubConfigurationError("GitHub App credentials are not configured")
        now = int(time.time())
        private_key = self.settings.github_app_private_key.replace("\\n", "\n")
        return jwt.encode(
            {"iat": now - 60, "exp": now + 540, "iss": self.settings.github_app_id},
            private_key,
            algorithm="RS256",
        )

    @asynccontextmanager
    async def _http_client(self):
        if self._client is not None:
            yield self._client
        else:
            async with httpx.AsyncClient(timeout=15) as client:
                yield client

    async def _installation_token(self) -> str:
        if not self.settings.github_app_installation_id:
            raise GitHubConfigurationError("GitHub App installation ID is not configured")
        async with self._http_client() as client:
            response = await client.post(
                f"{self.settings.github_api_url}/app/installations/"
                f"{self.settings.github_app_installation_id}/access_tokens",
                headers={
                    "authorization": f"Bearer {self._app_jwt()}",
                    "accept": "application/vnd.github+json",
                    "x-github-api-version": "2022-11-28",
                },
            )
            response.raise_for_status()
            return str(response.json()["token"])

    async def dispatch(
        self,
        repository: str,
        ref: str,
        inputs: dict[str, Any],
    ) -> None:
        token = await self._installation_token()
        async with self._http_client() as client:
            response = await client.post(
                f"{self.settings.github_api_url}/repos/{repository}/actions/workflows/"
                f"{self.settings.github_workflow_file}/dispatches",
                headers={
                    "authorization": f"Bearer {token}",
                    "accept": "application/vnd.github+json",
                    "x-github-api-version": "2022-11-28",
                },
                json={"ref": ref, "inputs": inputs},
            )
            response.raise_for_status()

    async def cancel_run(self, repository: str, run_id: str) -> None:
        token = await self._installation_token()
        async with self._http_client() as client:
            response = await client.post(
                f"{self.settings.github_api_url}/repos/{repository}/actions/runs/{run_id}/cancel",
                headers={
                    "authorization": f"Bearer {token}",
                    "accept": "application/vnd.github+json",
                    "x-github-api-version": "2022-11-28",
                },
            )
            if response.status_code != 409:
                response.raise_for_status()
