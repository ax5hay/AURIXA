"""Helpers for agent workspace features: escalations, activity feeds, draft context."""

from __future__ import annotations

import datetime
from typing import Any

from sqlalchemy import or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from aurixa_db import models as db_models

TERMINAL_LEAD_STAGES = {"closed", "lost", "closed_won", "closed_lost", "archived"}
STALE_LEAD_STAGES = {"new", "contacted", "qualified", "showing_scheduled", "nurturing"}


def _parse_tenant_id(tenant_id: str | int | None) -> int | None:
    if tenant_id is None:
        return None
    if isinstance(tenant_id, int):
        return tenant_id
    s = str(tenant_id).strip()
    if s.startswith("t-"):
        s = s[2:].lstrip("0") or "0"
    try:
        return int(s)
    except ValueError:
        return None


async def persist_escalation(
    db: AsyncSession,
    *,
    validation: dict[str, Any],
    source_text: str,
    tenant_id: str | int | None,
    client_id: int | None,
    conversation_id: int | None,
    session_id: str | None,
    channel: str = "client",
) -> db_models.SafetyEscalation | None:
    """Store a safety escalation for staff review when validation requires it."""
    if not validation.get("requires_escalation"):
        return None
    tid = _parse_tenant_id(tenant_id)
    row = db_models.SafetyEscalation(
        tenant_id=tid,
        client_id=client_id,
        conversation_id=conversation_id,
        session_id=session_id,
        channel=channel,
        source_text=(source_text or "")[:4000],
        escalation_type=validation.get("escalation_type"),
        status="pending",
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


async def build_client_context(db: AsyncSession, client_id: int) -> dict[str, Any]:
    """Load client, showings, and preferences for LLM draft generation."""
    client = await db.get(db_models.Client, client_id)
    if not client:
        return {}
    showings_result = await db.execute(
        select(db_models.Showing)
        .where(db_models.Showing.client_id == client_id)
        .order_by(db_models.Showing.start_time.desc())
        .limit(5)
    )
    showings = showings_result.scalars().all()
    return {
        "client_name": client.full_name,
        "client_type": client.client_type,
        "email": client.email,
        "phone": client.phone_number,
        "preferences": client.preferences or {},
        "notes": client.notes or "",
        "recent_showings": [
            {
                "id": s.id,
                "start_time": s.start_time.isoformat() if s.start_time else None,
                "status": s.status,
                "agent": s.agent_name,
                "post_notes": s.post_showing_notes or "",
            }
            for s in showings
        ],
    }


async def list_stale_leads(
    db: AsyncSession,
    *,
    tenant_id: int | None,
    days: int = 7,
    limit: int = 50,
) -> list[dict[str, Any]]:
    """Leads in active stages with no recent contact."""
    cutoff = datetime.datetime.utcnow() - datetime.timedelta(days=days)
    query = select(db_models.Lead).where(
        db_models.Lead.stage.notin_(list(TERMINAL_LEAD_STAGES)),
    )
    if tenant_id:
        query = query.where(db_models.Lead.tenant_id == tenant_id)
    result = await db.execute(query.order_by(db_models.Lead.updated_at.asc()).limit(limit * 3))
    out: list[dict[str, Any]] = []
    for lead in result.scalars().all():
        last = lead.last_contacted_at or lead.updated_at or lead.created_at
        if last and last > cutoff:
            continue
        if lead.stage not in STALE_LEAD_STAGES and lead.stage not in TERMINAL_LEAD_STAGES:
            if lead.stage in ("new", "contacted", "qualified"):
                pass
            else:
                continue
        days_stale = (datetime.datetime.utcnow() - last).days if last else days
        out.append(
            {
                "id": lead.id,
                "fullName": lead.full_name,
                "email": lead.email,
                "phoneNumber": lead.phone_number,
                "stage": lead.stage,
                "clientId": lead.client_id,
                "daysStale": days_stale,
                "lastContactAt": last.isoformat() if last else None,
            }
        )
        if len(out) >= limit:
            break
    return out


async def list_cold_clients(
    db: AsyncSession,
    *,
    tenant_id: int | None,
    days: int = 7,
    limit: int = 50,
) -> list[dict[str, Any]]:
    """Clients with showings but no recent conversation or contact."""
    cutoff = datetime.datetime.utcnow() - datetime.timedelta(days=days)
    query = select(db_models.Client)
    if tenant_id:
        query = query.where(db_models.Client.tenant_id == tenant_id)
    result = await db.execute(query.limit(200))
    out: list[dict[str, Any]] = []
    for client in result.scalars().all():
        last_contact = client.last_contact_at
        if last_contact and last_contact > cutoff:
            continue
        showings_result = await db.execute(
            select(db_models.Showing)
            .where(db_models.Showing.client_id == client.id)
            .order_by(db_models.Showing.start_time.desc())
            .limit(1)
        )
        latest_showing = showings_result.scalar_one_or_none()
        if not latest_showing:
            continue
        convo_result = await db.execute(
            select(db_models.Conversation)
            .where(
                text(
                    "(meta_data->>'client_id')::int = :cid OR (meta_data->>'patient_id')::int = :cid"
                ).bindparams(cid=client.id)
            )
            .order_by(db_models.Conversation.created_at.desc())
            .limit(1)
        )
        latest_convo = convo_result.scalar_one_or_none()
        if latest_convo and latest_convo.created_at and latest_convo.created_at > cutoff:
            continue
        ref = latest_showing.start_time or client.updated_at or client.created_at
        days_cold = (datetime.datetime.utcnow() - ref).days if ref else days
        out.append(
            {
                "id": client.id,
                "fullName": client.full_name,
                "email": client.email,
                "daysCold": days_cold,
                "lastShowingAt": latest_showing.start_time.isoformat() if latest_showing.start_time else None,
                "lastShowingStatus": latest_showing.status,
            }
        )
        if len(out) >= limit:
            break
    return sorted(out, key=lambda x: x["daysCold"], reverse=True)


async def list_overnight_activity(
    db: AsyncSession,
    *,
    tenant_id: int | None,
    since: datetime.datetime | None = None,
    limit: int = 30,
) -> list[dict[str, Any]]:
    """Client-side activity since cutoff (default: last 12 hours)."""
    if since is None:
        since = datetime.datetime.utcnow() - datetime.timedelta(hours=12)
    items: list[dict[str, Any]] = []

    convo_query = select(db_models.Conversation).where(db_models.Conversation.created_at >= since)
    convo_result = await db.execute(convo_query.order_by(db_models.Conversation.created_at.desc()).limit(limit))
    for convo in convo_result.scalars().all():
        meta = convo.meta_data or {}
        cid = meta.get("client_id") or meta.get("patient_id")
        tid = _parse_tenant_id(meta.get("tenant_id"))
        if tenant_id and tid and tid != tenant_id:
            continue
        if tenant_id and cid:
            client = await db.get(db_models.Client, int(cid))
            if client and client.tenant_id and client.tenant_id != tenant_id:
                continue
        steps = await db.execute(
            select(db_models.PipelineStep)
            .where(db_models.PipelineStep.conversation_id == convo.id)
            .order_by(db_models.PipelineStep.start_time.asc())
        )
        steps_list = steps.scalars().all()
        prompt_step = next((s for s in steps_list if s.step_name == "classify_intent"), None)
        prompt = (prompt_step.input or {}).get("prompt", "") if prompt_step else ""
        items.append(
            {
                "type": "conversation",
                "id": convo.id,
                "clientId": int(cid) if cid else None,
                "summary": (prompt or "Client message")[:120],
                "at": convo.created_at.isoformat() if convo.created_at else None,
            }
        )

    lead_query = select(db_models.Lead).where(db_models.Lead.created_at >= since)
    if tenant_id:
        lead_query = lead_query.where(db_models.Lead.tenant_id == tenant_id)
    lead_result = await db.execute(lead_query.order_by(db_models.Lead.created_at.desc()).limit(20))
    for lead in lead_result.scalars().all():
        items.append(
            {
                "type": "lead",
                "id": lead.id,
                "clientId": lead.client_id,
                "summary": f"New lead: {lead.full_name} ({lead.source})",
                "at": lead.created_at.isoformat() if lead.created_at else None,
            }
        )

    sr_query = select(db_models.ServiceRequest).where(db_models.ServiceRequest.created_at >= since)
    sr_result = await db.execute(sr_query.order_by(db_models.ServiceRequest.id.desc()).limit(20))
    for sr in sr_result.scalars().all():
        client = await db.get(db_models.Client, sr.client_id)
        if tenant_id and client and client.tenant_id != tenant_id:
            continue
        items.append(
            {
                "type": "service_request",
                "id": sr.id,
                "clientId": sr.client_id,
                "summary": f"Service request: {sr.title}",
                "at": (sr.requested_at or sr.created_at).isoformat()
                if (sr.requested_at or sr.created_at)
                else None,
            }
        )

    esc_query = select(db_models.SafetyEscalation).where(db_models.SafetyEscalation.created_at >= since)
    if tenant_id:
        esc_query = esc_query.where(
            or_(
                db_models.SafetyEscalation.tenant_id == tenant_id,
                db_models.SafetyEscalation.tenant_id.is_(None),
            )
        )
    esc_result = await db.execute(esc_query.order_by(db_models.SafetyEscalation.created_at.desc()).limit(20))
    for esc in esc_result.scalars().all():
        items.append(
            {
                "type": "escalation",
                "id": esc.id,
                "clientId": esc.client_id,
                "summary": f"Flagged ({esc.escalation_type or 'review'}): {(esc.source_text or '')[:80]}",
                "at": esc.created_at.isoformat() if esc.created_at else None,
            }
        )

    items.sort(key=lambda x: x.get("at") or "", reverse=True)
    return items[:limit]


def draft_prompt(
    draft_type: str,
    context: dict[str, Any],
    *,
    channel: str = "sms",
    extra: str = "",
    showing: dict[str, Any] | None = None,
) -> str:
    """Build the user prompt for agent draft generation."""
    client_name = context.get("client_name", "the client")
    lines = [
        f"Draft a {channel.upper()} message for real estate agent staff.",
        f"Draft type: {draft_type}.",
        f"Client: {client_name} ({context.get('client_type', 'buyer')}).",
    ]
    prefs = context.get("preferences") or {}
    if prefs:
        lines.append(f"Preferences: {prefs}")
    if context.get("notes"):
        lines.append(f"Agent notes on file: {context['notes']}")
    if showing:
        lines.append(f"Showing: {showing}")
    elif context.get("recent_showings"):
        lines.append(f"Recent showings: {context['recent_showings'][:2]}")
    if extra:
        lines.append(f"Additional context: {extra}")
    lines.append(
        "Write only the message body — no subject line unless email. "
        "Keep SMS under 320 characters. Professional, warm, fair-housing compliant. "
        "Do not invent listing details not provided."
    )
    return "\n".join(lines)
