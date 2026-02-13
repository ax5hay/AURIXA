from pydantic_settings import BaseSettings


class ServiceConfig(BaseSettings):
    model_config = {"env_prefix": "SAFETY_GUARDRAILS_"}
    port: int = 8005
    log_level: str = "debug"
    environment: str = "development"
