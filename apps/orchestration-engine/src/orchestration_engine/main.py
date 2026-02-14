import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from pydantic import BaseModel

from aurixa_db import get_db_session, engine, Base, models as db_models
from . import clients
from .models import PipelineRequest, ConversationState, PipelineStep as PydanticPipelineStep

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create database tables on startup."""
    logger.info("Orchestration engine starting up")
    if engine is not None:
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            logger.info("Database tables created.")
        except Exception as e:
            logger.error("Could not connect to database: {}", e)
            logger.warning("Orchestration starting; DB routes will fail until Postgres is available.")
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


async def execute_step(
    db: AsyncSession, conversation: db_models.Conversation, name: str, input_data: dict, coro
) -> (dict, db_models.PipelineStep):
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


@app.get("/api/v1/patients", summary="List patients (optionally by tenant)")
async def list_patients(
    db: AsyncSession = Depends(get_db_session),
    tenant_id: int | None = None,
):
    q = select(db_models.Patient)
    if tenant_id:
        q = q.where(db_models.Patient.tenant_id == tenant_id)
    result = await db.execute(q.order_by(db_models.Patient.id))
    patients = result.scalars().all()
    return [
        {
            "id": p.id,
            "fullName": p.full_name,
            "email": p.email,
            "phoneNumber": p.phone_number,
        }
        for p in patients
    ]


@app.get("/api/v1/patients/{patient_id}", summary="Get a single patient by ID")
async def get_patient(
    patient_id: int,
    db: AsyncSession = Depends(get_db_session),
):
    result = await db.execute(
        select(db_models.Patient).where(db_models.Patient.id == patient_id)
    )
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found")
    return {
        "id": p.id,
        "fullName": p.full_name,
        "email": p.email or "",
        "phoneNumber": p.phone_number or "",
        "tenantId": p.tenant_id,
    }


@app.get("/api/v1/patients/{patient_id}/conversations", summary="List conversations (calls/chat) for a patient")
async def list_patient_conversations(
    patient_id: int,
    db: AsyncSession = Depends(get_db_session),
    limit: int = 20,
):
    """Return recent conversations where meta_data contains patient_id (voice calls, portal chat)."""
    stmt = (
        select(db_models.Conversation)
        .where(text("(meta_data->>'patient_id')::int = :pid").bindparams(pid=patient_id))
        .order_by(db_models.Conversation.created_at.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    convos = result.scalars().all()
    out = []
    for c in convos:
        steps = await db.execute(
            select(db_models.PipelineStep)
            .where(db_models.PipelineStep.conversation_id == c.id)
            .order_by(db_models.PipelineStep.start_time.asc())
        )
        steps_list = steps.scalars().all()
        prompt_step = next((s for s in steps_list if s.step_name == "classify_intent"), None)
        gen_step = next((s for s in steps_list if s.step_name == "generate_response"), None)
        prompt = (prompt_step.input or {}).get("prompt", "") if prompt_step else ""
        response = ""
        if gen_step and gen_step.output:
            response = (gen_step.output or {}).get("content", "")
        out.append({
            "id": c.id,
            "sessionId": c.session_id,
            "prompt": prompt[:200],
            "response": response[:500] if response else "",
            "createdAt": c.created_at.isoformat() if c.created_at else None,
        })
    return out


@app.get("/api/v1/patients/{patient_id}/appointments", summary="List appointments for a patient")
async def list_patient_appointments(
    patient_id: int,
    db: AsyncSession = Depends(get_db_session),
):
    result = await db.execute(
        select(db_models.Appointment)
        .where(db_models.Appointment.patient_id == patient_id)
        .order_by(db_models.Appointment.start_time.desc())
    )
    appointments = result.scalars().all()
    return [
        {
            "id": a.id,
            "startTime": a.start_time.isoformat() if a.start_time else None,
            "endTime": a.end_time.isoformat() if a.end_time else None,
            "providerName": a.provider_name,
            "status": a.status,
        }
        for a in appointments
    ]


@app.get("/api/v1/analytics/summary", summary="DB-backed analytics summary")
async def get_analytics_summary(db: AsyncSession = Depends(get_db_session)):
    """Aggregate counts from DB for dashboards."""
    conv = await db.execute(select(func.count(db_models.Conversation.id)))
    tenants = await db.execute(select(func.count(db_models.Tenant.id)))
    audit = await db.execute(select(func.count(db_models.AuditLog.id)))
    kb = await db.execute(select(func.count(db_models.KnowledgeBaseArticle.id)))
    patients = await db.execute(select(func.count(db_models.Patient.id)))
    appointments = await db.execute(select(func.count(db_models.Appointment.id)))
    return {
        "conversations_total": conv.scalar() or 0,
        "tenants_count": tenants.scalar() or 0,
        "audit_entries_count": audit.scalar() or 0,
        "knowledge_articles_count": kb.scalar() or 0,
        "patients_count": patients.scalar() or 0,
        "appointments_count": appointments.scalar() or 0,
    }


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


@app.post("/api/v1/pipelines", response_model=ConversationState, summary="Run an orchestration pipeline")
async def run_pipeline(
    request: PipelineRequest, db: AsyncSession = Depends(get_db_session)
):
    """
    Run a full conversational pipeline and persist its state.
    """
    logger.info("Received new pipeline request for session: {}", request.session_id)

    # Create a new conversation record in the database
    meta = {"user_id": request.user_id, "tenant_id": request.tenant_id}
    if request.patient_id is not None:
        meta["patient_id"] = request.patient_id
    conversation = db_models.Conversation(
        session_id=request.session_id,
        meta_data=meta
    )
    db.add(conversation)
    await db.commit()
    
    final_response_text = ""
    try:
        # 1. Classify intent
        intent_result, _ = await execute_step(
            db, conversation, "classify_intent", {"prompt": request.prompt},
            clients.call_llm_router(request.prompt)
        )

        # 2. Retrieve context
        rag_context, _ = await execute_step(
            db, conversation, "knowledge_retrieval", {"prompt": request.prompt, "intent": intent_result},
            clients.call_rag_service(request.prompt, intent_result)
        )
        
        # 3. Generate response
        generation_result, _ = await execute_step(
            db, conversation, "generate_response", {"context": rag_context, "intent": intent_result},
            clients.call_llm_generate(
                model=intent_result.get("model"),
                provider=intent_result.get("provider"),
                prompt=request.prompt,
                context=rag_context
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
        else:
            final_response_text = validation_result.get("validated_text")
            logger.success("Pipeline executed successfully for session: {}", request.session_id)
    
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
