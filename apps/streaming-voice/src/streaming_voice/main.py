"""AURIXA Streaming Voice Service - WebSocket in/out pipeline for voice conversations."""

import base64
import json
import os
import time
import uuid
from contextlib import asynccontextmanager
import httpx
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from loguru import logger

from .config import ServiceConfig

SERVICE_NAME = "streaming-voice"
config = ServiceConfig()
ORCHESTRATION_URL = os.getenv("ORCHESTRATION_URL") or os.getenv("ORCHESTRATION_HOST", "http://localhost:8001")
if not ORCHESTRATION_URL.startswith("http"):
    ORCHESTRATION_URL = f"http://{ORCHESTRATION_URL}:8001"


@asynccontextmanager
async def lifespan(app: FastAPI):
    start = time.monotonic()
    logger.info("{} starting on port {}", SERVICE_NAME, config.port)
    yield
    logger.info("{} shutting down", SERVICE_NAME)


app = FastAPI(
    title=f"AURIXA {SERVICE_NAME}",
    version="0.1.0",
    lifespan=lifespan,
)


@app.get("/health")
async def health():
    return {"service": SERVICE_NAME, "status": "healthy"}


# --- Voice pipeline: receive input → process → send response ---


async def _run_pipeline(
    prompt: str,
    session_id: str | None = None,
    patient_id: int | None = None,
) -> str:
    """Call orchestration pipeline (RAG + LLM + safety) and return final response."""
    sid = session_id or str(uuid.uuid4())
    payload: dict = {"prompt": prompt, "session_id": sid}
    if patient_id is not None:
        payload["patient_id"] = patient_id
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            r = await client.post(
                f"{ORCHESTRATION_URL}/api/v1/pipelines",
                json=payload,
            )
            if r.status_code != 200:
                return f"Pipeline error (status {r.status_code}). Please try again."
            data = r.json()
            return data.get("final_response", "No response generated.")
    except httpx.ConnectError:
        logger.warning("Orchestration unavailable")
        return "The backend is temporarily unavailable. Please try again later."
    except Exception as e:
        logger.error("Pipeline call failed: {}", e)
        return f"Sorry, I could not process that: {e}"


async def _process_text_input(
    websocket: WebSocket,
    content: str,
    session_id: str | None,
    patient_id: int | None = None,
):
    """Process text input through the pipeline and send response back."""
    await websocket.send_json({
        "type": "status",
        "status": "processing",
        "message": "Thinking...",
    })
    response_text = await _run_pipeline(content, session_id, patient_id)
    await websocket.send_json({
        "type": "text",
        "content": response_text,
        "done": True,
        "session_id": session_id,
    })


async def _process_audio_input(
    websocket: WebSocket,
    data_b64: str,
    session_id: str | None,
    patient_id: int | None = None,
):
    """Process audio input. Placeholder: base64-decode if it's text, else return info."""
    # For now: if data looks like base64-encoded text, decode and process as text
    try:
        decoded = base64.b64decode(data_b64).decode("utf-8", errors="replace")
        if decoded.isprintable() and len(decoded) < 2000:
            await _process_text_input(websocket, decoded, session_id, patient_id)
            return
    except Exception:
        pass
    # Raw audio: STT not implemented - send helpful message
    await websocket.send_json({
        "type": "text",
        "content": "Audio input received. Speech-to-text is not yet configured. Send text instead: {\"type\": \"text\", \"content\": \"your message\"}",
        "done": True,
    })


@app.websocket("/ws/stream")
async def ws_stream(websocket: WebSocket):
    """
    WebSocket endpoint for voice streaming.
    Inbound: JSON messages {"type": "text"|"audio", "content"|"data": "...", "session_id": "optional"}
    Outbound: {"type": "text"|"status", "content"|"message": "...", "done": bool}
    """
    await websocket.accept()
    logger.info("Voice WebSocket client connected")
    session_id: str | None = None
    patient_id: int | None = None

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                msg = {"type": "text", "content": raw}

            msg_type = msg.get("type", "text")
            session_id = msg.get("session_id") or session_id
            if msg.get("patient_id") is not None:
                patient_id = int(msg["patient_id"])

            if msg_type == "text":
                content = msg.get("content", "").strip()
                if not content:
                    await websocket.send_json({"type": "error", "message": "Empty text input"})
                    continue
                await _process_text_input(websocket, content, session_id, patient_id)
            elif msg_type == "audio":
                data_b64 = msg.get("data", "")
                if not data_b64:
                    await websocket.send_json({"type": "error", "message": "No audio data"})
                    continue
                await _process_audio_input(websocket, data_b64, session_id, patient_id)
            elif msg_type == "ping":
                await websocket.send_json({"type": "pong"})
            else:
                await websocket.send_json({"type": "error", "message": f"Unknown message type: {msg_type}"})

    except WebSocketDisconnect:
        logger.info("Voice WebSocket client disconnected")
    except Exception as e:
        logger.error("Voice WebSocket error: {}", e)
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
    finally:
        try:
            await websocket.close()
        except Exception:
            pass
