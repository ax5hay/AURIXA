import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from loguru import logger

from aurixa_llm.router import LLMRouter
from aurixa_llm.types import LLMProvider, LLMRequest

from .models import RouteRequest, RouteResponse, GenerateRequest, GenerateResponse

# This would be a more sophisticated routing mechanism in a real scenario
# For now, we'll use a simple keyword-based approach.
ROUTING_RULES = {
    "haiku": {"keywords": ["fast", "quick", "summary"], "provider": LLMProvider.ANTHROPIC, "model": "claude-3-haiku-20240307"},
    "opus": {"keywords": ["deep", "research", "analysis"], "provider": LLMProvider.ANTHROPIC, "model": "claude-3-opus-20240229"},
    "gemini": {"keywords": ["google", "gemini"], "provider": LLMProvider.GEMINI, "model": "gemini-1.5-pro"},
}
DEFAULT_MODEL = "gpt-4o"
DEFAULT_PROVIDER = LLMProvider.OPENAI


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize the LLM router and log service startup."""
    app.state.llm_router = LLMRouter()
    logger.info("LLM Router initialized with providers: {}", app.state.llm_router.providers)
    logger.info("LLM Router starting up")
    yield
    logger.info("LLM Router shutting down")


app = FastAPI(
    title="AURIXA LLM Router",
    version="0.1.0",
    lifespan=lifespan,
    description="Service for intelligent, cost-aware routing of LLM requests.",
)


@app.get("/health", summary="Health check endpoint")
async def health():
    """Return a 200 OK status and provider health."""
    provider_health = await app.state.llm_router.health()
    return {
        "service": "llm-router",
        "status": "healthy",
        "providers": provider_health,
    }


@app.post("/api/v1/generate", response_model=GenerateResponse, summary="Generate text using a routed LLM")
async def generate(request: GenerateRequest):
    """
    Generates a response from an LLM.

    If a provider or model is specified, it will be used directly.
    Otherwise, the router's fallback logic will be used.
    """
    llm_request = LLMRequest(
        messages=request.messages,
        model=request.model,
        temperature=request.temperature,
        max_tokens=request.max_tokens,
        tools=request.tools,
    )
    
    try:
        response = await app.state.llm_router.generate(llm_request, provider=request.provider)
        return response
    except Exception as e:
        logger.error("LLM generation failed: {}", e)
        raise HTTPException(status_code=500, detail="LLM generation failed")
    

@app.post("/api/v1/route", response_model=RouteResponse, summary="Get the best model for a prompt")
async def route_prompt(request: RouteRequest):
    """
    Determines the best LLM to handle a given prompt based on
    pre-defined rules and real-time provider health.
    """
    prompt_lower = request.prompt.lower()

    for route, config in ROUTING_RULES.items():
        if any(keyword in prompt_lower for keyword in config["keywords"]):
            logger.info("Routing prompt to {} based on keywords", route)
            return RouteResponse(
                model=config["model"],
                provider=config["provider"],
                metadata={"reason": f"Keyword match: {config['keywords']}"}
            )

    # Fallback to default
    logger.info("No specific route matched, using default model")
    return RouteResponse(
        model=DEFAULT_MODEL,
        provider=DEFAULT_PROVIDER,
        metadata={"reason": "Default fallback"}
    )
