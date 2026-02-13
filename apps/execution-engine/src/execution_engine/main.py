from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from loguru import logger

from .models import ExecutionRequest, ExecutionResponse

# A real implementation would have a registry of executable actions
# that could be dynamically discovered and called.
MOCK_ACTION_REGISTRY = {
    "send_email": lambda params: f"Email sent to {params.get('recipient')} with subject '{params.get('subject')}'."
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


@app.post("/api/v1/execute", response_model=ExecutionResponse, summary="Execute an action")
async def execute(request: ExecutionRequest):
    """
    Executes a predefined action with a given set of parameters.

    This is a simplified mock implementation. A real implementation would:
    1.  Validate the action name against a registry of available actions.
    2.  Validate the parameters for that action.
    3.  Handle authentication and authorization for the action.
    4.  Implement retry logic and idempotency.
    5.  Asynchronously execute the action, possibly using a job queue.
    """
    logger.info("Received execution request for action: '{}'", request.action_name)

    action_func = MOCK_ACTION_REGISTRY.get(request.action_name)

    if not action_func:
        logger.error("Action '{}' not found in registry.", request.action_name)
        raise HTTPException(status_code=404, detail=f"Action '{request.action_name}' not found.")

    try:
        result = action_func(request.params)
        logger.success("Action '{}' executed successfully.", request.action_name)
        return ExecutionResponse(
            status="success",
            result={"message": result}
        )
    except Exception as e:
        logger.error("Action '{}' failed: {}", request.action_name, e)
        return ExecutionResponse(
            status="error",
            error_message=str(e)
        )
