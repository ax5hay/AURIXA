import asyncio
import os
import time
from contextlib import asynccontextmanager
import httpx
from fastapi import FastAPI, HTTPException, Request
from loguru import logger

from aurixa_llm.router import LLMRouter
from aurixa_llm.types import LLMProvider, LLMRequest

from .models import RouteRequest, RouteResponse, GenerateRequest, GenerateResponse

# Keyword-based routing (cloud providers for specific use cases)
ROUTING_RULES = {
    "haiku": {"keywords": ["fast", "quick", "summary"], "provider": LLMProvider.ANTHROPIC, "model": "claude-3-haiku-20240307"},
    "opus": {"keywords": ["deep", "research", "analysis"], "provider": LLMProvider.ANTHROPIC, "model": "claude-3-opus-20240229"},
    "gemini": {"keywords": ["google", "gemini"], "provider": LLMProvider.GEMINI, "model": "gemini-1.5-pro"},
}

# LM Studio serves at http://127.0.0.1:1234; API is at /v1/models, /v1/chat/completions
_raw = os.getenv("LM_STUDIO_BASE_URL", "http://127.0.0.1:1234").rstrip("/")
LM_STUDIO_URL = f"{_raw}/v1" if "/v1" not in _raw else _raw
DEFAULT_PROVIDER = LLMProvider.LOCAL
DEFAULT_MODEL = None  # Resolved from LM Studio /v1/models when LOCAL


async def fetch_lm_studio_models() -> list[str]:
    """Fetch available models from LM Studio (OpenAI-compatible GET /v1/models)."""
    try:
        base = LM_STUDIO_URL.rstrip("/").replace("/v1", "") or "http://127.0.0.1:1234"
        url = f"{base}/v1/models"
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(url)
            if r.status_code != 200:
                return []
        data = r.json()
        models = data.get("data", []) if isinstance(data, dict) else []
        return [m.get("id", "") for m in models if m.get("id")]
    except Exception as e:
        logger.warning("Could not fetch LM Studio models: {}", e)
        return []


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize the LLM router. Never crash - run with minimal providers if needed."""
    app.state.llm_router = None
    app.state.lm_studio_models = []
    try:
        app.state.llm_router = LLMRouter()
        if not app.state.llm_router.providers:
            logger.warning("No LLM providers configured. Set OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_AI_API_KEY, or LM_STUDIO_BASE_URL.")
        else:
            if LLMProvider.LOCAL in app.state.llm_router.providers:
                try:
                    app.state.lm_studio_models = await asyncio.wait_for(
                        fetch_lm_studio_models(), timeout=3.0
                    )
                    if app.state.lm_studio_models:
                        logger.info("LM Studio models: {}", app.state.lm_studio_models[:5])
                except Exception as e:
                    logger.warning("Could not fetch LM Studio models at startup: {}", e)
            logger.info("LLM Router initialized with providers: {}", app.state.llm_router.providers)
    except Exception as e:
        logger.error("LLM Router init failed: {} - service will start but generate() will fail", e)
        # Create minimal router so health endpoint still works
        app.state.llm_router = LLMRouter.__new__(LLMRouter)
        app.state.llm_router._clients = {}
        app.state.llm_router._fallback_order = []
    yield
    logger.info("LLM Router shutting down")


app = FastAPI(
    title="AURIXA LLM Router",
    version="0.1.0",
    lifespan=lifespan,
    description="Service for intelligent, cost-aware routing of LLM requests.",
)


@app.get("/health", summary="Health check endpoint")
async def health(req: Request):
    """Return 200 OK quickly. Provider health is best-effort with short timeout to avoid blocking gateways."""
    provider_health: dict[str, bool] = {}
    router = getattr(req.app.state, "llm_router", None)
    if router is not None and hasattr(router, "health"):
        try:
            provider_health = await asyncio.wait_for(router.health(), timeout=2.0)
        except asyncio.TimeoutError:
            logger.debug("Provider health check timed out (non-fatal)")
        except Exception as e:
            logger.debug("Provider health check failed: {} (non-fatal)", e)
    return {
        "service": "llm-router",
        "status": "healthy",
        "providers": provider_health,
    }


@app.post("/api/v1/generate", response_model=GenerateResponse, summary="Generate text using a routed LLM")
async def generate(request: GenerateRequest):
    """Generates a response with retry on transient failures."""
    llm_request = LLMRequest(
        messages=request.messages,
        model=request.model,
        temperature=request.temperature,
        max_tokens=request.max_tokens,
        tools=request.tools,
    )
    last_err = None
    for attempt in range(3):
        try:
            response = await app.state.llm_router.generate(llm_request, provider=request.provider)
            return response
        except Exception as e:
            last_err = e
            logger.warning("LLM generate attempt {} failed: {}", attempt + 1, e)
            if attempt < 2:
                await asyncio.sleep(0.5 * (attempt + 1))
    logger.error("LLM generation failed after 3 attempts")
    raise HTTPException(status_code=500, detail=f"LLM generation failed: {last_err}")
    

@app.get("/api/v1/providers", summary="List available LLM providers")
async def list_providers(req: Request):
    """Return providers with health status for UI selection. LOCAL uses models fetch (fast); others use quick health."""
    router = req.app.state.llm_router
    health: dict[str, bool] = {}
    # For LOCAL: if we can fetch models, treat as healthy (avoid slow SDK health_check)
    if LLMProvider.LOCAL in router.providers:
        try:
            models = await fetch_lm_studio_models()
            health[LLMProvider.LOCAL.value] = bool(models)
        except Exception:
            health[LLMProvider.LOCAL.value] = False
    # For other providers, run health with short timeout
    try:
        other_health = await asyncio.wait_for(router.health(), timeout=5.0)
        for k, v in other_health.items():
            if k not in health:
                health[k] = v
    except asyncio.TimeoutError:
        for p in router.providers:
            if p.value not in health:
                health[p.value] = False
    return {
        "providers": [
            {"id": p.value, "name": p.value.replace("_", " ").title(), "healthy": health.get(p.value, False)}
            for p in router.providers
        ],
    }


@app.get("/api/v1/models", summary="List available models")
async def list_models(req: Request):
    """Fetch models from LM Studio on-demand (live) or return static list for cloud."""
    models = await fetch_lm_studio_models()
    if models:
        req.app.state.lm_studio_models = models  # update cache for route/generate
        return {"models": models, "source": "lm_studio"}
    return {
        "models": ["gpt-4o", "gpt-4o-mini", "claude-3-5-sonnet", "gemini-1.5-pro"],
        "source": "static",
    }


@app.post("/api/v1/route", response_model=RouteResponse, summary="Get the best model for a prompt")
async def route_prompt(body: RouteRequest, req: Request):
    """Route to LOCAL by default (cost-free); use cloud for keyword matches."""
    prompt_lower = body.prompt.lower()
    app = req.app

    for route, config in ROUTING_RULES.items():
        if config["provider"] in app.state.llm_router.providers and any(
            kw in prompt_lower for kw in config["keywords"]
        ):
            logger.info("Routing to {} based on keywords", route)
            return RouteResponse(
                model=config["model"],
                provider=config["provider"],
                metadata={"reason": f"Keyword match: {config['keywords']}"},
            )

    # Default: LOCAL (LM Studio) for cost savings
    model = DEFAULT_MODEL
    provider = DEFAULT_PROVIDER
    if provider not in app.state.llm_router.providers:
        provider = app.state.llm_router.providers[0] if app.state.llm_router.providers else LLMProvider.OPENAI
        model = "gpt-4o" if provider == LLMProvider.OPENAI else None
    lm_models = getattr(app.state, "lm_studio_models", None) or []
    if not lm_models:
        lm_models = await fetch_lm_studio_models()
        app.state.lm_studio_models = lm_models
    if not model and lm_models:
        model = lm_models[0]
    if not model:
        model = "local-model"

    return RouteResponse(model=model or "local-model", provider=provider, metadata={"reason": "Default (local-first)"})
