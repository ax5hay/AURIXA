from pydantic_settings import BaseSettings


class ServiceConfig(BaseSettings):
    model_config = {"env_prefix": "LLM_ROUTER_"}
    port: int = 8002
    log_level: str = "debug"
    environment: str = "development"
