from deployment_controller.main import fingerprint
from deployment_controller.schemas import DeploymentCreate


def deployment(key: str, version: str = "v1") -> DeploymentCreate:
    return DeploymentCreate(
        environment="staging",
        version=version,
        git_sha="0123456789abcdef",
        ref="main",
        idempotency_key=key,
    )


def test_idempotency_fingerprint_ignores_transport_key():
    assert fingerprint(deployment("first-key")) == fingerprint(deployment("second-key"))


def test_idempotency_fingerprint_detects_payload_reuse():
    assert fingerprint(deployment("same-key", "v1")) != fingerprint(deployment("same-key", "v2"))


def test_public_payload_accepts_camel_case_git_sha_and_release_alias():
    parsed = DeploymentCreate.model_validate(
        {
            "environment": "staging",
            "release": "v2",
            "gitSha": "0123456789abcdef",
            "ref": "main",
            "services": ["api-gateway"],
            "strategy": "canary",
            "productionConfirmation": None,
        }
    )
    assert parsed.version == "v2"
    assert parsed.git_sha == "0123456789abcdef"
    assert parsed.services == ["api-gateway"]
    assert parsed.strategy == "canary"


def test_public_payload_accepts_snake_case_git_sha():
    parsed = DeploymentCreate.model_validate(
        {
            "environment": "staging",
            "version": "v2",
            "git_sha": "0123456789abcdef",
        }
    )
    assert parsed.git_sha == "0123456789abcdef"
