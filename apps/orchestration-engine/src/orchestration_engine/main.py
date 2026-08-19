import asyncio
import datetime
import hashlib
import json
import os
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends
from fastapi.responses import StreamingResponse
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from pydantic import BaseModel

from aurixa_db import get_db_session, engine, Base, models as db_models
from . import clients

# Response cache for repeated prompts (cost reduction). Capped size to avoid unbounded memory growth.
CACHE_TTL_SEC = int(os.getenv("ORCHESTRATION_RESPONSE_CACHE_TTL", "300"))
CACHE_MAX_ENTRIES = int(os.getenv("ORCHESTRATION_RESPONSE_CACHE_MAX_ENTRIES", "1000"))
_response_cache: dict[str, tuple[str, float]] = {}

def _cache_key(prompt: str, tenant_id: str | None, user_id: str | None) -> str:
    normalized = (prompt or "").strip().lower()
    return hashlib.sha256(f"{normalized}|{tenant_id or ''}|{user_id or ''}".encode()).hexdigest()

def _get_cached(key: str) -> str | None:
    entry = _response_cache.get(key)
    if not entry:
        return None
    text, ts = entry
    if time.time() - ts > CACHE_TTL_SEC:
        _response_cache.pop(key, None)
        return None
    return text

def _set_cached(key: str, text: str) -> None:
    now = time.time()
    # Evict expired entries first
    if len(_response_cache) >= CACHE_MAX_ENTRIES:
        expired = [k for k, (_, ts) in _response_cache.items() if now - ts > CACHE_TTL_SEC]
        for k in expired[:10]:  # cap work per call
            _response_cache.pop(k, None)
    # If still at capacity, evict oldest (min timestamp)
    if len(_response_cache) >= CACHE_MAX_ENTRIES and _response_cache:
        oldest_key = min(_response_cache, key=lambda k: _response_cache[k][1])
        _response_cache.pop(oldest_key, None)
    _response_cache[key] = (text, now)

# Prompt phrases that suggest agent tool use (showings, listings, knowledge, etc.)
AGENT_WORTHY_PHRASES = [
    "showing", "tour", "viewing", "schedule", "book", "reschedule", "cancel",
    "appointment", "listing", "property", "available", "open house",
    "callback", "schedule a call", "get showing", "my showings",
    "search", "knowledge", "maintenance", "financing", "pre-approval",
    "refill", "prescription", "insurance",
]


def _is_unhelpful_agent_output(text: str | None) -> bool:
    """True when agent-runtime returned its default placeholder (no tool matched)."""
    normalized = (text or "").strip().lower()
    return not normalized or normalized == "i'm not sure how to help with that."


from .models import PipelineRequest, ConversationState, PipelineStep as PydanticPipelineStep
from .admin_api import router as admin_router
from . import agent_helpers

async def _ensure_db_tables():
    """Create tables with retry when Postgres may still be starting."""
    import asyncio
    for attempt in range(5):
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            return True
        except Exception as e:
            logger.warning("DB connect attempt {} failed: {}", attempt + 1, e)
            if attempt < 4:
                await asyncio.sleep(2)
    return False


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create database tables on startup."""
    logger.info("Orchestration engine starting up")
    if engine is not None:
        if await _ensure_db_tables():
            logger.info("Database tables created.")
        else:
            logger.error("Could not connect to database after 5 attempts. DB routes will fail.")
    else:
        logger.warning("Database engine not initialized.")
    yield
    logger.info("Orchestration engine shutting down")


app = FastAPI(
    title="AURIXA Orchestration Engine",
    version="0.1.0",
    lifespan=lifespan,
    description="Service for orchestrating complex conversational AI pipelines.",
)
app.include_router(admin_router)


def _is_agent_worthy(prompt: str) -> bool:
    """Heuristic: prompt suggests tool use (appointments, scheduling, knowledge search)."""
    lower = (prompt or "").lower()
    return any(phrase in lower for phrase in AGENT_WORTHY_PHRASES)


def _emit_step_telemetry(name: str, duration_ms: float | None, session_id: str) -> None:
    """Fire-and-forget telemetry emission."""
    if duration_ms is None:
        return
    asyncio.create_task(
        clients.emit_telemetry(
            "orchestration-engine",
            "pipeline_step",
            {"step_name": name, "latency_ms": duration_ms, "session_id": session_id},
        )
    )


async def execute_step(
    db: AsyncSession, conversation: db_models.Conversation, name: str, input_data: dict, coro
) -> tuple[dict, db_models.PipelineStep]:
    """Execute a pipeline step, record it, and update its state."""
    step = db_models.PipelineStep(
        conversation_id=conversation.id,
        step_name=name,
        status="in_progress",
        input=input_data,
        start_time=time.time(),
    )
    db.add(step)
    await db.commit()

    logger.debug("Executing step: {}", name)
    try:
        result = await coro
        step.output = result
        step.status = "success"
        logger.info("Step {} succeeded", name)
        return result, step
    except Exception as e:
        logger.error("Step {} failed: {}", name, e)
        step.status = "error"
        step.error_message = str(e)
        raise
    finally:
        step.end_time = time.time()
        db.add(step)
        await db.commit()
        duration_ms = (step.end_time - step.start_time) * 1000 if step.end_time and step.start_time else None
        _emit_step_telemetry(name, duration_ms, conversation.session_id)


@app.get("/health", summary="Health check endpoint")
async def health():
    """Return a 200 OK status if the service is healthy."""
    return {"service": "orchestration-engine", "status": "healthy"}


# --- Admin API (tenants, audit, patients) ---

class TenantOut(BaseModel):
    id: str
    name: str
    plan: str
    status: str
    api_keys: int
    created: str

    class Config:
        from_attributes = True


@app.get("/api/v1/tenants", summary="List all tenants")
async def list_tenants(db: AsyncSession = Depends(get_db_session)):
    result = await db.execute(select(db_models.Tenant).order_by(db_models.Tenant.id))
    tenants = result.scalars().all()
    return [
        {
            "id": f"t-{t.id:03d}",
            "name": t.name,
            "plan": t.plan,
            "status": t.status,
            "apiKeys": t.api_key_count,
            "created": t.created_at.strftime("%Y-%m-%d") if t.created_at else "",
        }
        for t in tenants
    ]


class TenantCreateIn(BaseModel):
    name: str
    plan: str = "starter"
    status: str = "active"


@app.post("/api/v1/tenants", summary="Create a tenant")
async def create_tenant(data: TenantCreateIn, db: AsyncSession = Depends(get_db_session)):
    base = (data.name or "").lower().replace(" ", "-")[:32] or "tenant"
    domain = f"{base}-{int(time.time() * 1000)}"
    t = db_models.Tenant(name=data.name, plan=data.plan, status=data.status, domain=domain)
    db.add(t)
    await db.commit()
    await db.refresh(t)
    audit = db_models.AuditLog(
        service="Orchestration Engine",
        action="Tenant Created",
        user="admin",
        details=f"Created tenant '{t.name}' (id={t.id}, plan={t.plan})",
        severity="info",
    )
    db.add(audit)
    await db.commit()
    return {"id": f"t-{t.id:03d}", "name": t.name, "plan": t.plan, "status": t.status}


def _parse_tenant_id(tenant_id: str) -> int:
    """Parse tenant id from 't-001' format to integer."""
    s = (tenant_id or "").strip()
    if s.startswith("t-"):
        s = s[2:].lstrip("0") or "0"
    try:
        return int(s)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid tenant id")


@app.get("/api/v1/tenants/{tenant_id}", summary="Get a tenant by ID")
async def get_tenant(tenant_id: str, db: AsyncSession = Depends(get_db_session)):
    pid = _parse_tenant_id(tenant_id)
    result = await db.execute(select(db_models.Tenant).where(db_models.Tenant.id == pid))
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return {
        "id": f"t-{t.id:03d}",
        "name": t.name,
        "plan": t.plan,
        "status": t.status,
        "apiKeys": t.api_key_count,
        "created": t.created_at.strftime("%Y-%m-%d") if t.created_at else "",
    }


class TenantUpdateIn(BaseModel):
    name: str | None = None
    plan: str | None = None
    status: str | None = None


@app.patch("/api/v1/tenants/{tenant_id}", summary="Update a tenant")
async def update_tenant(tenant_id: str, data: TenantUpdateIn, db: AsyncSession = Depends(get_db_session)):
    pid = _parse_tenant_id(tenant_id)
    result = await db.execute(select(db_models.Tenant).where(db_models.Tenant.id == pid))
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="Tenant not found")
    changes = []
    if data.name is not None:
        changes.append(f"name→{data.name}")
        t.name = data.name
    if data.plan is not None:
        changes.append(f"plan→{data.plan}")
        t.plan = data.plan
    if data.status is not None:
        changes.append(f"status→{data.status}")
        t.status = data.status
    await db.commit()
    await db.refresh(t)
    if changes:
        audit = db_models.AuditLog(
            service="Orchestration Engine",
            action="Tenant Updated",
            user="admin",
            details=f"Updated tenant {tenant_id} ({t.name}): {', '.join(changes)}",
            severity="info",
        )
        db.add(audit)
        await db.commit()
    return {"id": f"t-{t.id:03d}", "name": t.name, "plan": t.plan, "status": t.status}


class AuditEntryOut(BaseModel):
    id: str
    timestamp: str
    service: str
    action: str
    user: str
    details: str
    severity: str


@app.get("/api/v1/audit", summary="List audit logs")
async def list_audit(db: AsyncSession = Depends(get_db_session), limit: int = 50):
    result = await db.execute(
        select(db_models.AuditLog).order_by(db_models.AuditLog.id.desc()).limit(limit)
    )
    logs = result.scalars().all()
    return [
        {
            "id": f"a-{log.id:03d}",
            "timestamp": log.created_at.strftime("%Y-%m-%d %H:%M:%S") if log.created_at else "",
            "service": log.service,
            "action": log.action,
            "user": log.user,
            "details": log.details,
            "severity": log.severity,
        }
        for log in logs
    ]


@app.get("/api/v1/config/summary", summary="Platform configuration summary")
async def get_config_summary(db: AsyncSession = Depends(get_db_session)):
    """Platform config for Configuration page."""
    logger.debug("Fetching config summary")
    result = await db.execute(select(db_models.Tenant))
    tenants = result.scalars().all()
    tenants_by_plan = {"starter": 0, "professional": 0, "enterprise": 0}
    tenants_by_status = {"active": 0, "suspended": 0, "pending": 0}
    for t in tenants:
        if t.plan in tenants_by_plan:
            tenants_by_plan[t.plan] += 1
        if t.status in tenants_by_status:
            tenants_by_status[t.status] += 1
    return {
        "tenants_count": len(tenants),
        "tenants_by_plan": tenants_by_plan,
        "tenants_by_status": tenants_by_status,
    }


@app.get("/api/v1/config/detail", summary="Full platform configuration from DB")
async def get_config_detail(db: AsyncSession = Depends(get_db_session)):
    """Platform config key-value entries for Configuration page."""
    logger.debug("Fetching config detail")
    result = await db.execute(select(db_models.PlatformConfig).order_by(db_models.PlatformConfig.category, db_models.PlatformConfig.key))
    entries = result.scalars().all()
    by_category: dict[str, list[dict[str, str]]] = {}
    for e in entries:
        cat = e.category or "general"
        if cat not in by_category:
            by_category[cat] = []
        by_category[cat].append({"key": e.key, "value": e.value})
    return {"categories": by_category}


class ConfigUpdateIn(BaseModel):
    value: str


@app.patch("/api/v1/config/{key}", summary="Update a platform config key")
async def update_config_key(key: str, data: ConfigUpdateIn, db: AsyncSession = Depends(get_db_session)):
    """Update a single platform config key's value."""
    result = await db.execute(select(db_models.PlatformConfig).where(db_models.PlatformConfig.key == key))
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail=f"Config key '{key}' not found")
    entry.value = data.value
    audit = db_models.AuditLog(
        service="Orchestration Engine",
        action="Config Updated",
        user="admin",
        details=f"Updated config key '{key}' to '{data.value}'",
        severity="info",
    )
    db.add(audit)
    await db.commit()
    return {"key": key, "value": entry.value}


@app.get("/api/v1/knowledge/articles", summary="List knowledge base articles")
async def list_knowledge_articles(
    db: AsyncSession = Depends(get_db_session),
    tenant_id: int | None = None,
):
    q = select(db_models.KnowledgeBaseArticle)
    if tenant_id:
        q = q.where(db_models.KnowledgeBaseArticle.tenant_id == tenant_id)
    result = await db.execute(q.order_by(db_models.KnowledgeBaseArticle.id))
    articles = result.scalars().all()
    return [
        {
            "id": a.id,
            "title": a.title,
            "content": a.content,
            "tenantId": a.tenant_id,
        }
        for a in articles
    ]


class KnowledgeArticleCreateIn(BaseModel):
    title: str
    content: str
    tenant_id: int = 1


@app.post("/api/v1/knowledge/articles", summary="Create a knowledge base article")
async def create_knowledge_article(data: KnowledgeArticleCreateIn, db: AsyncSession = Depends(get_db_session)):
    result = await db.execute(select(db_models.Tenant).where(db_models.Tenant.id == data.tenant_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Tenant id {data.tenant_id} not found")
    article = db_models.KnowledgeBaseArticle(
        title=data.title,
        content=data.content,
        tenant_id=data.tenant_id,
    )
    db.add(article)
    await db.commit()
    await db.refresh(article)
    audit = db_models.AuditLog(
        service="Orchestration Engine",
        action="Knowledge Article Created",
        user="admin",
        details=f"Created article '{article.title}' (id={article.id}) for tenant {article.tenant_id}",
        severity="info",
    )
    db.add(audit)
    await db.commit()
    return {"id": article.id, "title": article.title, "content": article.content, "tenantId": article.tenant_id}


@app.post("/api/v1/pipelines", response_model=ConversationState, summary="Run an orchestration pipeline")
async def run_pipeline(
    request: PipelineRequest, db: AsyncSession = Depends(get_db_session)
):
    """
    Run a full conversational pipeline and persist its state.
    """
    logger.info("Received new pipeline request for session: {}", request.session_id)

    channel = (request.channel or "client").lower()
    if channel not in ("client", "agent"):
        channel = "client"

    # Cache check: skip for agent-worthy (client-specific) prompts
    use_cache = not _is_agent_worthy(request.prompt) and CACHE_TTL_SEC > 0
    cache_key = _cache_key(request.prompt, request.tenant_id, request.user_id) if use_cache else None
    if cache_key and use_cache:
        cached = _get_cached(cache_key)
        if cached:
            logger.info("Cache hit for session: {}", request.session_id)
            # Still persist conversation with minimal steps
            conversation = db_models.Conversation(
                session_id=request.session_id,
                meta_data={"user_id": request.user_id, "tenant_id": request.tenant_id, "client_id": request.client_id or request.patient_id, "patient_id": request.client_id or request.patient_id},
            )
            db.add(conversation)
            await db.commit()
            return ConversationState(
                session_id=request.session_id,
                request=request,
                steps=[PydanticPipelineStep(name="cache_hit", status="success", output={"cached": True})],
                final_response=cached,
                created_at=time.time(),
                updated_at=time.time(),
            )

    # Create a new conversation record in the database
    meta = {"user_id": request.user_id, "tenant_id": request.tenant_id}
    client_id = request.client_id if request.client_id is not None else request.patient_id
    if client_id is not None:
        meta["client_id"] = client_id
        meta["patient_id"] = client_id  # legacy voice/portal BFF
    conversation = db_models.Conversation(
        session_id=request.session_id,
        meta_data=meta
    )
    db.add(conversation)
    await db.commit()
    
    final_response_text = ""
    try:
        # 0. Validate user input (fair housing, fraud, legal patterns)
        input_validation, _ = await execute_step(
            db, conversation, "validate_input", {"text": request.prompt},
            clients.call_safety_guardrails(request.prompt),
        )
        if not input_validation.get("is_safe"):
            final_response_text = (
                clients.escalation_notice(input_validation)
                + input_validation.get("validated_text", "[Content Redacted]")
            )
            await agent_helpers.persist_escalation(
                db,
                validation=input_validation,
                source_text=request.prompt,
                tenant_id=request.tenant_id,
                client_id=client_id,
                conversation_id=conversation.id,
                session_id=request.session_id,
                channel=channel,
            )
        else:
            # 1. Classify intent
            intent_result, _ = await execute_step(
                db, conversation, "classify_intent", {"prompt": request.prompt},
                clients.call_llm_router(request.prompt)
            )

            # 2. Agent path: when prompt suggests tool use, call agent-runtime
            generated_text = ""
            if _is_agent_worthy(request.prompt):
                agent_result, _ = await execute_step(
                    db, conversation, "agent_execution", {"prompt": request.prompt, "client_id": client_id, "patient_id": client_id},
                    clients.call_agent_runtime(request.prompt, client_id)
                )
                agent_output = agent_result.get("output")
                if agent_output and not _is_unhelpful_agent_output(agent_output):
                    generated_text = agent_output
                    logger.info("Using agent output for session: {}", request.session_id)
                elif agent_output:
                    logger.info(
                        "Agent returned no actionable result for session {}, falling back to RAG+LLM",
                        request.session_id,
                    )

            # 3. Standard path: RAG + LLM generate when no agent output
            if not generated_text:
                rag_context, _ = await execute_step(
                    db, conversation, "knowledge_retrieval", {"prompt": request.prompt, "intent": intent_result},
                    clients.call_rag_service(request.prompt, intent_result)
                )
                generation_result, _ = await execute_step(
                    db, conversation, "generate_response", {"context": rag_context, "intent": intent_result},
                    clients.call_llm_generate(
                        model=intent_result.get("model"),
                        provider=intent_result.get("provider"),
                        prompt=request.prompt,
                        context=rag_context,
                        channel=channel,
                    )
                )
                generated_text = generation_result.get("content", "")

            # 4. Validate output
            validation_result, _ = await execute_step(
                db, conversation, "validate_output", {"text": generated_text},
                clients.call_safety_guardrails(generated_text)
            )

            if not validation_result.get("is_safe"):
                final_response_text = validation_result.get("validated_text", "[Content Redacted]")
                logger.warning("Pipeline finished with unsafe response for session: {}", request.session_id)
                await agent_helpers.persist_escalation(
                    db,
                    validation=validation_result,
                    source_text=generated_text,
                    tenant_id=request.tenant_id,
                    client_id=client_id,
                    conversation_id=conversation.id,
                    session_id=request.session_id,
                    channel=channel,
                )
            else:
                final_response_text = validation_result.get("validated_text")
                logger.success("Pipeline executed successfully for session: {}", request.session_id)

            # 5. Escalation notice from input or output validation
            notice = clients.escalation_notice(validation_result) or clients.escalation_notice(input_validation)
            if notice:
                final_response_text = notice + final_response_text
                esc_validation = (
                    validation_result
                    if validation_result.get("requires_escalation")
                    else input_validation
                )
                if esc_validation.get("requires_escalation") and validation_result.get("is_safe", True):
                    await agent_helpers.persist_escalation(
                        db,
                        validation=esc_validation,
                        source_text=request.prompt,
                        tenant_id=request.tenant_id,
                        client_id=client_id,
                        conversation_id=conversation.id,
                        session_id=request.session_id,
                        channel=channel,
                    )

        # 6. Cache response for repeated general prompts
        if cache_key and use_cache and final_response_text:
            _set_cached(cache_key, final_response_text)
    
    except Exception as e:
        logger.error("Pipeline failed for session {}: {}", request.session_id, e)
        raise HTTPException(status_code=500, detail=f"Pipeline execution failed: {e}")

    # Construct the final Pydantic response model from the DB data
    await db.refresh(conversation, ["pipeline_steps"])
    pydantic_steps = [
        PydanticPipelineStep(
            name=step.step_name,
            status=step.status,
            input=step.input,
            output=step.output,
            error_message=step.error_message,
            start_time=step.start_time,
            end_time=step.end_time,
        )
        for step in conversation.pipeline_steps
    ]
    
    return ConversationState(
        session_id=conversation.session_id,
        request=request, # The original request
        steps=pydantic_steps,
        final_response=final_response_text,
        created_at=conversation.created_at.timestamp(),
        updated_at=conversation.updated_at.timestamp(),
    )


def _ndjson_line(obj: dict) -> bytes:
    return (json.dumps(obj) + "\n").encode("utf-8")


@app.post("/api/v1/pipelines/stream", summary="Run pipeline with NDJSON stream (status + text_delta + done)")
async def run_pipeline_stream(request: PipelineRequest):
    """
    Stream pipeline progress and LLM tokens as NDJSON.
    Events: {"event":"status","message":"..."}, {"event":"text_delta","delta":"..."}, {"event":"done","final_response":"..."}.
    Used by voice WebSocket for snappy token-by-token streaming; REST /pipelines remains full response.
    """
    logger.info("Stream pipeline request for session: {}", request.session_id)
    channel = (request.channel or "client").lower()
    if channel not in ("client", "agent"):
        channel = "client"
    client_id = request.client_id if request.client_id is not None else request.patient_id

    async def event_stream():
        try:
            yield _ndjson_line({"event": "status", "message": "Checking safety policies..."})
            input_validation = await clients.call_safety_guardrails(request.prompt)
            if not input_validation.get("is_safe"):
                final_response = (
                    clients.escalation_notice(input_validation)
                    + input_validation.get("validated_text", "[Content Redacted]")
                )
                yield _ndjson_line({"event": "done", "final_response": final_response})
                return

            yield _ndjson_line({"event": "status", "message": "Classifying intent..."})
            intent_result = await clients.call_llm_router(request.prompt)
            generated_text = ""

            if _is_agent_worthy(request.prompt):
                yield _ndjson_line({"event": "status", "message": "Running agent..."})
                agent_result = await clients.call_agent_runtime(request.prompt, request.client_id or request.patient_id)
                agent_text = (agent_result.get("output") or "").strip()
                if agent_text and not _is_unhelpful_agent_output(agent_text):
                    generated_text = agent_text
                else:
                    yield _ndjson_line({"event": "status", "message": "Searching knowledge base..."})
                    rag_context = await clients.call_rag_service(request.prompt, intent_result)
                    yield _ndjson_line({"event": "status", "message": "Generating response..."})
                    accumulated = []
                    async for delta in clients.call_llm_generate_stream(
                        model=intent_result.get("model"),
                        provider=intent_result.get("provider"),
                        prompt=request.prompt,
                        context=rag_context,
                        channel=channel,
                    ):
                        accumulated.append(delta)
                        yield _ndjson_line({"event": "text_delta", "delta": delta})
                    generated_text = "".join(accumulated)
            else:
                yield _ndjson_line({"event": "status", "message": "Searching knowledge base..."})
                rag_context = await clients.call_rag_service(request.prompt, intent_result)
                yield _ndjson_line({"event": "status", "message": "Generating response..."})
                accumulated = []
                async for delta in clients.call_llm_generate_stream(
                    model=intent_result.get("model"),
                    provider=intent_result.get("provider"),
                    prompt=request.prompt,
                    context=rag_context,
                    channel=channel,
                ):
                    accumulated.append(delta)
                    yield _ndjson_line({"event": "text_delta", "delta": delta})
                generated_text = "".join(accumulated)

            if not generated_text:
                generated_text = "I couldn't generate a response for that."

            yield _ndjson_line({"event": "status", "message": "Validating..."})
            validation_result = await clients.call_safety_guardrails(generated_text)
            final_response = validation_result.get("validated_text", generated_text)
            if not validation_result.get("is_safe"):
                final_response = validation_result.get("validated_text", "[Content Redacted]")
            notice = clients.escalation_notice(validation_result) or clients.escalation_notice(input_validation)
            if notice:
                final_response = notice + final_response
            yield _ndjson_line({"event": "done", "final_response": final_response})
        except Exception as e:
            logger.error("Pipeline stream failed: {}", e)
            yield _ndjson_line({"event": "error", "message": str(e)})

    return StreamingResponse(
        event_stream(),
        media_type="application/x-ndjson",
        headers={"Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"},
    )


from .admin_api import AgentDraftIn  # noqa: E402 — after app routes to avoid circular import at load


@app.post("/api/v1/agent/drafts/stream", summary="Stream agent draft generation as NDJSON")
async def stream_agent_draft(
    data: AgentDraftIn, db: AsyncSession = Depends(get_db_session)
):
    """Stream draft tokens: status, text_delta, done."""

    async def draft_stream():
        try:
            yield _ndjson_line({"event": "status", "message": "Loading client context..."})
            ctx = await agent_helpers.build_client_context(db, data.client_id)
            if not ctx:
                yield _ndjson_line({"event": "error", "message": "Client not found"})
                return
            showing_info = None
            if data.showing_id:
                showing = await db.get(db_models.Showing, data.showing_id)
                if showing:
                    showing_info = {
                        "start_time": showing.start_time.isoformat() if showing.start_time else None,
                        "status": showing.status,
                        "agent": showing.agent_name,
                    }
            prompt = agent_helpers.draft_prompt(
                data.draft_type,
                ctx,
                channel=data.channel,
                extra=data.context or "",
                showing=showing_info,
            )
            yield _ndjson_line({"event": "status", "message": "Generating draft..."})
            intent = await clients.call_llm_router(prompt)
            accumulated: list[str] = []
            async for delta in clients.call_llm_generate_direct_stream(
                prompt,
                model=intent.get("model"),
                provider=intent.get("provider"),
            ):
                accumulated.append(delta)
                yield _ndjson_line({"event": "text_delta", "delta": delta})
            draft = "".join(accumulated).strip() or "Could not generate a draft."
            yield _ndjson_line({"event": "done", "draft": draft, "draftType": data.draft_type})
        except Exception as e:
            logger.error("Draft stream failed: {}", e)
            yield _ndjson_line({"event": "error", "message": str(e)})

    return StreamingResponse(
        draft_stream(),
        media_type="application/x-ndjson",
        headers={"Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"},
    )
