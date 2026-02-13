from pydantic_settings import BaseSettings


class ServiceConfig(BaseSettings):
    model_config = {"env_prefix": "OBSERVABILITY_CORE_"}
    port: int = 8008
    log_level: str = "debug"
    environment: str = "development"
