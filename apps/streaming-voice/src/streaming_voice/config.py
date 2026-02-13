from pydantic_settings import BaseSettings


class ServiceConfig(BaseSettings):
    model_config = {"env_prefix": "STREAMING_VOICE_"}
    port: int = 8006
    log_level: str = "debug"
    environment: str = "development"
