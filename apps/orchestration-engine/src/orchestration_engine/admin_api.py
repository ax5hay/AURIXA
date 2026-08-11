"""Real estate admin API routes for the orchestration engine."""

from __future__ import annotations

import datetime
import time
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from aurixa_db import get_db_session, models as db_models

router = APIRouter(prefix="/api/v1", tags=["admin"])

ALLOWED_SHOWING_STATUSES = {"confirmed", "cancelled", "completed", "no_show"}
# Legacy appointment statuses accepted until frontends migrate (Phase 4–5).
LEGACY_SHOWING_STATUSES = {"checked_in", "in_room"}


def _client_dict(client: db_models.Client) -> dict[str, Any]:
    return {
        "id": client.id,
        "fullName": client.full_name,
        "email": client.email or "",
        "phoneNumber": client.phone_number or "",
        "clientType": client.client_type,
        "tenantId": client.tenant_id,
        "preferences": client.preferences or {},
        # Legacy fields for patient-portal BFF (Phase 4 removes these).
        "patientId": client.id,
    }


def _showing_dict(showing: db_models.Showing) -> dict[str, Any]:
    return {
        "id": showing.id,
        "startTime": showing.start_time.isoformat() if showing.start_time else None,
        "endTime": showing.end_time.isoformat() if showing.end_time else None,
        "agentName": showing.agent_name,
        "staffId": showing.staff_id,
        "notes": showing.notes,
        "showingType": showing.showing_type,
        "status": showing.status,
        "clientId": showing.client_id,
        "listingId": showing.listing_id,
        "tenantId": showing.tenant_id,
        # Legacy fields
        "providerName": showing.agent_name,
        "patientId": showing.client_id,
        "reason": showing.notes,
    }


def _listing_dict(listing: db_models.Listing, prop: db_models.Property | None = None) -> dict[str, Any]:
    out: dict[str, Any] = {
        "id": listing.id,
        "tenantId": listing.tenant_id,
        "propertyId": listing.property_id,
        "listingType": listing.listing_type,
        "status": listing.status,
        "listPrice": listing.list_price,
        "rentAmount": listing.rent_amount,
        "marketingTitle": listing.marketing_title,
        "marketingDescription": listing.marketing_description,
        "externalId": listing.external_id,
        "externalSource": listing.external_source,
    }
    if prop:
        out["address"] = {
            "line1": prop.address_line1,
            "city": prop.city,
            "state": prop.state,
            "postalCode": prop.postal_code,
        }
        out["beds"] = prop.beds
        out["baths"] = prop.baths
        out["sqft"] = prop.sqft
    return out


def _parse_tenant_id(tenant_id: str) -> int:
    s = (tenant_id or "").strip()
    if s.startswith("t-"):
        s = s[2:].lstrip("0") or "0"
    try:
        return int(s)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid tenant id") from exc


class ClientCreateIn(BaseModel):
    full_name: str
    email: str | None = None
    phone_number: str | None = None
    client_type: str = "buyer"
    tenant_id: int = 1
    preferences: dict[str, Any] | None = None


class ShowingCreateIn(BaseModel):
    client_id: int
    tenant_id: int | None = None
    listing_id: int | None = None
    agent_name: str = "Alex Rivera"
    staff_id: int | None = None
    notes: str = "Property showing"
    showing_type: str = "private_tour"
    date: str | None = None
    start_time: str = "09:00"


class ShowingUpdateIn(BaseModel):
    status: str


class LeadCreateIn(BaseModel):
    full_name: str
    tenant_id: int = 1
    email: str | None = None
    phone_number: str | None = None
    source: str = "website"
    stage: str = "new"
    segment: str = "residential"
    listing_id: int | None = None
    assigned_staff_id: int | None = None
    client_id: int | None = None


class LeadStageUpdateIn(BaseModel):
    stage: str


# --- Clients ---


@router.get("/clients", summary="List clients (optionally by tenant)")
async def list_clients(
    db: AsyncSession = Depends(get_db_session),
    tenant_id: int | None = None,
    client_type: str | None = None,
    q: str | None = None,
):
    query = select(db_models.Client)
    if tenant_id:
        query = query.where(db_models.Client.tenant_id == tenant_id)
    if client_type:
        query = query.where(db_models.Client.client_type == client_type)
    if q:
        like = f"%{q.strip()}%"
        query = query.where(
            or_(db_models.Client.full_name.ilike(like), db_models.Client.email.ilike(like))
        )
    result = await db.execute(query.order_by(db_models.Client.id))
    return [_client_dict(c) for c in result.scalars().all()]


@router.post("/clients", summary="Create a client")
async def create_client(data: ClientCreateIn, db: AsyncSession = Depends(get_db_session)):
    client = db_models.Client(
        full_name=data.full_name,
        email=data.email,
        phone_number=data.phone_number,
        client_type=data.client_type,
        tenant_id=data.tenant_id,
        preferences=data.preferences,
    )
    db.add(client)
    await db.commit()
    await db.refresh(client)
    db.add(
        db_models.AuditLog(
            service="Orchestration Engine",
            action="client.create",
            user="admin",
            details=f"Created client '{client.full_name}' (id={client.id})",
            severity="info",
        )
    )
    await db.commit()
    return _client_dict(client)


@router.get("/clients/{client_id}", summary="Get a client by ID")
async def get_client(client_id: int, db: AsyncSession = Depends(get_db_session)):
    result = await db.execute(select(db_models.Client).where(db_models.Client.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return _client_dict(client)


@router.get("/clients/{client_id}/showings", summary="List showings for a client")
async def list_client_showings(client_id: int, db: AsyncSession = Depends(get_db_session)):
    result = await db.execute(
        select(db_models.Showing)
        .where(db_models.Showing.client_id == client_id)
        .order_by(db_models.Showing.start_time.desc())
    )
    return [_showing_dict(s) for s in result.scalars().all()]


@router.get("/clients/{client_id}/conversations", summary="List conversations for a client")
async def list_client_conversations(
    client_id: int,
    db: AsyncSession = Depends(get_db_session),
    limit: int = 20,
):
    stmt = (
        select(db_models.Conversation)
        .where(
            text(
                "(meta_data->>'client_id')::int = :cid OR (meta_data->>'patient_id')::int = :cid"
            ).bindparams(cid=client_id)
        )
        .order_by(db_models.Conversation.created_at.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    convos = result.scalars().all()
    out = []
    for convo in convos:
        steps = await db.execute(
            select(db_models.PipelineStep)
            .where(db_models.PipelineStep.conversation_id == convo.id)
            .order_by(db_models.PipelineStep.start_time.asc())
        )
        steps_list = steps.scalars().all()
        prompt_step = next((s for s in steps_list if s.step_name == "classify_intent"), None)
        gen_step = next((s for s in steps_list if s.step_name == "generate_response"), None)
        prompt = (prompt_step.input or {}).get("prompt", "") if prompt_step else ""
        response = (gen_step.output or {}).get("content", "") if gen_step and gen_step.output else ""
        out.append(
            {
                "id": convo.id,
                "sessionId": convo.session_id,
                "prompt": prompt[:200],
                "response": response[:500] if response else "",
                "createdAt": convo.created_at.isoformat() if convo.created_at else None,
            }
        )
    return out


# --- Showings ---


@router.get("/showings", summary="List showings (staff view)")
async def list_showings(
    db: AsyncSession = Depends(get_db_session),
    tenant_id: int | None = None,
    client_id: int | None = None,
    listing_id: int | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    limit: int = 100,
):
    query = select(db_models.Showing).order_by(db_models.Showing.start_time.desc())
    if tenant_id:
        query = query.where(db_models.Showing.tenant_id == tenant_id)
    if client_id:
        query = query.where(db_models.Showing.client_id == client_id)
    if listing_id:
        query = query.where(db_models.Showing.listing_id == listing_id)
    if date_from:
        try:
            dt = datetime.datetime.strptime(date_from[:10], "%Y-%m-%d")
            query = query.where(db_models.Showing.start_time >= dt)
        except ValueError:
            pass
    if date_to:
        try:
            dt = datetime.datetime.strptime(date_to[:10], "%Y-%m-%d").replace(
                hour=23, minute=59, second=59
            )
            query = query.where(db_models.Showing.start_time <= dt)
        except ValueError:
            pass
    result = await db.execute(query.limit(limit))
    return [_showing_dict(s) for s in result.scalars().all()]


@router.post("/showings", summary="Create a showing")
async def create_showing(data: ShowingCreateIn, db: AsyncSession = Depends(get_db_session)):
    client = await db.get(db_models.Client, data.client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    tenant_id = data.tenant_id or client.tenant_id or 1
    slot_date = datetime.date.today() + datetime.timedelta(days=1)
    if data.date:
        try:
            slot_date = datetime.datetime.strptime(str(data.date)[:10], "%Y-%m-%d").date()
        except ValueError:
            pass
    hour, minute = 9, 0
    try:
        parts = str(data.start_time).replace(":", " ").split()[:2]
        hour, minute = int(parts[0]), int(parts[1]) if len(parts) > 1 else 0
    except Exception:
        pass
    start_dt = datetime.datetime(slot_date.year, slot_date.month, slot_date.day, hour, minute, 0)
    end_dt = start_dt + datetime.timedelta(minutes=30)
    showing = db_models.Showing(
        start_time=start_dt,
        end_time=end_dt,
        agent_name=data.agent_name,
        staff_id=data.staff_id,
        notes=data.notes,
        showing_type=data.showing_type,
        status="confirmed",
        tenant_id=tenant_id,
        client_id=data.client_id,
        listing_id=data.listing_id,
    )
    db.add(showing)
    await db.commit()
    await db.refresh(showing)
    db.add(
        db_models.AuditLog(
            service="Orchestration Engine",
            action="showing.create",
            user="staff",
            details=f"Created showing {showing.id} for client {data.client_id}",
            severity="info",
        )
    )
    await db.commit()
    return _showing_dict(showing)


@router.patch("/showings/{showing_id}", summary="Update showing status")
async def update_showing(
    showing_id: int, data: ShowingUpdateIn, db: AsyncSession = Depends(get_db_session)
):
    status = (data.status or "").strip().lower()
    allowed = ALLOWED_SHOWING_STATUSES | LEGACY_SHOWING_STATUSES
    if status not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported showing status. Allowed: {', '.join(sorted(ALLOWED_SHOWING_STATUSES))}",
        )
    if status in LEGACY_SHOWING_STATUSES:
        status = "confirmed"
    result = await db.execute(
        select(db_models.Showing).where(db_models.Showing.id == showing_id)
    )
    showing = result.scalar_one_or_none()
    if not showing:
        raise HTTPException(status_code=404, detail="Showing not found")
    showing.status = status
    await db.commit()
    await db.refresh(showing)
    db.add(
        db_models.AuditLog(
            service="Orchestration Engine",
            action="showing.update",
            user="staff",
            details=f"Updated showing {showing_id} status to {status}",
            severity="info",
        )
    )
    await db.commit()
    return {"id": showing.id, "status": showing.status}


# --- Listings & properties ---


@router.get("/listings", summary="List listings")
async def list_listings(
    db: AsyncSession = Depends(get_db_session),
    tenant_id: int | None = None,
    status: str | None = None,
    listing_type: str | None = None,
    limit: int = 100,
):
    query = select(db_models.Listing, db_models.Property).join(
        db_models.Property, db_models.Listing.property_id == db_models.Property.id
    )
    if tenant_id:
        query = query.where(db_models.Listing.tenant_id == tenant_id)
    if status:
        query = query.where(db_models.Listing.status == status)
    if listing_type:
        query = query.where(db_models.Listing.listing_type == listing_type)
    result = await db.execute(query.order_by(db_models.Listing.id).limit(limit))
    return [_listing_dict(listing, prop) for listing, prop in result.all()]


@router.get("/listings/{listing_id}", summary="Get listing detail")
async def get_listing(listing_id: int, db: AsyncSession = Depends(get_db_session)):
    result = await db.execute(
        select(db_models.Listing, db_models.Property)
        .join(db_models.Property, db_models.Listing.property_id == db_models.Property.id)
        .where(db_models.Listing.id == listing_id)
    )
    row = result.one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Listing not found")
    listing, prop = row
    return _listing_dict(listing, prop)


@router.get("/properties", summary="List properties")
async def list_properties(
    db: AsyncSession = Depends(get_db_session),
    tenant_id: int | None = None,
    limit: int = 100,
):
    query = select(db_models.Property)
    if tenant_id:
        query = query.where(db_models.Property.tenant_id == tenant_id)
    result = await db.execute(query.order_by(db_models.Property.id).limit(limit))
    props = result.scalars().all()
    return [
        {
            "id": p.id,
            "tenantId": p.tenant_id,
            "addressLine1": p.address_line1,
            "city": p.city,
            "state": p.state,
            "postalCode": p.postal_code,
            "propertyType": p.property_type,
            "beds": p.beds,
            "baths": p.baths,
            "sqft": p.sqft,
        }
        for p in props
    ]


# --- Leads ---


@router.get("/leads", summary="List leads")
async def list_leads(
    db: AsyncSession = Depends(get_db_session),
    tenant_id: int | None = None,
    stage: str | None = None,
    limit: int = 100,
):
    query = select(db_models.Lead)
    if tenant_id:
        query = query.where(db_models.Lead.tenant_id == tenant_id)
    if stage:
        query = query.where(db_models.Lead.stage == stage)
    result = await db.execute(query.order_by(db_models.Lead.id.desc()).limit(limit))
    leads = result.scalars().all()
    return [
        {
            "id": lead.id,
            "fullName": lead.full_name,
            "email": lead.email,
            "phoneNumber": lead.phone_number,
            "source": lead.source,
            "stage": lead.stage,
            "segment": lead.segment,
            "tenantId": lead.tenant_id,
            "clientId": lead.client_id,
            "listingId": lead.listing_id,
            "assignedStaffId": lead.assigned_staff_id,
        }
        for lead in leads
    ]


@router.post("/leads", summary="Create a lead")
async def create_lead(data: LeadCreateIn, db: AsyncSession = Depends(get_db_session)):
    lead = db_models.Lead(
        tenant_id=data.tenant_id,
        full_name=data.full_name,
        email=data.email,
        phone_number=data.phone_number,
        source=data.source,
        stage=data.stage,
        segment=data.segment,
        listing_id=data.listing_id,
        assigned_staff_id=data.assigned_staff_id,
        client_id=data.client_id,
    )
    db.add(lead)
    await db.commit()
    await db.refresh(lead)
    return {"id": lead.id, "stage": lead.stage, "fullName": lead.full_name}


@router.patch("/leads/{lead_id}/stage", summary="Update lead pipeline stage")
async def update_lead_stage(
    lead_id: int, data: LeadStageUpdateIn, db: AsyncSession = Depends(get_db_session)
):
    lead = await db.get(db_models.Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    lead.stage = data.stage
    await db.commit()
    db.add(
        db_models.AuditLog(
            service="Orchestration Engine",
            action="lead.stage_change",
            user="staff",
            details=f"Lead {lead_id} stage → {data.stage}",
            severity="info",
        )
    )
    await db.commit()
    return {"id": lead.id, "stage": lead.stage}


# --- Staff ---


@router.get("/staff", summary="List organization staff")
async def list_staff(
    db: AsyncSession = Depends(get_db_session),
    tenant_id: int | None = None,
    role: str | None = None,
):
    query = select(db_models.Staff).where(db_models.Staff.is_active == True)  # noqa: E712
    if tenant_id:
        query = query.where(db_models.Staff.tenant_id == tenant_id)
    if role:
        query = query.where(db_models.Staff.role == role)
    result = await db.execute(query.order_by(db_models.Staff.id))
    return [
        {
            "id": s.id,
            "fullName": s.full_name,
            "email": s.email or "",
            "role": s.role,
            "tenantId": s.tenant_id,
        }
        for s in result.scalars().all()
    ]


# --- Analytics (extended) ---


@router.get("/analytics/summary", summary="DB-backed analytics summary")
async def get_analytics_summary(db: AsyncSession = Depends(get_db_session)):
    conv = await db.execute(select(func.count(db_models.Conversation.id)))
    tenants = await db.execute(select(func.count(db_models.Tenant.id)))
    audit = await db.execute(select(func.count(db_models.AuditLog.id)))
    kb = await db.execute(select(func.count(db_models.KnowledgeBaseArticle.id)))
    clients_count = (await db.execute(select(func.count(db_models.Client.id)))).scalar() or 0
    showings_count = (await db.execute(select(func.count(db_models.Showing.id)))).scalar() or 0
    listings_count = (await db.execute(select(func.count(db_models.Listing.id)))).scalar() or 0
    leads_count = (await db.execute(select(func.count(db_models.Lead.id)))).scalar() or 0
    return {
        "conversations_total": conv.scalar() or 0,
        "tenants_count": tenants.scalar() or 0,
        "audit_entries_count": audit.scalar() or 0,
        "knowledge_articles_count": kb.scalar() or 0,
        "clients_count": clients_count,
        "showings_count": showings_count,
        "listings_count": listings_count,
        "leads_count": leads_count,
        "patients_count": clients_count,
        "appointments_count": showings_count,
    }


# --- Legacy healthcare routes (delegate to real estate handlers) ---


@router.get("/patients", include_in_schema=False)
async def list_patients_legacy(
    db: AsyncSession = Depends(get_db_session), tenant_id: int | None = None
):
    return await list_clients(db=db, tenant_id=tenant_id)


@router.post("/patients", include_in_schema=False)
async def create_patient_legacy(data: ClientCreateIn, db: AsyncSession = Depends(get_db_session)):
    return await create_client(data, db)


@router.get("/patients/{patient_id}", include_in_schema=False)
async def get_patient_legacy(patient_id: int, db: AsyncSession = Depends(get_db_session)):
    return await get_client(patient_id, db)


@router.get("/patients/{patient_id}/appointments", include_in_schema=False)
async def list_patient_appointments_legacy(
    patient_id: int, db: AsyncSession = Depends(get_db_session)
):
    return await list_client_showings(patient_id, db)


@router.get("/patients/{patient_id}/conversations", include_in_schema=False)
async def list_patient_conversations_legacy(
    patient_id: int, db: AsyncSession = Depends(get_db_session), limit: int = 20
):
    return await list_client_conversations(patient_id, db, limit)


class LegacyApptCreateIn(BaseModel):
    patient_id: int
    tenant_id: int | None = None
    provider_name: str = "Alex Rivera"
    reason: str = "Property showing"
    date: str | None = None
    start_time: str = "09:00"


@router.get("/appointments", include_in_schema=False)
async def list_appointments_legacy(
    db: AsyncSession = Depends(get_db_session),
    tenant_id: int | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    limit: int = 100,
):
    return await list_showings(
        db=db, tenant_id=tenant_id, date_from=date_from, date_to=date_to, limit=limit
    )


@router.post("/appointments", include_in_schema=False)
async def create_appointment_legacy(
    data: LegacyApptCreateIn, db: AsyncSession = Depends(get_db_session)
):
    return await create_showing(
        ShowingCreateIn(
            client_id=data.patient_id,
            tenant_id=data.tenant_id,
            agent_name=data.provider_name,
            notes=data.reason,
            date=data.date,
            start_time=data.start_time,
        ),
        db,
    )


class LegacyApptUpdateIn(BaseModel):
    status: str


@router.patch("/appointments/{appointment_id}", include_in_schema=False)
async def update_appointment_legacy(
    appointment_id: int, data: LegacyApptUpdateIn, db: AsyncSession = Depends(get_db_session)
):
    return await update_showing(appointment_id, ShowingUpdateIn(status=data.status), db)
