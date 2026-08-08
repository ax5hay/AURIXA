"""Live end-to-end orchestration pipeline tests with LM Studio."""

from __future__ import annotations

import json
import uuid

import httpx
import pytest

pytestmark = pytest.mark.live


@pytest.mark.asyncio
async def test_pipeline_returns_llm_response(live_orchestration_stack: dict[str, str]) -> None:
    session_id = f"live-pipeline-{uuid.uuid4().hex[:8]}"
    async with httpx.AsyncClient(timeout=live_orchestration_stack["timeout"]) as client:
        response = await client.post(
            f"{live_orchestration_stack['gateway_url']}/api/v1/orchestration/pipelines",
            json={"prompt": "Briefly explain what AURIXA does in one sentence.", "session_id": session_id},
        )
        response.raise_for_status()
        payload = response.json()

    assert payload["session_id"] == session_id
    assert payload.get("final_response", "").strip()
    step_names = {step["name"] for step in payload.get("steps", [])}
    assert "classify_intent" in step_names
    assert "generate_response" in step_names or "agent_execution" in step_names


@pytest.mark.asyncio
async def test_pipeline_stream_emits_text_deltas(live_orchestration_stack: dict[str, str]) -> None:
    session_id = f"live-stream-{uuid.uuid4().hex[:8]}"
    events: list[dict] = []
    async with httpx.AsyncClient(timeout=live_orchestration_stack["timeout"]) as client:
        async with client.stream(
            "POST",
            f"{live_orchestration_stack['gateway_url']}/api/v1/orchestration/pipelines/stream",
            json={"prompt": "Say hello in one short sentence.", "session_id": session_id},
        ) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if not line.strip():
                    continue
                events.append(json.loads(line))

    event_types = {event.get("event") for event in events}
    assert "text_delta" in event_types or "done" in event_types
    text = "".join(event.get("text", "") for event in events if event.get("event") == "text_delta")
    final = next((event.get("final_response", "") for event in events if event.get("event") == "done"), "")
    assert (text or final).strip()


@pytest.mark.asyncio
async def test_sequential_pipeline_turns_share_session(live_orchestration_stack: dict[str, str]) -> None:
    """Two pipeline calls under one session_id; each turn must complete with an LLM-backed response."""
    session_id = f"live-multiturn-{uuid.uuid4().hex[:8]}"
    async with httpx.AsyncClient(timeout=live_orchestration_stack["timeout"]) as client:
        first = await client.post(
            f"{live_orchestration_stack['gateway_url']}/api/v1/orchestration/pipelines",
            json={
                "prompt": "I need help understanding my insurance copay. Keep the answer to one sentence.",
                "session_id": session_id,
            },
        )
        first.raise_for_status()
        first_body = first.json()

        second = await client.post(
            f"{live_orchestration_stack['gateway_url']}/api/v1/orchestration/pipelines",
            json={
                "prompt": "What documents should I bring to my next appointment? One sentence please.",
                "session_id": session_id,
            },
        )
        second.raise_for_status()
        second_body = second.json()

    assert first_body.get("final_response", "").strip()
    assert second_body.get("final_response", "").strip()
    assert first_body["session_id"] == session_id
    assert second_body["session_id"] == session_id
