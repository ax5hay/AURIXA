from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from loguru import logger

from .models import ExecutionRequest, ExecutionResponse

# Extensible action registry - add production actions here or via plugin
def _send_email(params: dict) -> str:
    recipient = params.get("recipient", "unknown")
    subject = params.get("subject", "")
    return f"Email queued to {recipient} with subject '{subject}'."

def _schedule_reminder(params: dict) -> str:
    patient_id = params.get("patient_id", "unknown")
    return f"Reminder scheduled for patient {patient_id}."

def _log_audit(params: dict) -> str:
    return "Audit entry recorded."

ACTION_REGISTRY: dict[str, callable] = {
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
    return {"actions": list(ACTION_REGISTRY.keys())}


@app.post("/api/v1/execute", response_model=ExecutionResponse, summary="Execute an action")
async def execute(request: ExecutionRequest):
    """Executes a registered action with validated parameters."""
    logger.info("Execute action: '{}' (idempotency: {})", request.action_name, request.idempotency_key[:8])

    action_func = ACTION_REGISTRY.get(request.action_name)
    if not action_func:
        raise HTTPException(status_code=404, detail=f"Action '{request.action_name}' not found.")

    try:
        result = action_func(request.params or {})
        return ExecutionResponse(status="success", result={"message": result})
    except Exception as e:
        logger.error("Action '{}' failed: {}", request.action_name, e)
        return ExecutionResponse(status="error", error_message=str(e))
