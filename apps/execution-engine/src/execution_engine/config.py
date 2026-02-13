from pydantic_settings import BaseSettings


class ServiceConfig(BaseSettings):
    model_config = {"env_prefix": "EXECUTION_ENGINE_"}
    port: int = 8007
    log_level: str = "debug"
    environment: str = "development"
