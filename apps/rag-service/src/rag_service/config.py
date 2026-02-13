from pydantic_settings import BaseSettings


class ServiceConfig(BaseSettings):
    model_config = {"env_prefix": "RAG_SERVICE_"}
    port: int = 8004
    log_level: str = "debug"
    environment: str = "development"
