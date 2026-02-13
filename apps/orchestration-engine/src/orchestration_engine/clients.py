"""HTTP clients for calling downstream AURIXA services."""

import httpx
from loguru import logger

from .config import (
    LLM_ROUTER_URL,
    RAG_SERVICE_URL,
    SAFETY_GUARDRAILS_URL,
)

# Use a single, shared async client for performance
_async_client = httpx.AsyncClient(timeout=30.0)


async def call_llm_router(prompt: str) -> dict:
    """Call the LLM Router to classify intent and select a model."""
    if not LLM_ROUTER_URL:
        logger.warning("LLM_ROUTER_URL not set, skipping call.")
        return {"mock": "llm_router_response"}

    try:
        response = await _async_client.post(
            f"{LLM_ROUTER_URL}/api/v1/route",
            json={"prompt": prompt},
        )
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
        response = await _async_client.post(
            f"{RAG_SERVICE_URL}/api/v1/retrieve",
            json={"prompt": prompt, "intent": intent},
        )
        response.raise_for_status()
        return response.json()
    except httpx.HTTPError as e:
        logger.error("HTTP error calling RAG Service: {}", e)
        raise


async def call_safety_guardrails(text: str) -> dict:
    """Call the Safety Guardrails service to validate text."""
    if not SAFETY_GUARDRAILS_URL:
        logger.warning("SAFETY_GUARDRAILS_URL not set, skipping call.")
        return {"mock": "safety_guardrails_response", "is_safe": True, "validated_text": text}

    try:
        response = await _async_client.post(
            f"{SAFETY_GUARDRAILS_URL}/api/v1/validate",
            json={"text": text},
        )
        response.raise_for_status()
        return response.json()
    except httpx.HTTPError as e:
        logger.error("HTTP error calling Safety Guardrails: {}", e)
        raise


async def call_llm_generate(model: str, provider: str, prompt: str, context: dict) -> dict:
    """Call the LLM Router to generate a response."""
    if not LLM_ROUTER_URL:
        logger.warning("LLM_ROUTER_URL not set, skipping call.")
        return {"mock": "llm_generate_response", "content": "mocked response"}

    try:
        messages = [
            {"role": "system", "content": "You are a helpful assistant. Use the provided context to answer the user's question."},
            {"role": "user", "content": f"Context: {context}\n\nQuestion: {prompt}"}
        ]
        response = await _async_client.post(
            f"{LLM_ROUTER_URL}/api/v1/generate",
            json={
                "messages": messages,
                "model": model,
                "provider": provider
            },
        )
        response.raise_for_status()
        return response.json()
    except httpx.HTTPError as e:
        logger.error("HTTP error calling LLM Router for generation: {}", e)
        raise
