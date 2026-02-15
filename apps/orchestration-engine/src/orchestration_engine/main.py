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

# Prompt phrases that suggest agent tool use (appointments, scheduling, knowledge search, etc.)
AGENT_WORTHY_PHRASES = [
    "appointment", "schedule", "book", "reschedule", "cancel appointment",
    "callback", "schedule a call", "get appointment", "my appointments",
    "weather", "search", "knowledge", "refill", "prescription refill",
]
from .models import PipelineRequest, ConversationState, PipelineStep as PydanticPipelineStep

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


class PatientCreateIn(BaseModel):
    full_name: str
    email: str | None = None
    phone_number: str | None = None
    tenant_id: int = 1


@app.post("/api/v1/patients", summary="Create a patient")
async def create_patient(data: PatientCreateIn, db: AsyncSession = Depends(get_db_session)):
    p = db_models.Patient(
        full_name=data.full_name,
        email=data.email,
        phone_number=data.phone_number,
        tenant_id=data.tenant_id,
    )
    db.add(p)
    await db.commit()
    await db.refresh(p)
    audit = db_models.AuditLog(
        service="Orchestration Engine",
        action="Patient Created",
        user="admin",
        details=f"Created patient '{p.full_name}' (id={p.id}, tenant_id={p.tenant_id})",
        severity="info",
    )
    db.add(audit)
    await db.commit()
    return {"id": p.id, "fullName": p.full_name, "email": p.email, "phoneNumber": p.phone_number}


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


@app.get("/api/v1/appointments", summary="List appointments (staff view, filterable by tenant/date)")
async def list_appointments(
    db: AsyncSession = Depends(get_db_session),
    tenant_id: int | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    limit: int = 100,
):
    """List appointments for hospital staff. Optional filters: tenant_id, date_from (YYYY-MM-DD), date_to."""
    q = select(db_models.Appointment).order_by(db_models.Appointment.start_time.desc())
    if tenant_id:
        q = q.where(db_models.Appointment.tenant_id == tenant_id)
    if date_from:
        try:
            dt = datetime.datetime.strptime(date_from[:10], "%Y-%m-%d")
            q = q.where(db_models.Appointment.start_time >= dt)
        except ValueError:
            pass
    if date_to:
        try:
            dt = datetime.datetime.strptime(date_to[:10], "%Y-%m-%d")
            dt = dt.replace(hour=23, minute=59, second=59)
            q = q.where(db_models.Appointment.start_time <= dt)
        except ValueError:
            pass
    result = await db.execute(q.limit(limit))
    appointments = result.scalars().all()
    return [
        {
            "id": a.id,
            "startTime": a.start_time.isoformat() if a.start_time else None,
            "endTime": a.end_time.isoformat() if a.end_time else None,
            "providerName": a.provider_name,
            "status": a.status,
            "patientId": a.patient_id,
            "tenantId": a.tenant_id,
        }
        for a in appointments
    ]


@app.get("/api/v1/staff", summary="List hospital staff (optionally by tenant/role)")
async def list_staff(
    db: AsyncSession = Depends(get_db_session),
    tenant_id: int | None = None,
    role: str | None = None,
):
    """List staff for hospital portal. Optional filters: tenant_id, role."""
    q = select(db_models.Staff).where(db_models.Staff.is_active == True)
    if tenant_id:
        q = q.where(db_models.Staff.tenant_id == tenant_id)
    if role:
        q = q.where(db_models.Staff.role == role)
    result = await db.execute(q.order_by(db_models.Staff.id))
    staff = result.scalars().all()
    return [
        {
            "id": s.id,
            "fullName": s.full_name,
            "email": s.email or "",
            "role": s.role,
            "tenantId": s.tenant_id,
        }
        for s in staff
    ]


class CreateApptIn(BaseModel):
    patient_id: int
    tenant_id: int | None = None
    provider_name: str = "Dr. Adams"
    reason: str = "General visit"
    date: str | None = None
    start_time: str = "09:00"


@app.post("/api/v1/appointments", summary="Create an appointment (staff booking)")
async def create_appointment(data: CreateApptIn, db: AsyncSession = Depends(get_db_session)):
    """Create appointment via DB write."""
    pt = await db.get(db_models.Patient, data.patient_id)
    if not pt:
        raise HTTPException(status_code=404, detail="Patient not found")
    tenant_id = data.tenant_id or pt.tenant_id or 1
    dt = datetime.date.today() + datetime.timedelta(days=1)
    if data.date:
        try:
            dt = datetime.datetime.strptime(str(data.date)[:10], "%Y-%m-%d").date()
        except ValueError:
            pass
    hour, minute = 9, 0
    try:
        parts = str(data.start_time).replace(":", " ").split()[:2]
        hour, minute = int(parts[0]), int(parts[1]) if len(parts) > 1 else 0
    except Exception:
        pass
    start_dt = datetime.datetime(dt.year, dt.month, dt.day, hour, minute, 0)
    end_dt = start_dt + datetime.timedelta(minutes=30)
    appointment = db_models.Appointment(
        start_time=start_dt,
        end_time=end_dt,
        provider_name=data.provider_name,
        reason=data.reason,
        status="confirmed",
        tenant_id=tenant_id,
        patient_id=data.patient_id,
    )
    db.add(appointment)
    await db.commit()
    await db.refresh(appointment)
    audit = db_models.AuditLog(
        service="Orchestration Engine",
        action="Appointment Created",
        user="staff",
        details=f"Created appointment APT-{appointment.id} for patient {data.patient_id}: {data.reason} with {data.provider_name}",
        severity="info",
    )
    db.add(audit)
    await db.commit()
    return {
        "id": appointment.id,
        "startTime": start_dt.isoformat(),
        "endTime": end_dt.isoformat(),
        "providerName": data.provider_name,
        "status": "confirmed",
        "patientId": data.patient_id,
        "tenantId": tenant_id,
    }


class AppointmentUpdateIn(BaseModel):
    status: str  # cancelled, completed, confirmed


@app.patch("/api/v1/appointments/{appointment_id}", summary="Update appointment status")
async def update_appointment(appointment_id: int, data: AppointmentUpdateIn, db: AsyncSession = Depends(get_db_session)):
    """Update appointment status (e.g. cancel)."""
    result = await db.execute(select(db_models.Appointment).where(db_models.Appointment.id == appointment_id))
    apt = result.scalar_one_or_none()
    if not apt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    apt.status = data.status
    await db.commit()
    await db.refresh(apt)
    audit = db_models.AuditLog(
        service="Orchestration Engine",
        action="Appointment Updated",
        user="staff",
        details=f"Updated appointment {appointment_id} status to {data.status}",
        severity="info",
    )
    db.add(audit)
    await db.commit()
    return {
        "id": apt.id,
        "status": apt.status,
    }


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

    # Cache check: skip for agent-worthy (patient-specific) prompts
    use_cache = not _is_agent_worthy(request.prompt) and CACHE_TTL_SEC > 0
    cache_key = _cache_key(request.prompt, request.tenant_id, request.user_id) if use_cache else None
    if cache_key and use_cache:
        cached = _get_cached(cache_key)
        if cached:
            logger.info("Cache hit for session: {}", request.session_id)
            # Still persist conversation with minimal steps
            conversation = db_models.Conversation(
                session_id=request.session_id,
                meta_data={"user_id": request.user_id, "tenant_id": request.tenant_id, "patient_id": request.patient_id},
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

        # 2. Agent path: when prompt suggests tool use, call agent-runtime
        generated_text = ""
        if _is_agent_worthy(request.prompt):
            agent_result, _ = await execute_step(
                db, conversation, "agent_execution", {"prompt": request.prompt, "patient_id": request.patient_id},
                clients.call_agent_runtime(request.prompt, request.patient_id)
            )
            agent_output = agent_result.get("output")
            if agent_output:
                generated_text = agent_output
                logger.info("Using agent output for session: {}", request.session_id)

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

        # 5. Escalation: prepend notice when safety flagged emergency
        if validation_result.get("requires_escalation"):
            final_response_text = (
                "⚠️ This may require immediate attention. Please connect with a staff member as soon as possible. "
                + final_response_text
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

    async def event_stream():
        try:
            yield _ndjson_line({"event": "status", "message": "Classifying intent..."})
            intent_result = await clients.call_llm_router(request.prompt)
            generated_text = ""

            if _is_agent_worthy(request.prompt):
                yield _ndjson_line({"event": "status", "message": "Running agent..."})
                agent_result = await clients.call_agent_runtime(request.prompt, request.patient_id)
                generated_text = (agent_result.get("output") or "").strip()
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
                final_response = "[Content Redacted]"
            if validation_result.get("requires_escalation"):
                final_response = (
                    "⚠️ This may require immediate attention. Please connect with a staff member as soon as possible. "
                    + final_response
                )
            yield _ndjson_line({"event": "done", "final_response": final_response})
        except Exception as e:
            logger.error("Pipeline stream failed: {}", e)
            yield _ndjson_line({"event": "error", "message": str(e)})

    return StreamingResponse(
        event_stream(),
        media_type="application/x-ndjson",
        headers={"Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"},
    )
