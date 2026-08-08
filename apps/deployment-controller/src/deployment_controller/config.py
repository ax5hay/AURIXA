from __future__ import annotations

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="", case_sensitive=False)

    environment: str = "development"
    deployment_controller_port: int = 8009
    deployment_writes_enabled: bool = False
    deployment_allowed_services: str = (
        "api-gateway,orchestration-engine,llm-router,agent-runtime,rag-service,"
        "safety-guardrails,streaming-voice,execution-engine,observability-core,"
        "deployment-controller,dashboard,patient-portal,hospital-portal"
    )

    deployment_jwt_secret: str | None = None
    deployment_jwt_issuer: str = "aurixa"
    deployment_jwt_audience: str = "aurixa-deployment-control-plane"
    deployment_admin_roles: str = "admin,deployment-admin"

    github_app_id: str | None = None
    github_app_private_key: str | None = None
    github_app_installation_id: str | None = None
    github_workflow_file: str = "deploy.yml"
    github_api_url: str = "https://api.github.com"
    deployment_callback_url: str | None = None

    github_oidc_audience: str = "aurixa-deployment-controller"
    github_oidc_repositories: str = ""
    github_promotion_environments: str = "staging"
    github_oidc_jwks_url: str = (
        "https://token.actions.githubusercontent.com/.well-known/jwks"
    )
    github_oidc_local_dev_secret: str | None = None

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"

    @property
    def admin_roles(self) -> set[str]:
        return {role.strip() for role in self.deployment_admin_roles.split(",") if role.strip()}

    @property
    def allowed_repositories(self) -> set[str]:
        return {
            repository.strip()
            for repository in self.github_oidc_repositories.split(",")
            if repository.strip()
        }

    @property
    def promotion_environments(self) -> set[str]:
        return {
            environment.strip()
            for environment in self.github_promotion_environments.split(",")
            if environment.strip() and environment.strip().lower() != "production"
        }

    @property
    def allowed_services(self) -> list[str]:
        return [
            service.strip()
            for service in self.deployment_allowed_services.split(",")
            if service.strip()
        ]


@lru_cache
def get_settings() -> Settings:
    return Settings()
