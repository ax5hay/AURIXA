import time

import jwt
import pytest
from fastapi import HTTPException
from starlette.requests import Request

from deployment_controller.auth import GITHUB_OIDC_ISSUER, verify_github_callback
from deployment_controller.config import Settings

SECRET = "test-secret-with-at-least-32-bytes!!"


def request_with_token(token: str) -> Request:
    return Request(
        {
            "type": "http",
            "method": "POST",
            "path": "/api/v1/callbacks/github-actions",
            "headers": [(b"authorization", f"Bearer {token}".encode())],
        }
    )


def token(secret: str, repository: str = "aurixa/platform", audience: str = "callbacks") -> str:
    now = int(time.time())
    return jwt.encode(
        {
            "iss": GITHUB_OIDC_ISSUER,
            "aud": audience,
            "sub": f"repo:{repository}:environment:production",
            "repository": repository,
            "iat": now,
            "exp": now + 300,
        },
        secret,
        algorithm="HS256",
    )


@pytest.mark.asyncio
async def test_local_callback_validates_all_required_claims():
    settings = Settings(
        environment="development",
        github_oidc_audience="callbacks",
        github_oidc_repositories="aurixa/platform",
        github_oidc_local_dev_secret=SECRET,
    )
    claims = await verify_github_callback(request_with_token(token(SECRET)), settings)
    assert claims["repository"] == "aurixa/platform"


@pytest.mark.asyncio
async def test_callback_rejects_unapproved_repository():
    settings = Settings(
        environment="test",
        github_oidc_audience="callbacks",
        github_oidc_repositories="aurixa/platform",
        github_oidc_local_dev_secret=SECRET,
    )
    with pytest.raises(HTTPException) as exc:
        await verify_github_callback(
            request_with_token(token(SECRET, repository="attacker/repo")),
            settings,
        )
    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_callback_rejects_invalid_oidc_signature():
    settings = Settings(
        environment="test",
        github_oidc_audience="callbacks",
        github_oidc_repositories="aurixa/platform",
        github_oidc_local_dev_secret=SECRET,
    )
    with pytest.raises(HTTPException) as exc:
        await verify_github_callback(
            request_with_token(token("different-secret-with-at-least-32-bytes")),
            settings,
        )
    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_production_ignores_local_dev_secret(monkeypatch):
    settings = Settings(
        environment="production",
        github_oidc_audience="callbacks",
        github_oidc_repositories="aurixa/platform",
        github_oidc_local_dev_secret=SECRET,
    )

    def fail_remote(*_args):
        raise jwt.InvalidTokenError("not a GitHub key")

    monkeypatch.setattr("deployment_controller.auth._remote_github_claims", fail_remote)
    with pytest.raises(HTTPException) as exc:
        await verify_github_callback(request_with_token(token(SECRET)), settings)
    assert exc.value.status_code == 401
