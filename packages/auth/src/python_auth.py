"""
AURIXA Python Auth
==================
FastAPI dependency for JWT-based authentication, mirroring the TypeScript
@aurixa/auth package conventions.

Usage in a FastAPI router:
    from packages.auth.src.python_auth import require_auth, require_roles

    @router.get("/portfolio")
    async def get_portfolio(user: dict = Depends(require_auth)):
        tenant_id = user["tenantId"]
        ...

    @router.post("/admin/reset")
    async def admin_reset(user: dict = Depends(require_roles(["admin"]))):
        ...
"""

from __future__ import annotations

import os
from typing import Callable, List

import jwt
from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

security = HTTPBearer()

# ---------------------------------------------------------------------------
# Configuration (mirrors @aurixa/config AuthConfigSchema)
# ---------------------------------------------------------------------------
JWT_SECRET: str = os.getenv("JWT_SECRET", "change-me")
JWT_ALGORITHMS: list[str] = ["HS256"]
JWT_ISSUER: str = os.getenv("JWT_ISSUER", "aurixa")


# ---------------------------------------------------------------------------
# Core dependency – validates Bearer token and returns the payload dict
# ---------------------------------------------------------------------------
async def require_auth(
    credentials: HTTPAuthorizationCredentials = Security(security),
) -> dict:
    """FastAPI dependency that validates the JWT and returns the decoded payload.

    Raises ``HTTPException(401)`` on any validation failure.
    """
    try:
        payload: dict = jwt.decode(
            credentials.credentials,
            JWT_SECRET,
            algorithms=JWT_ALGORITHMS,
            issuer=JWT_ISSUER,
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidIssuerError:
        raise HTTPException(status_code=401, detail="Invalid token issuer")
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail=str(exc))

    # Validate expected claims are present
    for claim in ("sub", "tenantId", "roles"):
        if claim not in payload:
            raise HTTPException(
                status_code=401,
                detail=f"Token payload missing required claim: {claim}",
            )

    return payload


# ---------------------------------------------------------------------------
# Role-based access helper
# ---------------------------------------------------------------------------
def require_roles(required_roles: List[str]) -> Callable:
    """Return a FastAPI dependency that enforces role-based access.

    The user must possess **at least one** of the listed roles.

    Usage::

        @router.get("/admin")
        async def admin_only(user=Depends(require_roles(["admin"]))):
            ...
    """

    async def _dependency(
        user: dict = Depends(require_auth),
    ) -> dict:
        user_roles: list = user.get("roles", [])
        if not any(role in user_roles for role in required_roles):
            raise HTTPException(
                status_code=403,
                detail=f"Insufficient permissions. Required one of: {required_roles}",
            )
        return user

    return _dependency


# ---------------------------------------------------------------------------
# API-key authentication (service-to-service)
# ---------------------------------------------------------------------------
async def require_api_key(
    credentials: HTTPAuthorizationCredentials = Security(security),
) -> dict:
    """Validate a static API key passed as a Bearer token.

    Compares against the ``AURIXA_API_KEY`` env var. Suitable for internal
    service-to-service calls in development and staging.
    """
    expected = os.getenv("AURIXA_API_KEY")
    if not expected:
        raise HTTPException(status_code=500, detail="API key not configured")

    if not _constant_time_compare(credentials.credentials, expected):
        raise HTTPException(status_code=401, detail="Invalid API key")

    return {"tenantId": "internal", "scopes": ["*"]}


def _constant_time_compare(a: str, b: str) -> bool:
    """Constant-time string comparison to mitigate timing attacks."""
    if len(a) != len(b):
        return False
    result = 0
    for x, y in zip(a, b):
        result |= ord(x) ^ ord(y)
    return result == 0
