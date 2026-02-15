"""AURIXA Streaming Voice Service - WebSocket in/out pipeline for voice conversations."""

import base64
import json
import os
import time
import uuid
from contextlib import asynccontextmanager

import httpx
from pydantic import BaseModel
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from loguru import logger

from .config import ServiceConfig
from . import stt
from . import tts

SERVICE_NAME = "streaming-voice"
config = ServiceConfig()
ORCHESTRATION_URL = os.getenv("ORCHESTRATION_URL") or os.getenv("ORCHESTRATION_HOST", "http://localhost:8001")
if not ORCHESTRATION_URL.startswith("http"):
    ORCHESTRATION_URL = f"http://{ORCHESTRATION_URL}:8001"


@asynccontextmanager
async def lifespan(app: FastAPI):
    start = time.monotonic()
    logger.info("{} starting on port {}", SERVICE_NAME, config.port)
    app.state.http_client = httpx.AsyncClient(
        timeout=120.0,
        limits=httpx.Limits(max_keepalive_connections=4),
    )
    yield
    await app.state.http_client.aclose()
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
    app: FastAPI | None = None,
) -> str:
    """Call orchestration pipeline (RAG + LLM + safety). Uses shared http_client when app is provided.
    Used by REST /api/v1/voice/process — returns full response in one go."""
    sid = session_id or str(uuid.uuid4())
    payload: dict = {"prompt": prompt, "session_id": sid}
    if patient_id is not None:
        payload["patient_id"] = patient_id
    try:
        client = getattr(app.state, "http_client", None) if app else None
        if client is not None:
            r = await client.post(
                f"{ORCHESTRATION_URL}/api/v1/pipelines",
                json=payload,
            )
        else:
            async with httpx.AsyncClient(timeout=120.0) as c:
                r = await c.post(
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


async def _run_pipeline_stream_ws(
    websocket: WebSocket,
    prompt: str,
    session_id: str | None,
    patient_id: int | None,
    app: FastAPI,
) -> str | None:
    """Call orchestration pipelines/stream and forward status + text_delta to WebSocket. Returns final_response or None on error."""
    sid = session_id or str(uuid.uuid4())
    payload: dict = {"prompt": prompt, "session_id": sid}
    if patient_id is not None:
        payload["patient_id"] = patient_id
    client = getattr(app.state, "http_client", None)
    if not client:
        return await _run_pipeline(prompt, session_id, patient_id, app)
    try:
        final_response: str | None = None
        async with client.stream(
            "POST",
            f"{ORCHESTRATION_URL}/api/v1/pipelines/stream",
            json=payload,
            timeout=120.0,
        ) as response:
            if response.status_code != 200:
                await websocket.send_json({"type": "error", "message": f"Pipeline returned {response.status_code}"})
                return None
            buffer = ""
            async for chunk in response.aiter_text():
                buffer += chunk
                while "\n" in buffer:
                    line, buffer = buffer.split("\n", 1)
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        obj = json.loads(line)
                        event = obj.get("event")
                        if event == "status":
                            await websocket.send_json({"type": "status", "status": "processing", "message": obj.get("message", "")})
                        elif event == "text_delta":
                            await websocket.send_json({"type": "text_delta", "content": obj.get("delta", "")})
                        elif event == "done":
                            final_response = obj.get("final_response", "")
                        elif event == "error":
                            await websocket.send_json({"type": "error", "message": obj.get("message", "Stream error")})
                            return None
                    except json.JSONDecodeError:
                        continue
        return final_response or "No response generated."
    except httpx.ConnectError:
        logger.warning("Orchestration unavailable")
        await websocket.send_json({"type": "error", "message": "The backend is temporarily unavailable."})
        return None
    except Exception as e:
        logger.error("Pipeline stream failed: {}", e)
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
        return None


async def _process_text_input(
    websocket: WebSocket,
    content: str,
    session_id: str | None,
    patient_id: int | None = None,
    want_tts: bool = True,
):
    """Process text input: stream pipeline (status + text_delta) over WebSocket, then send final text + optional TTS.
    REST /api/v1/voice/process is unchanged and uses full pipeline response."""
    response_text = await _run_pipeline_stream_ws(
        websocket, content, session_id, patient_id, websocket.app
    )
    if response_text is None:
        return

    # TTS: synthesize speech only when user wants it and TTS is configured
    if want_tts and tts.is_tts_available():
        audio_bytes, _ = await tts.synthesize(response_text)
        if audio_bytes:
            await websocket.send_json({
                "type": "audio",
                "data": tts.to_base64(audio_bytes),
                "mime": "audio/mpeg",
                "done": True,
                "session_id": session_id,
            })

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
    want_tts: bool = True,
):
    """Process audio input. Uses OSS (faster-whisper etc) and proprietary STT fallbacks."""
    # Fallback: if data is base64-encoded text (for testing), decode and process
    try:
        decoded = base64.b64decode(data_b64).decode("utf-8", errors="replace")
        if decoded.isprintable() and len(decoded) < 2000:
            await _process_text_input(websocket, decoded, session_id, patient_id, want_tts)
            return
    except Exception:
        pass

    # Raw audio: try Deepgram STT
    try:
        audio_bytes = base64.b64decode(data_b64)
    except Exception:
        await websocket.send_json({"type": "error", "message": "Invalid base64 audio data"})
        return

    transcript = await stt.transcribe(audio_bytes)
    if transcript:
        await _process_text_input(websocket, transcript, session_id, patient_id, want_tts)
        return

    logger.warning("STT returned no transcript for {} bytes", len(audio_bytes))
    await websocket.send_json({
        "type": "text",
        "content": "I couldn't transcribe that. Try speaking a bit longer, or type your message below.",
        "done": True,
    })


@app.get("/capabilities")
@app.get("/api/v1/voice/capabilities")
async def capabilities():
    """Return available STT/TTS capabilities for clients."""
    return {
        "stt": stt.is_stt_available(),
        "stt_providers": stt.configured_providers(),
        "tts": tts.is_tts_available(),
        "tts_providers": tts.configured_providers(),
    }


class VoiceProcessRequest(BaseModel):
    """REST request for voice processing (STT + pipeline + optional TTS)."""
    audio_b64: str
    patient_id: int | None = None
    want_tts: bool = True


class TTSRequest(BaseModel):
    text: str


@app.post("/api/v1/voice/process")
@app.post("/api/v1/process")  # alias for gateway proxy (strips /voice prefix)
async def voice_process(req: VoiceProcessRequest):
    """
    REST endpoint for voice: upload audio, get transcript + response + optional TTS.
    Use when WebSocket is unreliable; always returns JSON.
    """
    try:
        audio_bytes = base64.b64decode(req.audio_b64)
    except Exception:
        return {"error": "Invalid base64 audio", "transcript": None, "response": None, "audio_b64": None}

    transcript = await stt.transcribe(audio_bytes)
    if not transcript or not transcript.strip():
        return {
            "error": None,
            "transcript": None,
            "response": "I couldn't transcribe that. Try speaking a bit longer, or type your message below.",
            "audio_b64": None,
        }

    response_text = await _run_pipeline(transcript, None, req.patient_id, app=req.app)
    audio_b64: str | None = None
    if req.want_tts and tts.is_tts_available():
        audio_bytes_out, _ = await tts.synthesize(response_text)
        if audio_bytes_out:
            audio_b64 = tts.to_base64(audio_bytes_out)

    return {
        "error": None,
        "transcript": transcript,
        "response": response_text,
        "audio_b64": audio_b64,
    }


@app.post("/api/v1/tts")
@app.post("/api/v1/voice/tts")
async def tts_synthesize(req: TTSRequest):
    """REST endpoint for TTS - returns base64 audio. For API/plugin use."""
    text = (req.text or "").strip()
    if not text:
        return {"error": "text required", "audio_b64": None}
    audio_bytes, mime = await tts.synthesize(text)
    if not audio_bytes:
        return {"error": "TTS not configured or failed", "audio_b64": None}
    return {"audio_b64": tts.to_base64(audio_bytes), "mime": mime}


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
            want_tts = msg.get("want_tts", True)  # default on for backward compat

            if msg_type == "text":
                content = msg.get("content", "").strip()
                if not content:
                    await websocket.send_json({"type": "error", "message": "Empty text input"})
                    continue
                await _process_text_input(websocket, content, session_id, patient_id, want_tts)
            elif msg_type == "audio":
                data_b64 = msg.get("data", "")
                if not data_b64:
                    await websocket.send_json({"type": "error", "message": "No audio data"})
                    continue
                await _process_audio_input(websocket, data_b64, session_id, patient_id, want_tts)
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
