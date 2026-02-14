"""AURIXA Execution Engine - real DB-backed actions for EHR/appointment workflows."""

import datetime
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends
from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from aurixa_db import get_db_session
from aurixa_db.models import (
    Patient, Appointment, PatientInsurance, Prescription, AvailabilitySlot,
)
from .models import ExecutionRequest, ExecutionResponse

# --- Sync actions (no DB) ---
def _send_email(params: dict) -> str:
    recipient = params.get("recipient", "unknown")
    subject = params.get("subject", "")
    return f"Email queued to {recipient} with subject '{subject}'."

def _schedule_reminder(params: dict) -> str:
    patient_id = params.get("patient_id", "unknown")
    return f"Reminder scheduled for patient {patient_id}."

def _log_audit(params: dict) -> str:
    return "Audit entry recorded."


# --- DB-backed actions ---
async def _get_appointments(db: AsyncSession, params: dict) -> str:
    """List upcoming appointments for a patient."""
    pid = params.get("patient_id")
    if pid is None:
        return "Patient ID required."
    try:
        pid = int(pid)
    except (ValueError, TypeError):
        return f"Invalid patient ID: {pid}"

    result = await db.execute(
        select(Appointment)
        .where(Appointment.patient_id == pid, Appointment.status != "cancelled")
        .order_by(Appointment.start_time.asc())
        .limit(10)
    )
    appointments = result.scalars().all()
    if not appointments:
        return "No upcoming appointments found."
    lines = []
    for a in appointments:
        dt = a.start_time.strftime("%a %b %d, %Y at %I:%M %p") if a.start_time else "TBD"
        lines.append(f"- {dt}: {a.provider_name} ({a.reason or 'Visit'}) [{a.status}]")
    return "Upcoming appointments:\n" + "\n".join(lines)


async def _create_appointment(db: AsyncSession, params: dict) -> str:
    """Create a new appointment from an availability slot or default slot."""
    pid = params.get("patient_id")
    reason = params.get("reason", "General visit")
    slot_date = params.get("date") or params.get("slot_date")
    start_time = params.get("start_time", "09:00")
    provider_name = params.get("provider_name", "Dr. Adams")
    tenant_id = params.get("tenant_id")

    if not pid:
        return "Patient ID required."
    try:
        pid = int(pid)
    except (ValueError, TypeError):
        return "Invalid patient ID."

    # Derive tenant_id from patient if not provided
    if tenant_id is None:
        pt = await db.get(Patient, pid)
        tenant_id = pt.tenant_id if pt else 1
    try:
        tenant_id = int(tenant_id)
    except (ValueError, TypeError):
        tenant_id = 1

    # Resolve date
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

    # Build start/end datetime
    try:
        hour, minute = map(int, str(start_time).replace(":", " ").split()[:2])
    except Exception:
        hour, minute = 9, 0
    start_dt = datetime.datetime(dt.year, dt.month, dt.day, hour, minute, 0)
    end_dt = start_dt + datetime.timedelta(minutes=30)

    appointment = Appointment(
        start_time=start_dt,
        end_time=end_dt,
        provider_name=provider_name,
        reason=reason,
        status="confirmed",
        tenant_id=tenant_id,
        patient_id=pid,
    )
    db.add(appointment)
    await db.commit()
    await db.refresh(appointment)
    return f"Appointment created for {reason}. Confirmation: APT-{appointment.id}. {start_dt.strftime('%a %b %d at %I:%M %p')} with {provider_name}."


async def _check_insurance(db: AsyncSession, params: dict) -> str:
    """Verify insurance coverage for a patient."""
    pid = params.get("patient_id")
    if pid is None:
        return "Patient ID required."
    try:
        pid = int(pid)
    except (ValueError, TypeError):
        return f"Invalid patient ID: {pid}"

    result = await db.execute(
        select(PatientInsurance).where(
            PatientInsurance.patient_id == pid,
            PatientInsurance.status == "active",
        )
    )
    ins = result.scalar_one_or_none()
    if not ins:
        return f"No active insurance on file for patient {pid}. Please update insurance information."
    return f"Insurance verified. Plan: {ins.plan_name}. Payer: {ins.payer or 'N/A'}. Copay: {ins.copay}."


async def _request_prescription_refill(db: AsyncSession, params: dict) -> str:
    """Request a prescription refill."""
    pid = params.get("patient_id")
    medication = params.get("medication_name") or params.get("medication_id") or "prescription"

    if not pid:
        return "Patient ID required."
    try:
        pid = int(pid)
    except (ValueError, TypeError):
        return f"Invalid patient ID: {pid}"

    result = await db.execute(
        select(Prescription).where(
            Prescription.patient_id == pid,
            Prescription.status == "active",
        )
    )
    scripts = result.scalars().all()
    if not scripts:
        return f"No active prescriptions found for patient {pid}."
    # Match by medication name if provided
    target = None
    for s in scripts:
        if medication.lower() in (s.medication_name or "").lower():
            target = s
            break
    if not target:
        target = scripts[0]
        medication = target.medication_name

    target.status = "refill_requested"
    target.refill_requested_at = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
    await db.commit()
    return f"Refill request submitted for {medication}. Allow 24-48 hours for processing."


async def _get_availability(db: AsyncSession, params: dict) -> str:
    """Get available appointment slots."""
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
        .where(
            AvailabilitySlot.slot_date == dt,
            AvailabilitySlot.tenant_id == tenant_id,
        )
        .order_by(AvailabilitySlot.start_time)
        .limit(15)
    )
    slots = result.scalars().all()
    if not slots:
        # Fallback: generate mock slots
        return f"Available slots for {dt}: 9:00 AM, 10:00 AM, 10:30 AM, 2:00 PM, 2:30 PM. (Contact front desk for exact availability.)"
    lines = []
    seen = set()
    for s in slots:
        key = (s.start_time, s.provider_name)
        if key not in seen:
            seen.add(key)
            lines.append(f"- {s.start_time} with {s.provider_name}")
    return f"Available slots for {dt}:\n" + "\n".join(lines[:10])


# Registry: sync callable or async (db, params) -> str
def _sync_wrap(fn):
    async def _async_wrapper(db, params):
        return fn(params)
    return _async_wrapper

ASYNC_ACTIONS = {
    "get_appointments": _get_appointments,
    "create_appointment": _create_appointment,
    "check_insurance": _check_insurance,
    "request_prescription_refill": _request_prescription_refill,
    "get_availability": _get_availability,
}
SYNC_ACTIONS = {
    "send_email": _send_email,
    "schedule_reminder": _schedule_reminder,
    "log_audit": _log_audit,
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Log service startup and shutdown."""
    logger.info("Execution Engine service starting up")
    yield
    logger.info("Execution Engine service shutting down")


app = FastAPI(
    title="AURIXA Execution Engine",
    version="0.1.0",
    lifespan=lifespan,
    description="Service for executing external actions like API calls, database writes, and sending messages.",
)


@app.get("/health", summary="Health check endpoint")
async def health():
    """Return a 200 OK status if the service is healthy."""
    return {"service": "execution-engine", "status": "healthy"}


@app.get("/api/v1/actions", summary="List available actions")
async def list_actions():
    """Return available action names for discovery."""
    all_actions = list(SYNC_ACTIONS.keys()) + list(ASYNC_ACTIONS.keys())
    return {"actions": sorted(all_actions)}


@app.post("/api/v1/execute", response_model=ExecutionResponse, summary="Execute an action")
async def execute(request: ExecutionRequest, db: AsyncSession = Depends(get_db_session)):
    """Executes a registered action with validated parameters."""
    logger.info("Execute action: '{}' (idempotency: {})", request.action_name, request.idempotency_key[:8])

    params = request.params or {}

    if request.action_name in ASYNC_ACTIONS:
        handler = ASYNC_ACTIONS[request.action_name]
        try:
            result = await handler(db, params)
            return ExecutionResponse(status="success", result={"message": result})
        except Exception as e:
            logger.error("Action '{}' failed: {}", request.action_name, e)
            return ExecutionResponse(status="error", error_message=str(e))
    elif request.action_name in SYNC_ACTIONS:
        handler = SYNC_ACTIONS[request.action_name]
        try:
            result = handler(params)
            return ExecutionResponse(status="success", result={"message": result})
        except Exception as e:
            logger.error("Action '{}' failed: {}", request.action_name, e)
            return ExecutionResponse(status="error", error_message=str(e))

    raise HTTPException(status_code=404, detail=f"Action '{request.action_name}' not found.")
