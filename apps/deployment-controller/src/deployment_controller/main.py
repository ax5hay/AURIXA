from __future__ import annotations

import datetime
import hashlib
import json
import uuid
from typing import Any

import httpx
from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import or_, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from aurixa_db import get_db_session, models

from .auth import Principal, require_admin, require_write_enabled, verify_github_callback
from .config import Settings, get_settings
from .github import GitHubAppClient, GitHubConfigurationError
from .schemas import ApprovalDecision, CallbackPayload, DeploymentCreate, PromotionPayload
from .state_machine import CALLBACK_STATES, InvalidTransition, transition

app = FastAPI(title="AURIXA Deployment Controller", version="0.1.0")


def utcnow() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)


def fingerprint(data: DeploymentCreate) -> str:
    canonical = data.model_dump(exclude={"idempotency_key"}, mode="json")
    return hashlib.sha256(json.dumps(canonical, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def promotion_idempotency_key(repository: str, workflow_run_id: str, git_sha: str) -> str:
    identity = f"{repository.lower()}:{workflow_run_id}:{git_sha.lower()}"
    return f"github-promotion:{hashlib.sha256(identity.encode()).hexdigest()}"


def release_view(release: models.DeploymentRelease) -> dict[str, Any]:
    return {
        "id": release.public_id,
        "environmentId": release.environment_id,
        "version": release.version,
        "gitSha": release.git_sha,
        "requestedBy": release.requested_by,
        "status": release.status,
        "metadata": release.metadata_json,
        "rollbackOfId": release.rollback_of_id,
        "createdAt": release.created_at,
        "updatedAt": release.updated_at,
    }


def job_view(job: models.DeploymentJob) -> dict[str, Any]:
    return {
        "id": job.public_id,
        "releaseId": job.release_id,
        "kind": job.kind,
        "status": job.status,
        "githubRunId": job.github_run_id,
        "workflowRef": job.workflow_ref,
        "cancelRequested": job.cancel_requested,
        "errorMessage": job.error_message,
        "startedAt": job.started_at,
        "completedAt": job.completed_at,
        "createdAt": job.created_at,
        "updatedAt": job.updated_at,
    }


UI_STATES = {
    "pending_approval": "awaiting_approval",
    "dispatching": "queued",
    "cancel_requested": "running",
}
ACTIVE_JOB_STATES = {"pending_approval", "queued", "dispatching", "running", "cancel_requested"}
PROGRESS = {
    "pending_approval": 5,
    "queued": 10,
    "dispatching": 15,
    "running": 50,
    "cancel_requested": 75,
    "succeeded": 100,
    "failed": 100,
    "cancelled": 100,
}


def normalized_state(job: models.DeploymentJob) -> str:
    if job.kind == "rollback" and job.status in ACTIVE_JOB_STATES:
        return "rolling_back"
    if job.kind == "rollback" and job.status == "succeeded":
        return "rolled_back"
    return UI_STATES.get(job.status, job.status)


def safe_github_run_url(repository: str, run_id: str | None) -> str | None:
    if run_id and run_id.isdigit():
        return f"https://github.com/{repository}/actions/runs/{run_id}"
    return None


def release_services(release: models.DeploymentRelease) -> list[str]:
    services = (release.metadata_json or {}).get("services", [])
    return [item for item in services if isinstance(item, str)]


def workflow_inputs(
    job: models.DeploymentJob,
    release: models.DeploymentRelease,
    environment: models.DeploymentEnvironment,
    settings: Settings,
) -> dict[str, str]:
    requested_services = release_services(release)
    service_scope = (
        "all"
        if not requested_services or set(requested_services) == set(settings.allowed_services)
        else ",".join(requested_services)
    )
    return {
        "environment": environment.name,
        "release_or_artifact": (
            f"run:{release.metadata_json['artifactRunId']}"
            if (release.metadata_json or {}).get("artifactRunId")
            else release.git_sha
        ),
        "service_scope": service_scope,
        "deployment_id": job.public_id,
        "strategy": (release.metadata_json or {}).get("strategy", "rolling"),
    }


async def full_job_view(db: AsyncSession, job: models.DeploymentJob) -> dict[str, Any]:
    release = await db.get(models.DeploymentRelease, job.release_id)
    environment = await db.get(models.DeploymentEnvironment, release.environment_id)
    steps_result = await db.execute(
        select(models.DeploymentStep)
        .where(models.DeploymentStep.job_id == job.id)
        .order_by(models.DeploymentStep.id)
    )
    approval_result = await db.execute(
        select(models.DeploymentApproval)
        .where(models.DeploymentApproval.job_id == job.id)
        .order_by(models.DeploymentApproval.id.desc())
    )
    audit_result = await db.execute(
        select(models.DeploymentAudit)
        .where(
            or_(
                models.DeploymentAudit.resource_id == job.public_id,
                models.DeploymentAudit.resource_id == release.public_id,
            )
        )
        .order_by(models.DeploymentAudit.id)
    )
    steps = list(steps_result.scalars())
    approval = approval_result.scalars().first()
    audits = list(audit_result.scalars())
    checks: list[dict[str, Any]] = []
    step_views: list[dict[str, Any]] = []
    for step in steps:
        details = step.details if isinstance(step.details, dict) else {}
        raw_checks = details.get("checks", [])
        if isinstance(raw_checks, list):
            for index, check in enumerate(raw_checks):
                if not isinstance(check, dict):
                    continue
                status_value = check.get("status", "pending")
                if status_value not in {"pending", "pass", "warning", "fail"}:
                    status_value = "pending"
                candidate_url = check.get("url")
                safe_url = (
                    candidate_url
                    if isinstance(candidate_url, str)
                    and candidate_url.startswith(f"https://github.com/{environment.repository}/")
                    else None
                )
                checks.append(
                    {
                        "id": str(check.get("id") or f"{step.id}-{index}"),
                        "name": str(check.get("name") or step.name)[:255],
                        "status": status_value,
                        "detail": str(check["detail"])[:2000] if check.get("detail") else None,
                        "url": safe_url,
                    }
                )
        state_value = {
            "started": "running",
            "succeeded": "succeeded",
            "failed": "failed",
            "cancelled": "cancelled",
            "skipped": "skipped",
        }.get(step.status, "pending")
        log_excerpt = details.get("logExcerpt")
        step_views.append(
            {
                "id": str(step.id),
                "name": step.name,
                "state": state_value,
                "startedAt": step.started_at,
                "finishedAt": step.completed_at,
                "logExcerpt": str(log_excerpt)[:4000] if log_excerpt else None,
            }
        )
    approval_view = {
        "required": environment.requires_approval,
        "state": (
            approval.status
            if approval
            else ("pending" if environment.requires_approval else "not_required")
        ),
        "approvedBy": approval.decided_by if approval and approval.status == "approved" else None,
        "approvedAt": approval.decided_at if approval and approval.status == "approved" else None,
    }
    run_url = safe_github_run_url(environment.repository, job.github_run_id)
    state_value = normalized_state(job)
    return {
        "id": job.public_id,
        "release": release.version,
        "version": release.version,
        "environment": environment.name,
        "services": release_services(release),
        "strategy": (release.metadata_json or {}).get("strategy", "rolling"),
        "state": state_value,
        "progress": PROGRESS.get(job.status, 0),
        "createdAt": job.created_at,
        "createdBy": release.requested_by,
        "approval": approval_view,
        "githubUrl": run_url,
        "updatedAt": job.updated_at,
        "commitSha": release.git_sha,
        "workflowUrl": run_url,
        "steps": step_views,
        "checks": checks,
        "timeline": [
            {
                "id": str(item.id),
                "title": item.action.replace("_", " ").title(),
                "detail": (
                    str(item.details.get("message"))[:2000]
                    if isinstance(item.details, dict) and item.details.get("message")
                    else None
                ),
                "occurredAt": item.created_at,
                "actor": item.actor,
            }
            for item in audits
        ],
        "canCancel": job.status in ACTIVE_JOB_STATES,
        "canRollback": job.status == "succeeded" and job.kind == "deploy",
        "diagnostic": (
            {"message": job.error_message, "status": job.status}
            if job.error_message
            else None
        ),
    }


def audit(
    db: AsyncSession,
    actor: str,
    action: str,
    resource_type: str,
    resource_id: str,
    request_id: str | None,
    details: dict[str, Any] | None = None,
) -> None:
    db.add(
        models.DeploymentAudit(
            actor=actor,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            request_id=request_id,
            details=details or {},
        )
    )


async def get_job(db: AsyncSession, public_id: str) -> models.DeploymentJob:
    result = await db.execute(select(models.DeploymentJob).where(models.DeploymentJob.public_id == public_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Deployment job not found")
    return job


async def get_release(db: AsyncSession, public_id: str) -> models.DeploymentRelease:
    result = await db.execute(
        select(models.DeploymentRelease).where(models.DeploymentRelease.public_id == public_id)
    )
    release = result.scalar_one_or_none()
    if not release:
        raise HTTPException(status_code=404, detail="Deployment release not found")
    return release


async def dispatch_job(
    db: AsyncSession,
    job: models.DeploymentJob,
    release: models.DeploymentRelease,
    environment: models.DeploymentEnvironment,
    ref: str,
    settings: Settings,
) -> None:
    job.status = transition(job.status, "dispatching")
    job.workflow_ref = ref
    await db.commit()
    try:
        await GitHubAppClient(settings).dispatch(
            environment.repository,
            ref,
            workflow_inputs(job, release, environment, settings),
        )
        job.status = transition(job.status, "queued")
        await db.commit()
    except (GitHubConfigurationError, httpx.HTTPError) as exc:
        job.status = transition(job.status, "failed")
        job.error_message = "GitHub workflow dispatch failed"
        job.completed_at = utcnow()
        release.status = "failed"
        audit(db, "system", "dispatch_failed", "job", job.public_id, None, {"errorType": type(exc).__name__})
        await db.commit()
        raise HTTPException(status_code=502, detail="GitHub workflow dispatch failed") from exc


@app.get("/health")
async def health(db: AsyncSession = Depends(get_db_session)) -> dict[str, str]:
    try:
        await db.execute(text("SELECT 1"))
        return {"service": "deployment-controller", "status": "healthy"}
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Database unavailable") from exc


class EnvironmentCreate(BaseModel):
    name: str = Field(pattern=r"^[a-z0-9][a-z0-9-]{0,127}$")
    display_name: str = Field(min_length=1, max_length=255)
    repository: str = Field(pattern=r"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")
    github_environment: str = Field(min_length=1, max_length=255)
    requires_approval: bool = False
    configuration: dict[str, Any] = Field(default_factory=dict)


@app.get("/api/v1/environments")
async def list_environments(
    _: Principal = Depends(require_admin), db: AsyncSession = Depends(get_db_session)
):
    result = await db.execute(select(models.DeploymentEnvironment).order_by(models.DeploymentEnvironment.name))
    return [
        {
            "id": item.id,
            "name": item.name,
            "displayName": item.display_name,
            "repository": item.repository,
            "githubEnvironment": item.github_environment,
            "requiresApproval": item.requires_approval,
            "isActive": item.is_active,
            "configuration": item.configuration,
        }
        for item in result.scalars()
    ]


@app.post("/api/v1/environments", status_code=status.HTTP_201_CREATED)
async def create_environment(
    data: EnvironmentCreate,
    request: Request,
    principal: Principal = Depends(require_write_enabled),
    db: AsyncSession = Depends(get_db_session),
):
    environment = models.DeploymentEnvironment(
        name=data.name,
        display_name=data.display_name,
        repository=data.repository,
        github_environment=data.github_environment,
        requires_approval=data.requires_approval,
        configuration=data.configuration,
    )
    db.add(environment)
    try:
        await db.flush()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Deployment environment already exists") from exc
    audit(db, principal.subject, "environment_created", "environment", str(environment.id), request.headers.get("x-request-id"))
    await db.commit()
    return {"id": environment.id, "name": environment.name}


@app.get("/api/v1/environments/{environment_name}")
async def environment_detail(
    environment_name: str,
    _: Principal = Depends(require_admin),
    db: AsyncSession = Depends(get_db_session),
):
    result = await db.execute(
        select(models.DeploymentEnvironment).where(
            models.DeploymentEnvironment.name == environment_name
        )
    )
    environment = result.scalar_one_or_none()
    if not environment:
        raise HTTPException(status_code=404, detail="Deployment environment not found")
    releases = await db.execute(
        select(models.DeploymentRelease)
        .where(models.DeploymentRelease.environment_id == environment.id)
        .order_by(models.DeploymentRelease.id.desc())
        .limit(20)
    )
    return {
        "id": environment.id,
        "name": environment.name,
        "displayName": environment.display_name,
        "repository": environment.repository,
        "githubEnvironment": environment.github_environment,
        "requiresApproval": environment.requires_approval,
        "isActive": environment.is_active,
        "configuration": environment.configuration,
        "recentReleases": [release_view(item) for item in releases.scalars()],
    }


@app.get("/api/v1/releases")
async def list_releases(
    environment: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    _: Principal = Depends(require_admin),
    db: AsyncSession = Depends(get_db_session),
):
    stmt = select(models.DeploymentRelease).order_by(models.DeploymentRelease.id.desc()).limit(limit)
    if environment:
        stmt = stmt.join(models.DeploymentEnvironment).where(models.DeploymentEnvironment.name == environment)
    result = await db.execute(stmt)
    return [release_view(item) for item in result.scalars()]


@app.get("/api/v1/releases/{release_id}")
async def release_detail(
    release_id: str,
    _: Principal = Depends(require_admin),
    db: AsyncSession = Depends(get_db_session),
):
    release = await get_release(db, release_id)
    jobs = await db.execute(
        select(models.DeploymentJob)
        .where(models.DeploymentJob.release_id == release.id)
        .order_by(models.DeploymentJob.id)
    )
    view = release_view(release)
    view["jobs"] = [job_view(item) for item in jobs.scalars()]
    return view


@app.get("/api/v1/jobs")
async def list_jobs(
    limit: int = Query(default=50, ge=1, le=200),
    _: Principal = Depends(require_admin),
    db: AsyncSession = Depends(get_db_session),
):
    result = await db.execute(
        select(models.DeploymentJob).order_by(models.DeploymentJob.id.desc()).limit(limit)
    )
    return [job_view(item) for item in result.scalars()]


@app.get("/api/v1/jobs/{job_id}")
async def job_detail(
    job_id: str,
    _: Principal = Depends(require_admin),
    db: AsyncSession = Depends(get_db_session),
):
    job = await get_job(db, job_id)
    steps = await db.execute(
        select(models.DeploymentStep)
        .where(models.DeploymentStep.job_id == job.id)
        .order_by(models.DeploymentStep.id)
    )
    approvals = await db.execute(
        select(models.DeploymentApproval).where(models.DeploymentApproval.job_id == job.id)
    )
    artifacts = await db.execute(
        select(models.DeploymentArtifact).where(models.DeploymentArtifact.job_id == job.id)
    )
    view = job_view(job)
    view.update(
        steps=[
            {
                "name": step.name,
                "attempt": step.attempt,
                "status": step.status,
                "details": step.details,
                "startedAt": step.started_at,
                "completedAt": step.completed_at,
            }
            for step in steps.scalars()
        ],
        approvals=[
            {
                "id": approval.id,
                "status": approval.status,
                "requestedBy": approval.requested_by,
                "decidedBy": approval.decided_by,
                "comment": approval.comment,
            }
            for approval in approvals.scalars()
        ],
        artifacts=[
            {
                "name": artifact.name,
                "uri": artifact.uri,
                "digest": artifact.digest,
                "mediaType": artifact.media_type,
            }
            for artifact in artifacts.scalars()
        ],
    )
    return view


@app.get("/api/v1/services")
async def list_services(
    environment: str | None = None,
    _: Principal = Depends(require_admin),
    db: AsyncSession = Depends(get_db_session),
):
    stmt = select(models.ServiceRevision, models.DeploymentEnvironment).join(
        models.DeploymentEnvironment,
        models.ServiceRevision.environment_id == models.DeploymentEnvironment.id,
    )
    if environment:
        stmt = stmt.where(models.DeploymentEnvironment.name == environment)
    result = await db.execute(stmt.order_by(models.DeploymentEnvironment.name, models.ServiceRevision.service_name))
    return [
        {
            "environment": env.name,
            "service": revision.service_name,
            "revision": revision.revision,
            "imageDigest": revision.image_digest,
            "status": revision.status,
            "deployedAt": revision.deployed_at,
        }
        for revision, env in result.all()
    ]


@app.get("/api/v1/services/{service_name}")
async def service_detail(
    service_name: str,
    environment: str | None = None,
    _: Principal = Depends(require_admin),
    db: AsyncSession = Depends(get_db_session),
):
    stmt = (
        select(models.ServiceRevision, models.DeploymentEnvironment, models.DeploymentRelease)
        .join(
            models.DeploymentEnvironment,
            models.ServiceRevision.environment_id == models.DeploymentEnvironment.id,
        )
        .join(models.DeploymentRelease, models.ServiceRevision.release_id == models.DeploymentRelease.id)
        .where(models.ServiceRevision.service_name == service_name)
    )
    if environment:
        stmt = stmt.where(models.DeploymentEnvironment.name == environment)
    result = await db.execute(stmt.order_by(models.DeploymentEnvironment.name))
    revisions = result.all()
    if not revisions:
        raise HTTPException(status_code=404, detail="Service revision not found")
    return [
        {
            "environment": env.name,
            "service": revision.service_name,
            "revision": revision.revision,
            "imageDigest": revision.image_digest,
            "status": revision.status,
            "deployedAt": revision.deployed_at,
            "release": release_view(release),
        }
        for revision, env, release in revisions
    ]


@app.post("/api/v1/deployments", status_code=status.HTTP_202_ACCEPTED)
async def create_deployment(
    data: DeploymentCreate,
    request: Request,
    idempotency_header: str | None = Header(default=None, alias="Idempotency-Key"),
    principal: Principal = Depends(require_write_enabled),
    settings: Settings = Depends(get_settings),
    db: AsyncSession = Depends(get_db_session),
):
    idempotency_key = idempotency_header or data.idempotency_key
    if not idempotency_key:
        raise HTTPException(status_code=400, detail="Idempotency-Key header is required")
    unknown_services = sorted(set(data.services) - set(settings.allowed_services))
    if unknown_services:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown deployment services: {', '.join(unknown_services)}",
        )
    if data.environment == "production" and data.production_confirmation != "DEPLOY PRODUCTION":
        raise HTTPException(
            status_code=422,
            detail="productionConfirmation must be DEPLOY PRODUCTION",
        )
    env_result = await db.execute(
        select(models.DeploymentEnvironment).where(
            models.DeploymentEnvironment.name == data.environment,
            models.DeploymentEnvironment.is_active.is_(True),
        )
    )
    environment = env_result.scalar_one_or_none()
    if not environment:
        raise HTTPException(status_code=404, detail="Active deployment environment not found")

    existing_result = await db.execute(
        select(models.DeploymentRelease).where(
            models.DeploymentRelease.environment_id == environment.id,
            models.DeploymentRelease.idempotency_key == idempotency_key,
        )
    )
    existing = existing_result.scalar_one_or_none()
    request_fingerprint = fingerprint(data)
    if existing:
        if existing.request_fingerprint != request_fingerprint:
            raise HTTPException(status_code=409, detail="Idempotency key was already used for another request")
        jobs = await db.execute(
            select(models.DeploymentJob)
            .where(models.DeploymentJob.release_id == existing.id)
            .order_by(models.DeploymentJob.id)
        )
        return {"release": release_view(existing), "jobs": [job_view(job) for job in jobs.scalars()], "idempotent": True}

    release = models.DeploymentRelease(
        public_id=str(uuid.uuid4()),
        environment_id=environment.id,
        version=data.version,
        git_sha=data.git_sha.lower(),
        requested_by=principal.subject,
        status="pending_approval" if environment.requires_approval else "queued",
        idempotency_key=idempotency_key,
        request_fingerprint=request_fingerprint,
        metadata_json={
            **data.metadata,
            "services": data.services,
            "strategy": data.strategy,
            "ref": data.ref,
            "productionConfirmed": data.environment == "production",
        },
    )
    db.add(release)
    await db.flush()
    job = models.DeploymentJob(
        public_id=str(uuid.uuid4()),
        release_id=release.id,
        status=release.status,
        workflow_ref=data.ref,
    )
    db.add(job)
    await db.flush()
    if environment.requires_approval:
        db.add(models.DeploymentApproval(job_id=job.id, requested_by=principal.subject))
    audit(db, principal.subject, "deployment_requested", "release", release.public_id, request.headers.get("x-request-id"), {"jobId": job.public_id})
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        concurrent_result = await db.execute(
            select(models.DeploymentRelease).where(
                models.DeploymentRelease.environment_id == environment.id,
                models.DeploymentRelease.idempotency_key == idempotency_key,
            )
        )
        concurrent = concurrent_result.scalar_one_or_none()
        if concurrent and concurrent.request_fingerprint == request_fingerprint:
            jobs = await db.execute(
                select(models.DeploymentJob).where(models.DeploymentJob.release_id == concurrent.id)
            )
            return {
                "release": release_view(concurrent),
                "jobs": [job_view(item) for item in jobs.scalars()],
                "idempotent": True,
            }
        raise HTTPException(status_code=409, detail="Idempotency key conflict") from exc

    if not environment.requires_approval:
        await dispatch_job(db, job, release, environment, data.ref, settings)
    await db.refresh(release)
    await db.refresh(job)
    return {"release": release_view(release), "jobs": [job_view(job)], "idempotent": False}


@app.get("/api/v1/admin/deployments")
async def deployment_overview(
    _: Principal = Depends(require_admin),
    settings: Settings = Depends(get_settings),
    db: AsyncSession = Depends(get_db_session),
):
    environment_result = await db.execute(
        select(models.DeploymentEnvironment)
        .where(models.DeploymentEnvironment.is_active.is_(True))
        .order_by(models.DeploymentEnvironment.name)
    )
    environments = list(environment_result.scalars())
    recent_result = await db.execute(
        select(models.DeploymentJob)
        .join(models.DeploymentRelease)
        .join(models.DeploymentEnvironment)
        .where(models.DeploymentEnvironment.is_active.is_(True))
        .order_by(models.DeploymentJob.id.desc())
        .limit(20)
    )
    recent_jobs = list(recent_result.scalars())
    recent_views = [await full_job_view(db, job) for job in recent_jobs]
    environment_views: list[dict[str, Any]] = []
    for environment in environments:
        revisions_result = await db.execute(
            select(models.ServiceRevision)
            .where(models.ServiceRevision.environment_id == environment.id)
            .order_by(models.ServiceRevision.service_name)
        )
        revisions = list(revisions_result.scalars())
        active_job = next(
            (
                (job, view)
                for job, view in zip(recent_jobs, recent_views)
                if view["environment"] == environment.name and job.status in ACTIVE_JOB_STATES
            ),
            None,
        )
        active_services = set(active_job[1]["services"]) if active_job else set()
        desired_revision = active_job[1]["commitSha"] if active_job else None
        service_views = [
            {
                "service": revision.service_name,
                "revision": revision.revision,
                "desiredRevision": (
                    desired_revision if revision.service_name in active_services else None
                ),
                "status": "healthy" if revision.status == "active" else "degraded",
            }
            for revision in revisions
        ]
        drift = any(
            item.get("desiredRevision") and item["desiredRevision"] != item["revision"]
            for item in service_views
        )
        environment_views.append(
            {
                "name": environment.name,
                "health": (
                    "healthy"
                    if revisions and all(item["status"] == "healthy" for item in service_views)
                    else ("degraded" if revisions else "unknown")
                ),
                "drift": drift,
                "checkedAt": utcnow(),
                "activeDeployment": active_job[1] if active_job else None,
                "services": service_views,
            }
        )
    return {
        "environments": environment_views,
        "recentDeployments": recent_views,
        "availableServices": settings.allowed_services,
    }


@app.post("/api/v1/admin/deployments", status_code=status.HTTP_202_ACCEPTED)
async def create_admin_deployment(
    data: DeploymentCreate,
    request: Request,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
    principal: Principal = Depends(require_write_enabled),
    settings: Settings = Depends(get_settings),
    db: AsyncSession = Depends(get_db_session),
):
    result = await create_deployment(
        data=data,
        request=request,
        idempotency_header=idempotency_key,
        principal=principal,
        settings=settings,
        db=db,
    )
    job = await get_job(db, result["jobs"][0]["id"])
    return await full_job_view(db, job)


@app.get("/api/v1/admin/deployments/{job_id}")
async def admin_deployment_detail(
    job_id: str,
    _: Principal = Depends(require_admin),
    db: AsyncSession = Depends(get_db_session),
):
    return await full_job_view(db, await get_job(db, job_id))


@app.post("/api/v1/admin/deployments/{job_id}/cancel", status_code=status.HTTP_202_ACCEPTED)
async def cancel_admin_deployment(
    job_id: str,
    request: Request,
    principal: Principal = Depends(require_write_enabled),
    settings: Settings = Depends(get_settings),
    db: AsyncSession = Depends(get_db_session),
):
    await cancel_job(
        job_id=job_id,
        request=request,
        principal=principal,
        settings=settings,
        db=db,
    )
    return await full_job_view(db, await get_job(db, job_id))


@app.post("/api/v1/admin/deployments/{job_id}/rollback", status_code=status.HTTP_202_ACCEPTED)
async def rollback_admin_deployment(
    job_id: str,
    request: Request,
    principal: Principal = Depends(require_write_enabled),
    settings: Settings = Depends(get_settings),
    db: AsyncSession = Depends(get_db_session),
):
    target_job = await get_job(db, job_id)
    if target_job.status != "succeeded" or target_job.kind != "deploy":
        raise HTTPException(status_code=409, detail="Only successful deployments can be rolled back")
    target_release = await db.get(models.DeploymentRelease, target_job.release_id)
    rollback_key = f"rollback-{target_job.public_id}"
    await rollback_release(
        release_id=target_release.public_id,
        request=request,
        idempotency_key=rollback_key,
        principal=principal,
        settings=settings,
        db=db,
    )
    result = await db.execute(
        select(models.DeploymentJob)
        .join(models.DeploymentRelease)
        .where(
            models.DeploymentRelease.environment_id == target_release.environment_id,
            models.DeploymentRelease.idempotency_key == rollback_key,
        )
        .order_by(models.DeploymentJob.id.desc())
    )
    return await full_job_view(db, result.scalars().first())


@app.post("/api/v1/jobs/{job_id}/approval", status_code=status.HTTP_202_ACCEPTED)
async def decide_approval(
    job_id: str,
    data: ApprovalDecision,
    request: Request,
    principal: Principal = Depends(require_write_enabled),
    settings: Settings = Depends(get_settings),
    db: AsyncSession = Depends(get_db_session),
):
    job = await get_job(db, job_id)
    approval_result = await db.execute(
        select(models.DeploymentApproval).where(
            models.DeploymentApproval.job_id == job.id,
            models.DeploymentApproval.status == "pending",
        )
    )
    approval = approval_result.scalar_one_or_none()
    if not approval:
        raise HTTPException(status_code=409, detail="No pending approval for this job")
    release = await db.get(models.DeploymentRelease, job.release_id)
    environment = await db.get(models.DeploymentEnvironment, release.environment_id)
    approval.status = data.decision
    approval.decided_by = principal.subject
    approval.comment = data.comment
    approval.decided_at = utcnow()
    if data.decision == "rejected":
        job.status = transition(job.status, "cancelled")
        release.status = "cancelled"
        job.completed_at = utcnow()
    else:
        job.status = transition(job.status, "queued")
        release.status = "queued"
    audit(db, principal.subject, f"deployment_{data.decision}", "job", job.public_id, request.headers.get("x-request-id"))
    await db.commit()
    if data.decision == "approved":
        await dispatch_job(db, job, release, environment, job.workflow_ref or "main", settings)
    return job_view(job)


@app.post("/api/v1/jobs/{job_id}/cancel", status_code=status.HTTP_202_ACCEPTED)
async def cancel_job(
    job_id: str,
    request: Request,
    principal: Principal = Depends(require_write_enabled),
    settings: Settings = Depends(get_settings),
    db: AsyncSession = Depends(get_db_session),
):
    job = await get_job(db, job_id)
    try:
        job.status = transition(job.status, "cancel_requested")
    except InvalidTransition as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    job.cancel_requested = True
    release = await db.get(models.DeploymentRelease, job.release_id)
    environment = await db.get(models.DeploymentEnvironment, release.environment_id)
    audit(db, principal.subject, "deployment_cancel_requested", "job", job.public_id, request.headers.get("x-request-id"))
    await db.commit()
    if job.github_run_id:
        try:
            await GitHubAppClient(settings).cancel_run(environment.repository, job.github_run_id)
        except (GitHubConfigurationError, httpx.HTTPError) as exc:
            raise HTTPException(status_code=502, detail="Cancellation recorded but GitHub cancellation failed") from exc
    return job_view(job)


@app.post("/api/v1/releases/{release_id}/rollback", status_code=status.HTTP_202_ACCEPTED)
async def rollback_release(
    release_id: str,
    request: Request,
    idempotency_key: str = Header(alias="Idempotency-Key"),
    principal: Principal = Depends(require_write_enabled),
    settings: Settings = Depends(get_settings),
    db: AsyncSession = Depends(get_db_session),
):
    target = await get_release(db, release_id)
    environment = await db.get(models.DeploymentEnvironment, target.environment_id)
    synthetic = DeploymentCreate(
        environment=environment.name,
        version=f"rollback-{target.version}",
        git_sha=target.git_sha,
        ref=target.git_sha,
        services=release_services(target),
        strategy=(target.metadata_json or {}).get("strategy", "rolling"),
        production_confirmation=(
            "DEPLOY PRODUCTION" if environment.name == "production" else None
        ),
        idempotency_key=idempotency_key,
        metadata={"rollbackOf": target.public_id},
    )
    existing_result = await db.execute(
        select(models.DeploymentRelease).where(
            models.DeploymentRelease.environment_id == environment.id,
            models.DeploymentRelease.idempotency_key == idempotency_key,
        )
    )
    existing = existing_result.scalar_one_or_none()
    if existing:
        if existing.request_fingerprint != fingerprint(synthetic):
            raise HTTPException(status_code=409, detail="Idempotency key was already used for another request")
        return release_view(existing)
    release = models.DeploymentRelease(
        public_id=str(uuid.uuid4()),
        environment_id=environment.id,
        version=synthetic.version,
        git_sha=target.git_sha,
        requested_by=principal.subject,
        status="pending_approval" if environment.requires_approval else "queued",
        idempotency_key=idempotency_key,
        request_fingerprint=fingerprint(synthetic),
        metadata_json={
            **synthetic.metadata,
            "services": synthetic.services,
            "strategy": synthetic.strategy,
            "ref": synthetic.ref,
            "productionConfirmed": environment.name == "production",
        },
        rollback_of_id=target.id,
    )
    db.add(release)
    await db.flush()
    job = models.DeploymentJob(
        public_id=str(uuid.uuid4()),
        release_id=release.id,
        kind="rollback",
        status=release.status,
        workflow_ref=target.git_sha,
    )
    db.add(job)
    await db.flush()
    if environment.requires_approval:
        db.add(models.DeploymentApproval(job_id=job.id, requested_by=principal.subject))
    audit(db, principal.subject, "rollback_requested", "release", release.public_id, request.headers.get("x-request-id"), {"targetReleaseId": target.public_id})
    await db.commit()
    if not environment.requires_approval:
        await dispatch_job(db, job, release, environment, target.git_sha, settings)
    return release_view(release)


@app.post(
    "/api/v1/callbacks/github-actions/promote",
    status_code=status.HTTP_202_ACCEPTED,
)
async def promote_from_github_actions(
    payload: PromotionPayload,
    request: Request,
    claims: dict[str, Any] = Depends(verify_github_callback),
    settings: Settings = Depends(get_settings),
    db: AsyncSession = Depends(get_db_session),
):
    repository = str(claims["repository"])
    workflow_run_id = str(claims.get("run_id", ""))
    if not workflow_run_id.isdigit():
        raise HTTPException(status_code=403, detail="GitHub workflow run claim is required")
    if (
        payload.environment.lower() == "production"
        or payload.environment not in settings.promotion_environments
    ):
        raise HTTPException(
            status_code=403,
            detail="Environment is not authorized for automatic promotion",
        )

    requested_services = (
        settings.allowed_services if payload.services == "all" else payload.services
    )
    unknown_services = sorted(set(requested_services) - set(settings.allowed_services))
    if unknown_services:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown deployment services: {', '.join(unknown_services)}",
        )

    environment_result = await db.execute(
        select(models.DeploymentEnvironment).where(
            models.DeploymentEnvironment.name == payload.environment,
            models.DeploymentEnvironment.is_active.is_(True),
            models.DeploymentEnvironment.requires_approval.is_(False),
        )
    )
    environment = environment_result.scalar_one_or_none()
    if not environment:
        raise HTTPException(
            status_code=404,
            detail="Active non-approval promotion environment not found",
        )
    if environment.repository != repository:
        raise HTTPException(
            status_code=403,
            detail="GitHub repository does not match promotion environment",
        )

    idempotency_key = promotion_idempotency_key(
        repository,
        workflow_run_id,
        payload.git_sha,
    )
    existing_result = await db.execute(
        select(models.DeploymentRelease).where(
            models.DeploymentRelease.idempotency_key == idempotency_key
        )
    )
    existing = existing_result.scalars().first()
    actor = f"github-actions:{repository}:{workflow_run_id}"
    if existing:
        jobs_result = await db.execute(
            select(models.DeploymentJob)
            .where(models.DeploymentJob.release_id == existing.id)
            .order_by(models.DeploymentJob.id)
        )
        jobs = list(jobs_result.scalars())
        audit(
            db,
            actor,
            "automatic_promotion_reused",
            "release",
            existing.public_id,
            request.headers.get("x-request-id"),
            {"jobId": jobs[0].public_id if jobs else None},
        )
        await db.commit()
        return {
            "release": release_view(existing),
            "jobs": [job_view(job) for job in jobs],
            "idempotent": True,
        }

    workflow_ref = claims.get("ref")
    if not isinstance(workflow_ref, str) or not workflow_ref or len(workflow_ref) > 255:
        workflow_ref = payload.git_sha.lower()
    canonical = payload.model_dump(mode="json")
    request_fingerprint = hashlib.sha256(
        json.dumps(canonical, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()
    release = models.DeploymentRelease(
        public_id=str(uuid.uuid4()),
        environment_id=environment.id,
        version=payload.version,
        git_sha=payload.git_sha.lower(),
        requested_by=actor,
        status="queued",
        idempotency_key=idempotency_key,
        request_fingerprint=request_fingerprint,
        metadata_json={
            "services": list(requested_services),
            "strategy": payload.strategy,
            "ref": workflow_ref,
            "artifactRunId": str(payload.artifact_run_id),
            "workflowRepository": repository,
            "workflowRunId": workflow_run_id,
        },
    )
    db.add(release)
    await db.flush()
    job = models.DeploymentJob(
        public_id=str(uuid.uuid4()),
        release_id=release.id,
        status="queued",
        workflow_ref=workflow_ref,
    )
    db.add(job)
    await db.flush()
    audit(
        db,
        actor,
        "automatic_promotion_requested",
        "release",
        release.public_id,
        request.headers.get("x-request-id"),
        {
            "jobId": job.public_id,
            "artifactRunId": str(payload.artifact_run_id),
            "workflowRepository": repository,
            "workflowRunId": workflow_run_id,
        },
    )
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        concurrent_result = await db.execute(
            select(models.DeploymentRelease).where(
                models.DeploymentRelease.environment_id == environment.id,
                models.DeploymentRelease.idempotency_key == idempotency_key,
            )
        )
        concurrent = concurrent_result.scalar_one_or_none()
        if not concurrent:
            raise HTTPException(status_code=409, detail="Promotion idempotency conflict") from exc
        jobs_result = await db.execute(
            select(models.DeploymentJob).where(
                models.DeploymentJob.release_id == concurrent.id
            )
        )
        return {
            "release": release_view(concurrent),
            "jobs": [job_view(item) for item in jobs_result.scalars()],
            "idempotent": True,
        }

    await dispatch_job(db, job, release, environment, workflow_ref, settings)
    await db.refresh(release)
    await db.refresh(job)
    return {
        "release": release_view(release),
        "jobs": [job_view(job)],
        "idempotent": False,
    }


@app.post("/api/v1/callbacks/github-actions")
async def github_actions_callback(
    payload: CallbackPayload,
    request: Request,
    claims: dict[str, Any] = Depends(verify_github_callback),
    settings: Settings = Depends(get_settings),
    db: AsyncSession = Depends(get_db_session),
):
    job = await get_job(db, payload.job_id)
    release = await db.get(models.DeploymentRelease, job.release_id)
    environment = await db.get(models.DeploymentEnvironment, release.environment_id)
    if claims["repository"] != environment.repository:
        raise HTTPException(status_code=403, detail="Callback repository does not match deployment")
    unknown_services = sorted(set(payload.services) - set(settings.allowed_services))
    if unknown_services:
        raise HTTPException(
            status_code=422,
            detail=f"Callback reported unknown services: {', '.join(unknown_services)}",
        )
    if payload.github_run_id:
        if job.github_run_id and job.github_run_id != payload.github_run_id:
            raise HTTPException(status_code=409, detail="GitHub run ID does not match existing job")
        job.github_run_id = payload.github_run_id

    if payload.event in CALLBACK_STATES:
        callback_state = CALLBACK_STATES[payload.event]
        try:
            job.status = transition(job.status, callback_state.job_status)
        except InvalidTransition as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc
        release.status = callback_state.release_status or release.status
        if payload.event == "job_started" and not job.started_at:
            job.started_at = utcnow()
        if callback_state.job_status in {"succeeded", "failed", "cancelled"}:
            job.completed_at = utcnow()
            job.error_message = payload.error_message
        if payload.event == "job_succeeded":
            for service_name, revision in payload.services.items():
                existing_result = await db.execute(
                    select(models.ServiceRevision).where(
                        models.ServiceRevision.environment_id == environment.id,
                        models.ServiceRevision.service_name == service_name,
                    )
                )
                service = existing_result.scalar_one_or_none()
                if service:
                    service.release_id = release.id
                    service.revision = revision
                    service.status = "active"
                    service.deployed_at = utcnow()
                else:
                    db.add(
                        models.ServiceRevision(
                            environment_id=environment.id,
                            release_id=release.id,
                            service_name=service_name,
                            revision=revision,
                            deployed_at=utcnow(),
                        )
                    )
    elif payload.event.startswith("step_"):
        if not payload.step_name:
            raise HTTPException(status_code=422, detail="step_name is required for step events")
        step_result = await db.execute(
            select(models.DeploymentStep).where(
                models.DeploymentStep.job_id == job.id,
                models.DeploymentStep.name == payload.step_name,
                models.DeploymentStep.attempt == payload.attempt,
            )
        )
        step = step_result.scalar_one_or_none()
        step_status = payload.event.removeprefix("step_")
        if not step:
            step = models.DeploymentStep(
                job_id=job.id,
                name=payload.step_name,
                attempt=payload.attempt,
                status=step_status,
                details=payload.details,
            )
            db.add(step)
        else:
            step.status = step_status
            step.details = payload.details
        if step_status == "started" and not step.started_at:
            step.started_at = utcnow()
        if step_status in {"succeeded", "failed"}:
            step.completed_at = utcnow()
    elif payload.event == "artifact":
        if not payload.artifact_name or not payload.artifact_uri:
            raise HTTPException(status_code=422, detail="artifact_name and artifact_uri are required")
        db.add(
            models.DeploymentArtifact(
                job_id=job.id,
                name=payload.artifact_name,
                uri=payload.artifact_uri,
                digest=payload.digest,
                media_type=payload.media_type,
                metadata_json=payload.details,
            )
        )
    audit(
        db,
        f"github:{claims['repository']}",
        payload.event,
        "job",
        job.public_id,
        request.headers.get("x-request-id"),
        {
            "message": payload.error_message,
            "details": payload.details,
        },
    )
    await db.commit()
    return {"accepted": True, "job": job_view(job)}
