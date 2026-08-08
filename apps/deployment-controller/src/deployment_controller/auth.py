from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Any

import jwt
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .config import Settings, get_settings

GITHUB_OIDC_ISSUER = "https://token.actions.githubusercontent.com"
bearer = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class Principal:
    subject: str
    roles: frozenset[str]
    tenant_id: str | None


def _decode_deployment_token(token: str, settings: Settings) -> dict[str, Any]:
    if not settings.deployment_jwt_secret:
        raise HTTPException(status_code=503, detail="Deployment authentication is not configured")
    if len(settings.deployment_jwt_secret) < 32:
        raise HTTPException(status_code=503, detail="Deployment authentication secret is too short")
    try:
        return jwt.decode(
            token,
            settings.deployment_jwt_secret,
            algorithms=["HS256"],
            issuer=settings.deployment_jwt_issuer,
            audience=settings.deployment_jwt_audience,
            options={"require": ["exp", "iat", "iss", "aud", "sub"]},
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid deployment access token") from exc


async def require_admin(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    settings: Settings = Depends(get_settings),
) -> Principal:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Bearer token required")
    claims = _decode_deployment_token(credentials.credentials, settings)
    raw_roles = claims.get("roles", [])
    if not isinstance(raw_roles, list) or not all(isinstance(role, str) for role in raw_roles):
        raise HTTPException(status_code=401, detail="Invalid roles claim")
    roles = frozenset(raw_roles)
    if not roles.intersection(settings.admin_roles):
        raise HTTPException(status_code=403, detail="Deployment administrator role required")
    return Principal(str(claims["sub"]), roles, claims.get("tenantId"))


async def require_write_enabled(
    principal: Principal = Depends(require_admin),
    settings: Settings = Depends(get_settings),
) -> Principal:
    if not settings.deployment_writes_enabled:
        raise HTTPException(
            status_code=503,
            detail="Deployment writes are disabled; set DEPLOYMENT_WRITES_ENABLED=true after configuring authentication",
        )
    return principal


def _remote_github_claims(token: str, settings: Settings) -> dict[str, Any]:
    key = jwt.PyJWKClient(settings.github_oidc_jwks_url).get_signing_key_from_jwt(token)
    return jwt.decode(
        token,
        key.key,
        algorithms=["RS256"],
        issuer=GITHUB_OIDC_ISSUER,
        audience=settings.github_oidc_audience,
        options={"require": ["exp", "iat", "iss", "aud", "sub", "repository"]},
    )


async def verify_github_callback(
    request: Request,
    settings: Settings = Depends(get_settings),
) -> dict[str, Any]:
    auth = request.headers.get("authorization", "")
    if not auth.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="GitHub OIDC bearer token required")
    token = auth.split(" ", 1)[1]
    try:
        if settings.github_oidc_local_dev_secret and not settings.is_production:
            if len(settings.github_oidc_local_dev_secret) < 32:
                raise HTTPException(status_code=503, detail="Local GitHub OIDC secret is too short")
            claims = jwt.decode(
                token,
                settings.github_oidc_local_dev_secret,
                algorithms=["HS256"],
                issuer=GITHUB_OIDC_ISSUER,
                audience=settings.github_oidc_audience,
                options={"require": ["exp", "iat", "iss", "aud", "sub", "repository"]},
            )
        else:
            claims = await asyncio.to_thread(_remote_github_claims, token, settings)
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid GitHub OIDC token") from exc

    repository = claims.get("repository")
    if not settings.allowed_repositories:
        raise HTTPException(status_code=503, detail="No GitHub callback repositories configured")
    if repository not in settings.allowed_repositories:
        raise HTTPException(status_code=403, detail="GitHub repository is not authorized")
    if not str(claims.get("sub", "")).startswith(f"repo:{repository}:"):
        raise HTTPException(status_code=403, detail="GitHub subject does not match repository")
    return claims
