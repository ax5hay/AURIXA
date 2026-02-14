import asyncio
import os
import re
from contextlib import asynccontextmanager
import httpx
from fastapi import FastAPI
from loguru import logger

from .models import RunTaskRequest, RunTaskResponse, AgentResult, AgentTask

RAG_SERVICE_URL = os.getenv("RAG_SERVICE_HOST", "http://localhost:8004")
EXECUTION_ENGINE_URL = os.getenv("EXECUTION_ENGINE_HOST", "http://localhost:8007")


async def _search_knowledge_base(q: str) -> str:
    """Call RAG service for real retrieval."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.post(
                f"{RAG_SERVICE_URL}/api/v1/retrieve",
                json={"prompt": q, "top_k": 3},
            )
            if r.status_code != 200:
                return f"RAG unavailable (status {r.status_code}). Try again later."
            data = r.json()
            snippets = data.get("snippets", [])
            if not snippets:
                return "No relevant documents found in the knowledge base."
            parts = [f"- {s.get('content', '')[:200]}..." for s in snippets[:3]]
            return "Knowledge base results:\n" + "\n".join(parts)
    except Exception as e:
        logger.warning("RAG call failed: {}", e)
        return f"Could not search knowledge base: {e}"


async def _call_execution(action: str, params: dict) -> str:
    """Call execution engine. Returns result message or error."""
    if not EXECUTION_ENGINE_URL:
        return f"[Execution engine not configured] Action {action} would run with params {params}."
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.post(
                f"{EXECUTION_ENGINE_URL}/api/v1/execute",
                json={"action_name": action, "params": params},
            )
            if r.status_code != 200:
                return f"Execution returned {r.status_code}."
            data = r.json()
            res = data.get("result", {})
            return res.get("message", str(res))
    except Exception as e:
        logger.warning("Execution engine call failed: {}", e)
        return f"Could not execute {action}: {e}"


def _extract_patient_id(prompt: str, metadata: dict | None) -> str | int:
    """Extract patient_id from metadata or prompt (e.g. 'patient 123')."""
    if metadata and "patient_id" in metadata:
        return metadata["patient_id"]
    m = re.search(r"patient\s+(\d+)", prompt, re.I)
    return m.group(1) if m else "unknown"


# Sync tools (non-async)
def _get_weather(arg: str) -> str:
    return f"Weather in {arg or 'your area'}: sunny, 72°F"

def _schedule_call(arg: str) -> str:
    return "Callback scheduled."

# Tool registry - maps prompt keyword -> (action_name, params_builder)
EXECUTION_ACTIONS: dict[str, tuple[str, callable]] = {
    "get_appointment": ("get_appointments", lambda p, m: {"patient_id": _extract_patient_id(p, m)}),
    "get_appointments": ("get_appointments", lambda p, m: {"patient_id": _extract_patient_id(p, m)}),
    "create_appointment": ("create_appointment", lambda p, m: {"patient_id": _extract_patient_id(p, m), "reason": "General visit"}),
    "check_insurance": ("check_insurance", lambda p, m: {"patient_id": _extract_patient_id(p, m)}),
    "get_availability": ("get_availability", lambda p, m: {"date": "tomorrow"}),
    "request_prescription_refill": ("request_prescription_refill", lambda p, m: {"patient_id": _extract_patient_id(p, m)}),
    "prescription_refill": ("request_prescription_refill", lambda p, m: {"patient_id": _extract_patient_id(p, m)}),
    "refill": ("request_prescription_refill", lambda p, m: {"patient_id": _extract_patient_id(p, m)}),
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Log service startup and shutdown."""
    logger.info("Agent Runtime service starting up")
    yield
    logger.info("Agent Runtime service shutting down")


app = FastAPI(
    title="AURIXA Agent Runtime",
    version="0.1.0",
    lifespan=lifespan,
    description="Service for executing autonomous agent tasks with tool-calling capabilities.",
)


@app.get("/health", summary="Health check endpoint")
async def health():
    """Return a 200 OK status if the service is healthy."""
    return {"service": "agent-runtime", "status": "healthy"}


@app.post("/api/v1/run", response_model=RunTaskResponse, summary="Run an agent task")
async def run_task(request: RunTaskRequest):
    """
    Executes an agentic task.

    This is a simplified mock implementation. A real implementation would:
    1.  Use an LLM with function-calling capabilities to decide which tool to use.
    2.  Maintain a state machine for multi-step tasks.
    3.  Execute tools and feed the results back into the LLM.
    4.  Handle errors and retries.
    """
    task = request.task
    prompt = task.prompt.lower()
    meta = task.metadata or {}
    logger.info("Received request to run task with prompt: '{}'", task.prompt)

    final_output = "I'm not sure how to help with that."
    tool_calls = []

    # 1. Check execution-engine actions (appointments, insurance, etc.)
    for kw, (action_name, params_fn) in EXECUTION_ACTIONS.items():
        if kw in prompt:
            params = params_fn(task.prompt, meta)
            result = await _call_execution(action_name, params)
            tool_calls.append({"tool_name": action_name, "arguments": str(params), "result": result})
            final_output = result
            break

    # 2. RAG search
    if not tool_calls and ("search" in prompt or "knowledge" in prompt or "find" in prompt):
        result = await _search_knowledge_base(task.prompt)
        tool_calls.append({"tool_name": "search_knowledge_base", "arguments": task.prompt[:100], "result": result})
        final_output = result

    # 3. Other sync tools
    if not tool_calls:
        if "weather" in prompt:
            result = _get_weather(task.prompt.split("weather")[-1].strip())
            tool_calls.append({"tool_name": "get_weather", "arguments": "", "result": result})
            final_output = result
        elif "callback" in prompt or "schedule call" in prompt:
            result = _schedule_call("")
            tool_calls.append({"tool_name": "schedule_call", "arguments": "", "result": result})
            final_output = result

    agent_result = AgentResult(
        output=final_output,
        tool_calls=tool_calls,
        steps=[{"step": "reasoning", "details": "Decided to call a tool based on prompt keywords."}]
    )

    return RunTaskResponse(result=agent_result)
