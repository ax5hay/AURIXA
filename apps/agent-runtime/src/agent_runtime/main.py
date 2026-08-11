import asyncio
import os
import re
from contextlib import asynccontextmanager
import httpx
from fastapi import FastAPI, Request
from loguru import logger

from .models import RunTaskRequest, RunTaskResponse, AgentResult, AgentTask

RAG_SERVICE_URL = os.getenv("RAG_SERVICE_HOST", "http://localhost:8004")
EXECUTION_ENGINE_URL = os.getenv("EXECUTION_ENGINE_HOST", "http://localhost:8007")


async def _search_knowledge_base(q: str, client: httpx.AsyncClient) -> str:
    try:
        r = await client.post(
            f"{RAG_SERVICE_URL}/api/v1/retrieve",
            json={"prompt": q, "top_k": 3},
            timeout=10.0,
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


async def _call_execution(action: str, params: dict, client: httpx.AsyncClient) -> str:
    if not EXECUTION_ENGINE_URL:
        return f"[Execution engine not configured] Action {action} would run with params {params}."
    try:
        r = await client.post(
            f"{EXECUTION_ENGINE_URL}/api/v1/execute",
            json={"action_name": action, "params": params},
            timeout=15.0,
        )
        if r.status_code != 200:
            return f"Execution returned {r.status_code}."
        data = r.json()
        res = data.get("result", {})
        return res.get("message", str(res))
    except Exception as e:
        logger.warning("Execution engine call failed: {}", e)
        return f"Could not execute {action}: {e}"


def _extract_client_id(prompt: str, metadata: dict | None) -> str | int:
    if metadata:
        if "client_id" in metadata:
            return metadata["client_id"]
        if "patient_id" in metadata:
            return metadata["patient_id"]
    m = re.search(r"(?:client|patient)\s+(\d+)", prompt, re.I)
    return m.group(1) if m else "unknown"


def _get_weather(arg: str) -> str:
    return f"Weather in {arg or 'your area'}: sunny, 72°F"


def _schedule_call(arg: str) -> str:
    return "Callback scheduled."


EXECUTION_ACTIONS: dict[str, tuple[str, callable]] = {
    # Real estate
    "get_showing": ("get_showings", lambda p, m: {"client_id": _extract_client_id(p, m)}),
    "get_showings": ("get_showings", lambda p, m: {"client_id": _extract_client_id(p, m)}),
    "create_showing": (
        "create_showing",
        lambda p, m: {"client_id": _extract_client_id(p, m), "notes": "Property showing"},
    ),
    "book a tour": (
        "create_showing",
        lambda p, m: {"client_id": _extract_client_id(p, m), "notes": "Property tour"},
    ),
    "get_listings": ("get_listings", lambda p, m: {"tenant_id": (m or {}).get("tenant_id", 1)}),
    "listing": ("get_listings", lambda p, m: {"tenant_id": (m or {}).get("tenant_id", 1)}),
    "get_client_financing": ("get_client_financing", lambda p, m: {"client_id": _extract_client_id(p, m)}),
    "financing": ("get_client_financing", lambda p, m: {"client_id": _extract_client_id(p, m)}),
    "pre-approval": ("get_client_financing", lambda p, m: {"client_id": _extract_client_id(p, m)}),
    "get_availability": ("get_availability", lambda p, m: {"date": "tomorrow"}),
    "create_service_request": (
        "create_service_request",
        lambda p, m: {"client_id": _extract_client_id(p, m)},
    ),
    "maintenance": (
        "create_service_request",
        lambda p, m: {"client_id": _extract_client_id(p, m), "category": "maintenance"},
    ),
    "create_lead": ("create_lead", lambda p, m: {"full_name": "New lead", "tenant_id": (m or {}).get("tenant_id", 1)}),
    # Legacy healthcare keywords
    "get_appointment": ("get_showings", lambda p, m: {"client_id": _extract_client_id(p, m)}),
    "get_appointments": ("get_showings", lambda p, m: {"client_id": _extract_client_id(p, m)}),
    "create_appointment": (
        "create_showing",
        lambda p, m: {"client_id": _extract_client_id(p, m), "notes": "Property showing"},
    ),
    "check_insurance": ("get_client_financing", lambda p, m: {"client_id": _extract_client_id(p, m)}),
    "request_prescription_refill": (
        "create_service_request",
        lambda p, m: {"client_id": _extract_client_id(p, m)},
    ),
    "prescription_refill": (
        "create_service_request",
        lambda p, m: {"client_id": _extract_client_id(p, m)},
    ),
    "refill": (
        "create_service_request",
        lambda p, m: {"client_id": _extract_client_id(p, m)},
    ),
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Agent Runtime service starting up")
    app.state.http_client = httpx.AsyncClient(
        timeout=15.0,
        limits=httpx.Limits(max_keepalive_connections=8),
    )
    yield
    await app.state.http_client.aclose()
    logger.info("Agent Runtime service shutting down")


app = FastAPI(
    title="AURIXA Agent Runtime",
    version="0.2.0",
    lifespan=lifespan,
    description="Autonomous agent tasks with real estate tool-calling.",
)


@app.get("/health", summary="Health check endpoint")
async def health():
    return {"service": "agent-runtime", "status": "healthy"}


@app.post("/api/v1/run", response_model=RunTaskResponse, summary="Run an agent task")
async def run_task(request: RunTaskRequest, req: Request):
    task = request.task
    prompt = task.prompt.lower()
    meta = task.metadata or {}
    client = req.app.state.http_client
    logger.info("Received request to run task with prompt: '{}'", task.prompt)

    final_output = "I'm not sure how to help with that."
    tool_calls = []

    for kw, (action_name, params_fn) in EXECUTION_ACTIONS.items():
        if kw in prompt:
            params = params_fn(task.prompt, meta)
            result = await _call_execution(action_name, params, client)
            tool_calls.append({"tool_name": action_name, "arguments": str(params), "result": result})
            final_output = result
            break

    if not tool_calls and ("search" in prompt or "knowledge" in prompt or "find" in prompt):
        result = await _search_knowledge_base(task.prompt, client)
        tool_calls.append({"tool_name": "search_knowledge_base", "arguments": task.prompt[:100], "result": result})
        final_output = result

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
        steps=[{"step": "reasoning", "details": "Matched prompt keywords to real estate tools."}],
    )

    return RunTaskResponse(result=agent_result)
