import asyncio
import json
import os
import time
from contextlib import asynccontextmanager
import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse
from loguru import logger

from aurixa_llm.router import LLMRouter
from aurixa_llm.types import LLMProvider, LLMRequest

from .models import RouteRequest, RouteResponse, GenerateRequest, GenerateResponse

OBSERVABILITY_URL = os.getenv("OBSERVABILITY_CORE_HOST", "http://localhost:8008")
RAG_SERVICE_URL = os.getenv("RAG_SERVICE_HOST", "http://localhost:8004")
SEMANTIC_ROUTING_THRESHOLD = float(os.getenv("SEMANTIC_ROUTING_THRESHOLD", "0.5"))

# Intent examples for semantic routing - phrase -> optional model override
INTENT_EXAMPLES: dict[str, list[str]] = {
    "appointment": ["schedule appointment", "book a visit", "reschedule", "cancel appointment"],
    "billing": ["bill", "payment", "insurance", "copay", "balance due"],
    "prescription": ["refill", "prescription", "medication"],
    "general": ["hello", "help", "hours", "contact"],
}

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


async def _startup_semantic_intents() -> dict[str, list[float]]:
    """Precompute intent embeddings from RAG service."""
    if not RAG_SERVICE_URL:
        return {}
    intents: dict[str, list[float]] = {}
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            for intent_name, phrases in INTENT_EXAMPLES.items():
                # Use first phrase as representative; could average multiple
                text = phrases[0] if phrases else intent_name
                r = await client.post(
                    f"{RAG_SERVICE_URL}/api/v1/embed",
                    json={"text": text},
                )
                if r.status_code == 200:
                    data = r.json()
                    intents[intent_name] = data.get("embedding", [])
        logger.info("Semantic routing: loaded {} intent embeddings", len(intents))
    except Exception as e:
        logger.warning("Could not load semantic intents: {}", e)
    return intents


def _cosine_sim(a: list[float], b: list[float]) -> float:
    """Cosine similarity between two vectors."""
    import math
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(x * x for x in b))
    if na * nb == 0:
        return 0.0
    return dot / (na * nb)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize the LLM router. Never crash - run with minimal providers if needed."""
    app.state.llm_router = None
    app.state.lm_studio_models = []
    app.state.intent_embeddings = {}
    # Shared HTTP client for RAG embed and telemetry (connection reuse, lower latency)
    app.state.http_client = httpx.AsyncClient(timeout=30.0, limits=httpx.Limits(max_keepalive_connections=8))
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
        app.state.intent_embeddings = await _startup_semantic_intents()
    except Exception as e:
        logger.error("LLM Router init failed: {} - service will start but generate() will fail", e)
        app.state.llm_router = LLMRouter.__new__(LLMRouter)
        app.state.llm_router._clients = {}
        app.state.llm_router._fallback_order = []
        app.state.intent_embeddings = {}
    yield
    await app.state.http_client.aclose()
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


async def _emit_llm_telemetry(response, app) -> None:
    """Fire-and-forget telemetry emission for LLM calls. Uses shared http_client when available."""
    if not OBSERVABILITY_URL:
        return
    try:
        usage = getattr(response, "usage", None)
        cost = usage.estimated_cost_usd if usage else None
        prov = getattr(response, "provider", None)
        provider_str = prov.value if prov and hasattr(prov, "value") else None
        client = getattr(app.state, "http_client", None)
        if client is not None:
            await client.post(
                f"{OBSERVABILITY_URL}/api/v1/telemetry",
                json={
                    "service_name": "llm-router",
                    "event_type": "llm_call",
                    "data": {
                        "latency_ms": getattr(response, "latency_ms", None),
                        "cost_usd": cost,
                        "model": getattr(response, "model", None),
                        "provider": provider_str,
                    },
                },
                timeout=2.0,
            )
        else:
            async with httpx.AsyncClient(timeout=2.0) as c:
                await c.post(
                    f"{OBSERVABILITY_URL}/api/v1/telemetry",
                    json={
                        "service_name": "llm-router",
                        "event_type": "llm_call",
                        "data": {
                            "latency_ms": getattr(response, "latency_ms", None),
                            "cost_usd": cost,
                            "model": getattr(response, "model", None),
                            "provider": provider_str,
                        },
                    },
                )
    except Exception as e:
        logger.debug("LLM telemetry emit failed (non-fatal): {}", e)


@app.post("/api/v1/generate", response_model=GenerateResponse, summary="Generate text using a routed LLM")
async def generate(request: GenerateRequest, req: Request):
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
            response = await req.app.state.llm_router.generate(llm_request, provider=request.provider)
            asyncio.create_task(_emit_llm_telemetry(response, req.app))
            return response
        except Exception as e:
            last_err = e
            logger.warning("LLM generate attempt {} failed: {}", attempt + 1, e)
            if attempt < 2:
                await asyncio.sleep(0.5 * (attempt + 1))
    logger.error("LLM generation failed after 3 attempts")
    raise HTTPException(status_code=500, detail=f"LLM generation failed: {last_err}")


@app.post("/api/v1/generate/stream", summary="Stream LLM response as NDJSON")
async def generate_stream(request: GenerateRequest, req: Request):
    """Stream completion tokens as NDJSON lines: {\"type\":\"delta\",\"content\":\"...\"} then {\"type\":\"done\"}."""
    llm_request = LLMRequest(
        messages=request.messages,
        model=request.model,
        temperature=request.temperature,
        max_tokens=request.max_tokens,
        tools=request.tools,
        stream=True,
    )

    async def ndjson_stream():
        try:
            async for chunk in req.app.state.llm_router.generate_stream(llm_request, provider=request.provider):
                yield json.dumps({"type": "delta", "content": chunk}) + "\n"
            yield json.dumps({"type": "done"}) + "\n"
        except Exception as e:
            logger.warning("generate_stream failed: {}", e)
            yield json.dumps({"type": "error", "message": str(e)}) + "\n"

    return StreamingResponse(
        ndjson_stream(),
        media_type="application/x-ndjson",
        headers={"Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"},
    )


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
    """Route to LOCAL by default (cost-free); use cloud for keyword matches. Semantic routing adds confidence."""
    prompt_lower = body.prompt.lower()
    app = req.app
    best_intent = None
    best_confidence = 0.0

    # Semantic routing: embedding similarity to predefined intents
    intent_embs = getattr(app.state, "intent_embeddings", None) or {}
    if intent_embs and RAG_SERVICE_URL:
        try:
            client = getattr(app.state, "http_client", None)
            if client is None:
                async with httpx.AsyncClient(timeout=5.0) as c:
                    r = await c.post(
                        f"{RAG_SERVICE_URL}/api/v1/embed",
                        json={"text": body.prompt},
                    )
            else:
                r = await client.post(
                    f"{RAG_SERVICE_URL}/api/v1/embed",
                    json={"text": body.prompt},
                    timeout=5.0,
                )
            if r.status_code == 200:
                q_emb = r.json().get("embedding", [])
                for intent_name, i_emb in intent_embs.items():
                    sim = _cosine_sim(q_emb, i_emb)
                    if sim > best_confidence:
                        best_confidence = sim
                        best_intent = intent_name
        except Exception as e:
            logger.debug("Semantic routing failed: {}", e)

    # Keyword rules take precedence
    for route, config in ROUTING_RULES.items():
        if config["provider"] in app.state.llm_router.providers and any(
            kw in prompt_lower for kw in config["keywords"]
        ):
            logger.info("Routing to {} based on keywords", route)
            return RouteResponse(
                model=config["model"],
                provider=config["provider"],
                confidence=best_confidence if best_confidence > 0 else 1.0,
                metadata={
                    "reason": f"Keyword match: {config['keywords']}",
                    "detected_intent": best_intent,
                },
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

    meta = {"reason": "Default (local-first)"}
    if best_intent and best_confidence >= SEMANTIC_ROUTING_THRESHOLD:
        meta["detected_intent"] = best_intent

    return RouteResponse(
        model=model or "local-model",
        provider=provider,
        confidence=best_confidence if best_confidence > 0 else 1.0,
        metadata=meta,
    )
