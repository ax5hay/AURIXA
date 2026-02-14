"""HTTP clients for calling downstream AURIXA services."""

import asyncio
import httpx
from loguru import logger

from .config import (
    LLM_ROUTER_URL,
    RAG_SERVICE_URL,
    SAFETY_GUARDRAILS_URL,
    AGENT_RUNTIME_URL,
    OBSERVABILITY_URL,
)

_async_client = httpx.AsyncClient(timeout=60.0)  # RAG model load can take ~30s on first call


async def _request_with_retry(method: str, url: str, **kwargs) -> httpx.Response:
    """Retry on transient failures (up to 2 retries)."""
    last_err = None
    for attempt in range(3):
        try:
            return await _async_client.request(method, url, **kwargs)
        except Exception as e:
            last_err = e
            if attempt < 2:
                await asyncio.sleep(0.3 * (attempt + 1))
            else:
                raise last_err
    raise last_err


async def call_llm_router(prompt: str) -> dict:
    """Call the LLM Router to classify intent and select a model."""
    if not LLM_ROUTER_URL:
        logger.warning("LLM_ROUTER_URL not set, skipping call.")
        return {"mock": "llm_router_response"}

    try:
        response = await _request_with_retry("POST", f"{LLM_ROUTER_URL}/api/v1/route", json={"prompt": prompt})
        response.raise_for_status()
        return response.json()
    except httpx.HTTPError as e:
        logger.error("HTTP error calling LLM Router: {}", e)
        raise


async def call_rag_service(prompt: str, intent: dict) -> dict:
    """Call the RAG service to retrieve relevant context."""
    if not RAG_SERVICE_URL:
        logger.warning("RAG_SERVICE_URL not set, skipping call.")
        return {"mock": "rag_service_response"}

    try:
        response = await _request_with_retry(
            "POST", f"{RAG_SERVICE_URL}/api/v1/retrieve", json={"prompt": prompt, "intent": intent},
            timeout=60.0,
        )
        response.raise_for_status()
        return response.json()
    except httpx.HTTPError as e:
        logger.error("HTTP error calling RAG Service: {}", e)
        raise


async def call_agent_runtime(prompt: str, patient_id: int | None = None) -> dict:
    """Call the Agent Runtime for tool-using tasks (appointments, scheduling, knowledge search)."""
    if not AGENT_RUNTIME_URL:
        logger.warning("AGENT_RUNTIME_URL not set, skipping call.")
        return {"mock": "agent_runtime_response", "output": None}

    try:
        task_dict: dict = {"prompt": prompt}
        if patient_id is not None:
            task_dict["metadata"] = {"patient_id": patient_id}
        response = await _request_with_retry(
            "POST", f"{AGENT_RUNTIME_URL}/api/v1/run", json={"task": task_dict}, timeout=30.0
        )
        response.raise_for_status()
        data = response.json()
        result = data.get("result", {})
        return {
            "output": result.get("output"),
            "tool_calls": result.get("tool_calls", []),
            "steps": result.get("steps", []),
        }
    except httpx.HTTPError as e:
        logger.error("HTTP error calling Agent Runtime: {}", e)
        raise


async def emit_telemetry(service_name: str, event_type: str, data: dict) -> None:
    """Fire-and-forget telemetry emission to Observability Core."""
    if not OBSERVABILITY_URL:
        return
    try:
        await _async_client.post(
            f"{OBSERVABILITY_URL}/api/v1/telemetry",
            json={
                "service_name": service_name,
                "event_type": event_type,
                "data": data,
            },
            timeout=2.0,
        )
    except Exception as e:
        logger.debug("Telemetry emit failed (non-fatal): {}", e)


async def call_safety_guardrails(text: str) -> dict:
    """Call the Safety Guardrails service to validate text."""
    if not SAFETY_GUARDRAILS_URL:
        logger.warning("SAFETY_GUARDRAILS_URL not set, skipping call.")
        return {"mock": "safety_guardrails_response", "is_safe": True, "validated_text": text}

    try:
        response = await _request_with_retry(
            "POST", f"{SAFETY_GUARDRAILS_URL}/api/v1/validate", json={"text": text}
        )
        response.raise_for_status()
        return response.json()
    except httpx.HTTPError as e:
        logger.error("HTTP error calling Safety Guardrails: {}", e)
        raise


def _format_rag_context(context: dict) -> str:
    """Format RAG snippets into readable context for the LLM."""
    snippets = context.get("snippets", [])
    if not snippets:
        return "No relevant documents found."
    parts = []
    for i, s in enumerate(snippets[:5], 1):
        source = s.get("source", "unknown")
        content = s.get("content", "")
        score = s.get("score", 0)
        parts.append(f"[{i}] Source: {source}\n{content}")
    return "\n\n".join(parts)


async def call_llm_generate(model: str, provider: str, prompt: str, context: dict) -> dict:
    """Call the LLM Router to generate a response."""
    if not LLM_ROUTER_URL:
        logger.warning("LLM_ROUTER_URL not set, skipping call.")
        return {"mock": "llm_generate_response", "content": "mocked response"}

    try:
        formatted_context = _format_rag_context(context)
        system_content = (
            "You are a helpful healthcare assistant for AURIXA. "
            "Use the provided knowledge base context to answer the user's question accurately. "
            "If the context does not contain relevant information, say so politely."
        )
        user_content = f"Knowledge base context:\n{formatted_context}\n\nUser question: {prompt}"
        messages = [
            {"role": "system", "content": system_content},
            {"role": "user", "content": user_content},
        ]
        # LLM generation can take 60–120s; LM Studio is slow on first token
        response = await _request_with_retry(
            "POST",
            f"{LLM_ROUTER_URL}/api/v1/generate",
            json={
                "messages": messages,
                "model": model or None,
                "provider": provider,
            },
            timeout=120.0,
        )
        response.raise_for_status()
        return response.json()
    except httpx.HTTPError as e:
        logger.error("HTTP error calling LLM Router for generation: {}", e)
        raise
