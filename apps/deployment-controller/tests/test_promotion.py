from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException
from starlette.requests import Request

from aurixa_db import models

from deployment_controller.config import Settings
from deployment_controller.main import promote_from_github_actions
from deployment_controller.schemas import PromotionPayload


class Result:
    def __init__(self, values):
        self.values = list(values)

    def scalar_one_or_none(self):
        return self.values[0] if self.values else None

    def scalars(self):
        return self

    def first(self):
        return self.values[0] if self.values else None

    def __iter__(self):
        return iter(self.values)


def request() -> Request:
    return Request(
        {
            "type": "http",
            "method": "POST",
            "path": "/api/v1/callbacks/github-actions/promote",
            "headers": [(b"x-request-id", b"promotion-test")],
        }
    )


def payload(environment: str = "staging") -> PromotionPayload:
    return PromotionPayload(
        environment=environment,
        version="v1.2.3",
        git_sha="0123456789abcdef",
        artifact_run_id=123456,
        services=["api-gateway"],
        strategy="canary",
    )


def settings() -> Settings:
    return Settings(
        github_oidc_repositories="aurixa/platform",
        github_promotion_environments="staging,preprod,production",
        deployment_allowed_services="api-gateway,llm-router",
    )


def session(*results: Result):
    db = MagicMock()
    db.execute = AsyncMock(side_effect=results)
    db.flush = AsyncMock()
    db.commit = AsyncMock()
    db.rollback = AsyncMock()
    db.refresh = AsyncMock()
    return db


@pytest.mark.asyncio
async def test_trusted_promotion_creates_audited_job_and_dispatches(monkeypatch):
    environment = models.DeploymentEnvironment(
        id=1,
        name="staging",
        repository="aurixa/platform",
        is_active=True,
        requires_approval=False,
    )
    db = session(Result([environment]), Result([]))

    async def assign_ids():
        for item in db.add.call_args_list:
            model = item.args[0]
            if isinstance(model, models.DeploymentRelease):
                model.id = 10
            elif isinstance(model, models.DeploymentJob):
                model.id = 20

    db.flush.side_effect = assign_ids
    dispatch = AsyncMock()
    monkeypatch.setattr("deployment_controller.main.dispatch_job", dispatch)

    response = await promote_from_github_actions(
        payload(),
        request(),
        {"repository": "aurixa/platform", "run_id": "777", "ref": "refs/heads/main"},
        settings(),
        db,
    )

    release = next(
        call.args[0]
        for call in db.add.call_args_list
        if isinstance(call.args[0], models.DeploymentRelease)
    )
    assert release.requested_by == "github-actions:aurixa/platform:777"
    assert release.metadata_json["artifactRunId"] == "123456"
    assert release.metadata_json["workflowRunId"] == "777"
    assert any(
        isinstance(call.args[0], models.DeploymentAudit)
        and call.args[0].action == "automatic_promotion_requested"
        for call in db.add.call_args_list
    )
    dispatch.assert_awaited_once()
    assert response["idempotent"] is False


@pytest.mark.asyncio
async def test_promotion_never_allows_production(monkeypatch):
    dispatch = AsyncMock()
    monkeypatch.setattr("deployment_controller.main.dispatch_job", dispatch)

    with pytest.raises(HTTPException) as exc:
        await promote_from_github_actions(
            payload("production"),
            request(),
            {"repository": "aurixa/platform", "run_id": "777"},
            settings(),
            session(),
        )

    assert exc.value.status_code == 403
    dispatch.assert_not_awaited()


@pytest.mark.asyncio
async def test_repeated_promotion_returns_existing_job_without_redispatch(monkeypatch):
    environment = models.DeploymentEnvironment(
        id=1,
        name="staging",
        repository="aurixa/platform",
        is_active=True,
        requires_approval=False,
    )
    release = models.DeploymentRelease(
        id=10,
        public_id="existing-release",
        environment_id=1,
        version="v1.2.3",
        git_sha="0123456789abcdef",
        requested_by="github-actions:aurixa/platform:777",
        status="queued",
        idempotency_key="existing",
        request_fingerprint="fingerprint",
        metadata_json={},
    )
    job = models.DeploymentJob(
        id=20,
        public_id="existing-job",
        release_id=10,
        status="queued",
    )
    db = session(Result([environment]), Result([release]), Result([job]))
    dispatch = AsyncMock()
    monkeypatch.setattr("deployment_controller.main.dispatch_job", dispatch)

    response = await promote_from_github_actions(
        payload(),
        request(),
        {"repository": "aurixa/platform", "run_id": "777"},
        settings(),
        db,
    )

    assert response["idempotent"] is True
    assert response["jobs"][0]["id"] == "existing-job"
    dispatch.assert_not_awaited()


@pytest.mark.asyncio
async def test_promotion_rejects_repository_mismatch():
    environment = models.DeploymentEnvironment(
        id=1,
        name="staging",
        repository="aurixa/platform",
        is_active=True,
        requires_approval=False,
    )

    with pytest.raises(HTTPException) as exc:
        await promote_from_github_actions(
            payload(),
            request(),
            {"repository": "other/repository", "run_id": "777"},
            settings(),
            session(Result([environment])),
        )

    assert exc.value.status_code == 403
