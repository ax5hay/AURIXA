import os
from pydantic_settings import BaseSettings


class ServiceConfig(BaseSettings):
    """Configuration for the orchestration engine service."""
    model_config = {"env_prefix": "ORCHESTRATION_ENGINE_"}
    
    port: int = 8001
    log_level: str = "debug"
    environment: str = "development"

    # URLs for downstream services
    llm_router_host: str = os.getenv("LLM_ROUTER_HOST", "http://localhost:8002")
    rag_service_host: str = os.getenv("RAG_SERVICE_HOST", "http://localhost:8004")
    safety_guardrails_host: str = os.getenv("SAFETY_GUARDRAILS_HOST", "http://localhost:8005")


# Create a single config instance to be used across the application
config = ServiceConfig()

# Export the URLs for easy access from other modules
LLM_ROUTER_URL = config.llm_router_host
RAG_SERVICE_URL = config.rag_service_host
SAFETY_GUARDRAILS_URL = config.safety_guardrails_host
