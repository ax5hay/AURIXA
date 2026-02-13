from pydantic_settings import BaseSettings


class ServiceConfig(BaseSettings):
    model_config = {"env_prefix": "AGENT_RUNTIME_"}
    port: int = 8003
    log_level: str = "debug"
    environment: str = "development"
