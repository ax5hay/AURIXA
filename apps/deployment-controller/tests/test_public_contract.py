from aurixa_db import models

from deployment_controller.config import Settings
from deployment_controller.main import workflow_inputs


def test_workflow_dispatch_uses_exact_deploy_workflow_inputs():
    settings = Settings(deployment_allowed_services="api-gateway,llm-router")
    environment = models.DeploymentEnvironment(name="staging")
    release = models.DeploymentRelease(
        git_sha="0123456789abcdef",
        metadata_json={"services": ["api-gateway"], "strategy": "canary"},
    )
    job = models.DeploymentJob(public_id="job-public-id")

    assert workflow_inputs(job, release, environment, settings) == {
        "environment": "staging",
        "release_or_artifact": "0123456789abcdef",
        "service_scope": "api-gateway",
        "deployment_id": "job-public-id",
        "strategy": "canary",
    }


def test_workflow_dispatch_collapses_full_scope_to_all():
    settings = Settings(deployment_allowed_services="api-gateway,llm-router")
    environment = models.DeploymentEnvironment(name="production")
    release = models.DeploymentRelease(
        git_sha="fedcba9876543210",
        metadata_json={
            "services": ["llm-router", "api-gateway"],
            "strategy": "rolling",
        },
    )
    job = models.DeploymentJob(public_id="job-public-id")

    assert workflow_inputs(job, release, environment, settings)["service_scope"] == "all"


def test_workflow_dispatch_prefers_artifact_run():
    settings = Settings(deployment_allowed_services="api-gateway")
    environment = models.DeploymentEnvironment(name="staging")
    release = models.DeploymentRelease(
        git_sha="fedcba9876543210",
        metadata_json={
            "services": ["api-gateway"],
            "strategy": "rolling",
            "artifactRunId": "987654",
        },
    )
    job = models.DeploymentJob(public_id="job-public-id")

    assert workflow_inputs(job, release, environment, settings)["release_or_artifact"] == "run:987654"
