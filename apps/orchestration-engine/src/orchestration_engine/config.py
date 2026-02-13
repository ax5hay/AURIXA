from pydantic_settings import BaseSettings


class ServiceConfig(BaseSettings):
    model_config = {"env_prefix": "ORCHESTRATION_ENGINE_"}
    port: int = 8001
    log_level: str = "debug"
    environment: str = "development"
