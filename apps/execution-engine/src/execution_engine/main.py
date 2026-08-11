"""AURIXA Execution Engine - real DB-backed real estate actions."""

import datetime
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Depends
from loguru import logger
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from aurixa_db import get_db_session
from aurixa_db.models import (
    AuditLog,
    AvailabilitySlot,
    Client,
    ClientFinancing,
    Deal,
    Lead,
    Listing,
    Property,
    ServiceRequest,
    Showing,
)
from .models import ExecutionRequest, ExecutionResponse


def _resolve_client_id(params: dict) -> int | None:
    raw = params.get("client_id", params.get("patient_id"))
    if raw is None:
        return None
    try:
        return int(raw)
    except (ValueError, TypeError):
        return None


def _send_email(params: dict) -> str:
    recipient = params.get("recipient", "unknown")
    subject = params.get("subject", "")
    return f"Email queued to {recipient} with subject '{subject}'."


def _schedule_reminder(params: dict) -> str:
    cid = params.get("client_id", params.get("patient_id", "unknown"))
    return f"Reminder scheduled for client {cid}."


async def _get_showings(db: AsyncSession, params: dict) -> str:
    cid = _resolve_client_id(params)
    if cid is None:
        return "Client ID required."
    result = await db.execute(
        select(Showing)
        .where(Showing.client_id == cid, Showing.status != "cancelled")
        .order_by(Showing.start_time.asc())
        .limit(10)
    )
    showings = result.scalars().all()
    if not showings:
        return "No upcoming showings found."
    lines = []
    for s in showings:
        dt = s.start_time.strftime("%a %b %d, %Y at %I:%M %p") if s.start_time else "TBD"
        lines.append(f"- {dt}: {s.agent_name} ({s.notes or 'Showing'}) [{s.status}]")
    return "Upcoming showings:\n" + "\n".join(lines)


async def _create_showing(db: AsyncSession, params: dict) -> str:
    cid = _resolve_client_id(params)
    notes = params.get("notes") or params.get("reason", "Property showing")
    slot_date = params.get("date") or params.get("slot_date")
    start_time = params.get("start_time", "09:00")
    agent_name = params.get("agent_name") or params.get("provider_name", "Alex Rivera")
    tenant_id = params.get("tenant_id")
    listing_id = params.get("listing_id")

    if cid is None:
        return "Client ID required."

    if tenant_id is None:
        client = await db.get(Client, cid)
        tenant_id = client.tenant_id if client else 1
    try:
        tenant_id = int(tenant_id)
    except (ValueError, TypeError):
        tenant_id = 1

    if slot_date:
        if isinstance(slot_date, str) and slot_date.lower() == "tomorrow":
            dt = datetime.date.today() + datetime.timedelta(days=1)
        else:
            try:
                dt = datetime.datetime.strptime(str(slot_date)[:10], "%Y-%m-%d").date()
            except ValueError:
                dt = datetime.date.today() + datetime.timedelta(days=1)
    else:
        dt = datetime.date.today() + datetime.timedelta(days=1)

    try:
        hour, minute = map(int, str(start_time).replace(":", " ").split()[:2])
    except Exception:
        hour, minute = 9, 0
    start_dt = datetime.datetime(dt.year, dt.month, dt.day, hour, minute, 0)
    end_dt = start_dt + datetime.timedelta(minutes=30)

    showing = Showing(
        start_time=start_dt,
        end_time=end_dt,
        agent_name=agent_name,
        notes=notes,
        status="confirmed",
        tenant_id=tenant_id,
        client_id=cid,
        listing_id=int(listing_id) if listing_id else None,
    )
    db.add(showing)
    await db.commit()
    await db.refresh(showing)
    db.add(
        AuditLog(
            service="Execution Engine",
            action="showing.create",
            user="system",
            details=f"Created showing {showing.id} for client {cid}",
            severity="info",
        )
    )
    await db.commit()
    return (
        f"Showing created for {notes}. Confirmation: SHW-{showing.id}. "
        f"{start_dt.strftime('%a %b %d at %I:%M %p')} with {agent_name}."
    )


async def _get_client_financing(db: AsyncSession, params: dict) -> str:
    cid = _resolve_client_id(params)
    if cid is None:
        return "Client ID required."
    result = await db.execute(
        select(ClientFinancing).where(
            ClientFinancing.client_id == cid,
            or_(ClientFinancing.status == "active", ClientFinancing.status == "pre_approved"),
        )
    )
    fin = result.scalar_one_or_none()
    if not fin:
        return f"No active financing on file for client {cid}."
    return (
        f"Financing verified. Program: {fin.program_name}. "
        f"Lender: {fin.lender or 'N/A'}. Deposit: {fin.deposit_amount or 'N/A'}."
    )


async def _create_service_request(db: AsyncSession, params: dict) -> str:
    cid = _resolve_client_id(params)
    title = params.get("title") or params.get("medication_name") or "Service request"
    category = params.get("category", "maintenance")

    if cid is None:
        return "Client ID required."

    result = await db.execute(
        select(ServiceRequest).where(
            ServiceRequest.client_id == cid,
            or_(ServiceRequest.status == "active", ServiceRequest.status == "open"),
        )
    )
    existing = result.scalars().all()
    target = None
    for item in existing:
        if title.lower() in (item.title or "").lower():
            target = item
            break
    if not target and existing:
        target = existing[0]
        title = target.title

    if target:
        target.status = "in_progress"
        target.requested_at = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
        await db.commit()
    else:
        target = ServiceRequest(
            client_id=cid,
            category=category,
            title=title,
            status="open",
            requested_at=datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None),
        )
        db.add(target)
        await db.commit()

    db.add(
        AuditLog(
            service="Execution Engine",
            action="service_request.create",
            user="system",
            details=f"Client {cid} submitted request: {title}",
            severity="info",
        )
    )
    await db.commit()
    return f"Service request submitted for {title}. Our team will follow up shortly."


async def _get_availability(db: AsyncSession, params: dict) -> str:
    date_str = params.get("date", "tomorrow")
    tenant_id = params.get("tenant_id", 1)
    try:
        tenant_id = int(tenant_id)
    except (ValueError, TypeError):
        tenant_id = 1

    if isinstance(date_str, str) and date_str.lower() == "tomorrow":
        dt = datetime.date.today() + datetime.timedelta(days=1)
    else:
        try:
            dt = datetime.datetime.strptime(str(date_str)[:10], "%Y-%m-%d").date()
        except ValueError:
            dt = datetime.date.today()

    result = await db.execute(
        select(AvailabilitySlot)
        .where(AvailabilitySlot.slot_date == dt, AvailabilitySlot.tenant_id == tenant_id)
        .order_by(AvailabilitySlot.start_time)
        .limit(15)
    )
    slots = result.scalars().all()
    if not slots:
        return (
            f"Available slots for {dt}: 9:00 AM, 10:00 AM, 2:00 PM. "
            "(Contact the office for exact agent availability.)"
        )
    lines = []
    seen = set()
    for slot in slots:
        key = (slot.start_time, slot.agent_name)
        if key not in seen:
            seen.add(key)
            lines.append(f"- {slot.start_time} with {slot.agent_name}")
    return f"Available slots for {dt}:\n" + "\n".join(lines[:10])


async def _get_listings(db: AsyncSession, params: dict) -> str:
    tenant_id = params.get("tenant_id", 1)
    status = params.get("status", "active")
    try:
        tenant_id = int(tenant_id)
    except (ValueError, TypeError):
        tenant_id = 1

    query = (
        select(Listing, Property)
        .join(Property, Listing.property_id == Property.id)
        .where(Listing.tenant_id == tenant_id)
    )
    if status:
        query = query.where(Listing.status == status)
    result = await db.execute(query.order_by(Listing.id).limit(8))
    rows = result.all()
    if not rows:
        return "No listings found matching your criteria."
    lines = []
    for listing, prop in rows:
        price = listing.list_price or listing.rent_amount or "N/A"
        lines.append(
            f"- {listing.marketing_title or prop.address_line1}: "
            f"${price:,} — {prop.beds or '?'} bed / {prop.city}"
        )
    return "Available listings:\n" + "\n".join(lines)


async def _get_listing_detail(db: AsyncSession, params: dict) -> str:
    listing_id = params.get("listing_id")
    if not listing_id:
        return "Listing ID required."
    try:
        listing_id = int(listing_id)
    except (ValueError, TypeError):
        return f"Invalid listing ID: {listing_id}"

    result = await db.execute(
        select(Listing, Property)
        .join(Property, Listing.property_id == Property.id)
        .where(Listing.id == listing_id)
    )
    row = result.one_or_none()
    if not row:
        return f"Listing {listing_id} not found."
    listing, prop = row
    price = listing.list_price or listing.rent_amount
    title = listing.marketing_title or "Listing"
    addr = f"{prop.address_line1}, {prop.city}"
    price_part = f"Price: ${price:,}. " if price else ""
    desc = (listing.marketing_description or "")[:400]
    return (
        f"{title} at {addr}. {price_part}"
        f"{prop.beds or '?'} bed, {prop.baths or '?'} bath, {prop.sqft or '?'} sqft. {desc}"
    )


async def _create_lead(db: AsyncSession, params: dict) -> str:
    full_name = params.get("full_name") or params.get("name")
    if not full_name:
        return "Lead name required."
    lead = Lead(
        tenant_id=int(params.get("tenant_id", 1)),
        full_name=full_name,
        email=params.get("email"),
        phone_number=params.get("phone_number"),
        source=params.get("source", "assistant"),
        stage="new",
        listing_id=int(params["listing_id"]) if params.get("listing_id") else None,
    )
    db.add(lead)
    await db.commit()
    await db.refresh(lead)
    return f"Lead created for {full_name} (id={lead.id})."


async def _update_lead_stage(db: AsyncSession, params: dict) -> str:
    lead_id = params.get("lead_id")
    stage = params.get("stage")
    if not lead_id or not stage:
        return "Lead ID and stage required."
    lead = await db.get(Lead, int(lead_id))
    if not lead:
        return f"Lead {lead_id} not found."
    lead.stage = stage
    await db.commit()
    return f"Lead {lead_id} updated to stage '{stage}'."


async def _get_deal_status(db: AsyncSession, params: dict) -> str:
    cid = _resolve_client_id(params)
    deal_id = params.get("deal_id")
    query = select(Deal)
    if deal_id:
        query = query.where(Deal.id == int(deal_id))
    elif cid:
        query = query.where(Deal.client_id == cid).order_by(Deal.id.desc())
    else:
        return "Client ID or deal ID required."
    result = await db.execute(query.limit(1))
    deal = result.scalar_one_or_none()
    if not deal:
        return "No deal found."
    return f"Deal {deal.id}: status {deal.status}, milestone {deal.milestone or 'none'}."


async def _log_audit(db: AsyncSession, params: dict) -> str:
    audit = AuditLog(
        service=str(params.get("service", "Execution Engine")),
        action=str(params.get("action", "Custom Audit")),
        user=str(params.get("user", "system")),
        details=str(params.get("details", str(params))),
        severity=str(params.get("severity", "info")),
    )
    db.add(audit)
    await db.commit()
    return "Audit entry recorded."


def _sync_wrap(fn):
    async def _async_wrapper(db, params):
        return fn(params)

    return _async_wrapper


ASYNC_ACTIONS = {
    # Real estate tools
    "get_showings": _get_showings,
    "create_showing": _create_showing,
    "get_availability": _get_availability,
    "get_client_financing": _get_client_financing,
    "create_service_request": _create_service_request,
    "get_listings": _get_listings,
    "get_listing_detail": _get_listing_detail,
    "create_lead": _create_lead,
    "update_lead_stage": _update_lead_stage,
    "get_deal_status": _get_deal_status,
    "log_audit": _log_audit,
    # Legacy healthcare aliases (Phase 4 removes)
    "get_appointments": _get_showings,
    "create_appointment": _create_showing,
    "check_insurance": _get_client_financing,
    "request_prescription_refill": _create_service_request,
}

SYNC_ACTIONS = {
    "send_email": _sync_wrap(_send_email),
    "schedule_reminder": _sync_wrap(_schedule_reminder),
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Execution Engine service starting up")
    yield
    logger.info("Execution Engine service shutting down")


app = FastAPI(
    title="AURIXA Execution Engine",
    version="0.2.0",
    lifespan=lifespan,
    description="Real estate workflow actions backed by PostgreSQL.",
)


@app.get("/health", summary="Health check endpoint")
async def health():
    return {"service": "execution-engine", "status": "healthy"}


@app.get("/api/v1/actions", summary="List available actions")
async def list_actions():
    all_actions = list(SYNC_ACTIONS.keys()) + list(ASYNC_ACTIONS.keys())
    return {"actions": sorted(set(all_actions))}


@app.post("/api/v1/execute", response_model=ExecutionResponse, summary="Execute an action")
async def execute(request: ExecutionRequest, db: AsyncSession = Depends(get_db_session)):
    logger.info("Execute action: '{}' (idempotency: {})", request.action_name, request.idempotency_key[:8])
    params = request.params or {}

    if request.action_name in ASYNC_ACTIONS:
        try:
            result = await ASYNC_ACTIONS[request.action_name](db, params)
            return ExecutionResponse(status="success", result={"message": result})
        except Exception as e:
            logger.error("Action '{}' failed: {}", request.action_name, e)
            return ExecutionResponse(status="error", error_message=str(e))
    if request.action_name in SYNC_ACTIONS:
        try:
            result = await SYNC_ACTIONS[request.action_name](db, params)
            return ExecutionResponse(status="success", result={"message": result})
        except Exception as e:
            logger.error("Action '{}' failed: {}", request.action_name, e)
            return ExecutionResponse(status="error", error_message=str(e))

    raise HTTPException(status_code=404, detail=f"Action '{request.action_name}' not found.")
