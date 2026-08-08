from __future__ import annotations

from typing import Any, Literal

from pydantic import AliasChoices, BaseModel, ConfigDict, Field, field_validator


class DeploymentCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    environment: str = Field(min_length=1, max_length=128)
    version: str = Field(
        min_length=1,
        max_length=255,
        validation_alias=AliasChoices("version", "release"),
    )
    git_sha: str = Field(
        pattern=r"^[0-9a-fA-F]{7,64}$",
        validation_alias=AliasChoices("gitSha", "git_sha"),
    )
    ref: str = Field(default="main", min_length=1, max_length=255)
    services: list[str] = Field(default_factory=list, max_length=100)
    strategy: Literal["rolling", "canary"] = "rolling"
    production_confirmation: str | None = Field(
        default=None,
        max_length=64,
        validation_alias=AliasChoices("productionConfirmation", "production_confirmation"),
    )
    idempotency_key: str | None = Field(default=None, min_length=8, max_length=255)
    metadata: dict[str, Any] = Field(default_factory=dict)

    @field_validator("services")
    @classmethod
    def unique_service_names(cls, value: list[str]) -> list[str]:
        if any(not item or len(item) > 255 for item in value):
            raise ValueError("service names must be between 1 and 255 characters")
        if len(value) != len(set(value)):
            raise ValueError("services must not contain duplicates")
        return value


class ApprovalDecision(BaseModel):
    decision: Literal["approved", "rejected"]
    comment: str | None = Field(default=None, max_length=2000)


class PromotionPayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    environment: str = Field(min_length=1, max_length=128)
    version: str = Field(min_length=1, max_length=255)
    git_sha: str = Field(
        pattern=r"^[0-9a-fA-F]{7,64}$",
        validation_alias=AliasChoices("gitSha", "git_sha"),
    )
    artifact_run_id: int = Field(
        ge=1,
        validation_alias=AliasChoices("artifactRunId", "artifact_run_id"),
    )
    services: Literal["all"] | list[str] = "all"
    strategy: Literal["rolling", "canary"] = "rolling"

    @field_validator("services")
    @classmethod
    def valid_services(cls, value: Literal["all"] | list[str]) -> Literal["all"] | list[str]:
        if value == "all":
            return value
        if not value or len(value) > 100:
            raise ValueError("services must be 'all' or a non-empty list")
        if any(not item or len(item) > 255 for item in value):
            raise ValueError("service names must be between 1 and 255 characters")
        if len(value) != len(set(value)):
            raise ValueError("services must not contain duplicates")
        return value


class CallbackPayload(BaseModel):
    job_id: str
    event: Literal[
        "job_started",
        "job_succeeded",
        "job_failed",
        "job_cancelled",
        "step_started",
        "step_succeeded",
        "step_failed",
        "artifact",
    ]
    github_run_id: str | None = Field(default=None, pattern=r"^[0-9]{1,64}$")
    step_name: str | None = Field(default=None, max_length=255)
    attempt: int = Field(default=1, ge=1)
    details: dict[str, Any] = Field(default_factory=dict)
    error_message: str | None = Field(default=None, max_length=10000)
    artifact_name: str | None = Field(default=None, max_length=255)
    artifact_uri: str | None = Field(default=None, max_length=4000)
    digest: str | None = Field(default=None, max_length=255)
    media_type: str | None = Field(default=None, max_length=255)
    services: dict[str, str] = Field(default_factory=dict)

    @field_validator("artifact_uri")
    @classmethod
    def artifact_uri_is_safe(cls, value: str | None) -> str | None:
        if value and not value.startswith(("https://", "s3://", "gh://")):
            raise ValueError("artifact URI scheme is not allowed")
        return value
