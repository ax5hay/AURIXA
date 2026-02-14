import os
from pydantic_settings import BaseSettings


class ServiceConfig(BaseSettings):
    """Configuration for the orchestration engine service."""
    model_config = {"env_prefix": "ORCHESTRATION_ENGINE_"}
    
    port: int = 8001
    log_level: str = "debug"
    environment: str = "development"

    # URLs for downstream services (set ORCHESTRATION_ENGINE_* for Docker; LLM_ROUTER_HOST etc. as fallback)
    llm_router_host: str = os.getenv("LLM_ROUTER_HOST", "http://localhost:8002")
    rag_service_host: str = os.getenv("RAG_SERVICE_HOST", "http://localhost:8004")
    safety_guardrails_host: str = os.getenv("SAFETY_GUARDRAILS_HOST", "http://localhost:8005")
    agent_runtime_host: str = os.getenv("AGENT_RUNTIME_HOST", "http://localhost:8003")
    observability_host: str = os.getenv("OBSERVABILITY_CORE_HOST", "http://localhost:8008")


# Create a single config instance to be used across the application
config = ServiceConfig()

# Export the URLs for easy access from other modules
LLM_ROUTER_URL = config.llm_router_host
RAG_SERVICE_URL = config.rag_service_host
SAFETY_GUARDRAILS_URL = config.safety_guardrails_host
AGENT_RUNTIME_URL = config.agent_runtime_host
OBSERVABILITY_URL = config.observability_host
