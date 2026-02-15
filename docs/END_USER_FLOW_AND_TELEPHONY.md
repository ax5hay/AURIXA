# End-User Flow and Telephony I/O

This document defines how end users interact with AURIXA across different channels, the flows without and with telephony, and the input/output specifications for each layer.

---

## Executive Summary

**Current State**: The platform has **webchat**, **REST voice**, and **WebSocket voice** in the patient portal. The **telephony layer (PSTN/VoIP)** is not yet implemented. End users can interact via:

1. **Webchat** — Text-based conversation in the patient portal (REST pipelines).
2. **Voice (REST)** — Patient Portal **Voice** page (`/voice`): mic or text → `POST /api/v1/voice/process` (audio_b64, want_tts) → transcript + response + optional TTS audio. User can toggle "Play aloud" (TTS on/off). Most reliable path.
3. **WebSocket voice** — Optional: connect to `ws://host/ws/voice` (proxied to streaming-voice `/ws/stream`) for real-time duplex; same STT/TTS pipeline, supports `want_tts` in messages.

**Planned**: Telephony via SIP/WebRTC gateways (e.g., Twilio, Vapi, Bland) will sit in front of the same streaming pipeline, providing PSTN/VoIP call handling.

---

## Channel Layer Overview

| Channel        | Status       | Endpoint/Protocol            | Primary Use                    |
|----------------|-------------|-----------------------------|--------------------------------|
| Voice (Web)    | Implemented  | REST `POST /api/v1/voice/process` (primary); WebSocket `/ws/voice` → `/ws/stream` (optional) | Patient portal `/voice`: mic or text, optional TTS |
| Webchat        | Implemented  | REST `/api/v1/orchestration/pipelines` | Patient portal chat            |
| Voice (Phone)  | Not implemented | (Planned: SIP/WebRTC gateway) | Inbound/outbound phone calls   |
| SMS            | Stub         | (Planned)                    | Appointment reminders, alerts  |
| WhatsApp       | Planned      | (Planned)                    | International messaging        |
| Mobile SDK     | Planned      | (Planned)                    | Native mobile app embedding    |
| Smart IVR      | Planned      | (Planned)                    | Keypad/voice fallback for IVR |

---

## End-User Flows

### 1. Webchat Flow (No Telephony)

**User**: Patient visiting the AURIXA Patient Portal.

**Flow**:
```
Patient opens Patient Portal (port 3300)
    → Types message in chat
    → POST /api/v1/orchestration/pipelines { prompt, session_id?, patient_id? }
    → API Gateway → Orchestration Engine
        → Intent routing → RAG / Agent / Safety
        → LLM generates text response
    ← JSON { session_id, final_response }
    → Message displayed in chat UI
```

**I/O**:
- **Input**: `{ prompt: string, session_id?: string, patient_id?: number }`
- **Output**: `{ session_id: string, final_response: string }`

---

### 2. REST Voice Flow (Patient Portal `/voice` — Recommended)

**User**: Patient on the Patient Portal **Voice** page.

**Flow**:
```
User opens Patient Portal → /voice
    → Option A: Records with mic → audio encoded to base64
    → Option B: Types message in text field

REST (Option A — voice):
    POST /api/v1/voice/process
    Body: { "audio_b64": "<base64>", "patient_id": 1, "want_tts": true }
    → API Gateway → Streaming-voice: STT (OSS first) → transcript
    → Orchestration pipeline → text response
    → If want_tts: TTS (Piper/edge-tts primary; OpenAI/ElevenLabs fallback) → audio_b64
    ← { "transcript", "response", "audio_b64" | null }

REST (Option B — text):
    POST /api/v1/orchestration/pipelines { "prompt", "patient_id" }
    ← { "final_response" }
    If "Play aloud" on: POST /api/v1/voice/tts { "text": "<response>" } → play audio_b64
```

**I/O**:
- **Input**: `POST /api/v1/voice/process` — `audio_b64`, `patient_id?`, `want_tts?` (default true)
- **Output**: `{ transcript?, response, audio_b64? }` — always text; audio only when `want_tts` and TTS configured

The **"Play aloud"** toggle on the Voice page controls `want_tts`; when off, only text is returned/displayed.

### 3. WebSocket Voice Flow (Optional)

**User**: Client that prefers real-time duplex (e.g., future telephony gateway or custom app).

**Flow**:
```
WebSocket connect to wss://host/ws/voice (proxied to streaming-voice /ws/stream)

Inbound (User → Platform):
    {"type": "audio", "data": "<base64>", "patient_id": 1, "want_tts": true}
    or {"type": "text", "content": "...", "want_tts": true}
    → Streaming-voice: STT (OSS first) → transcript → Orchestration → TTS if want_tts

Outbound (Platform → User):
    {"type": "status", "status": "processing"}
    {"type": "audio", "data": "<base64>", "done": true}
    {"type": "text", "content": "...", "done": true}
    {"type": "error", "message": "..."}
```

**I/O**:
- **Input**: WebSocket messages — `text` or `audio`, optional `want_tts` (default true)
- **Output**: WebSocket messages — `text`, `audio`, `status`, `error`

---

### 4. Telephony Flow (Planned — When Implemented)

**User**: Caller dialing a hospital/clinic number.

**Flow** (conceptual):
```
PSTN/VoIP call → Telephony gateway (Twilio, Vapi, etc.)
    → Gateway streams audio to AURIXA Voice WebSocket /ws/stream
    → Same pipeline: STT → Orchestration → TTS
    → Gateway streams TTS audio back to caller

Alternative: SIP trunk → Asterisk/FreeSWITCH → WebRTC bridge → AURIXA
```

**I/O** (when telephony gateway is added):
- **Input**: RTP/SRTP audio from gateway, or WebSocket from gateway to our `/ws/stream`
- **Output**: RTP/SRTP or WebSocket audio back to gateway → caller

The streaming-voice service remains **gateway-agnostic**: it receives audio, returns audio. The telephony provider handles SIP/PSTN.

---

## Streaming Layer — Technical I/O

### STT (Speech-to-Text)

**Primary (OSS, free, no API keys):**
| Provider        | License   | Notes                                  |
|-----------------|-----------|----------------------------------------|
| Vosk            | Apache 2  | Kaldi-based, offline. Set `VOSK_MODEL_PATH`. |
| faster-whisper  | MIT       | Local Whisper (CTranslate2). Model downloads on first use. |
| SpeechBrain     | Apache 2  | Optional: `pip install speechbrain`   |

**Fallbacks (proprietary):**
| Provider   | When used              |
|------------|------------------------|
| AssemblyAI | `ASSEMBLYAI_API_KEY`   |
| Deepgram   | `DEEPGRAM_API_KEY`    |
| Whisper API| `OPENAI_API_KEY`      |

**Order**: OSS first → proprietary. `STT_PROVIDER_ORDER=vosk,faster_whisper,speechbrain,assemblyai,deepgram,whisper`. Service works with zero API keys when Vosk or faster-whisper is configured.

### TTS (Text-to-Speech)

**Primary (OSS, free, no API keys):**
| Provider   | Notes |
|------------|--------|
| Piper      | Local neural TTS. Set `PIPER_MODEL_PATH` (e.g. `/models/piper/en_US-lessac-medium.onnx`). Model can be downloaded at build time or mounted. |
| edge-tts   | Free Microsoft TTS (internet required). No key. `EDGE_TTS_VOICE` (default `en-US-JennyNeural`). |

**Fallbacks (proprietary):**
| Provider   | When used |
|------------|-----------|
| OpenAI     | `OPENAI_API_KEY` (not placeholder) |
| ElevenLabs | `ELEVENLABS_API_KEY` |

**Order**: `TTS_PROVIDER_ORDER=piper,edge_tts,openai,elevenlabs`. Service works with zero API keys when Piper or edge-tts is available. User can disable TTS per request via `want_tts: false` (Voice page "Play aloud" off).

---

## How an End User Uses the Platform Today

1. **As a patient (web)**:
   - Go to Patient Portal → Chat tab
   - Type messages; receive text responses (no voice)

2. **As a patient (voice)**:
   - Go to Patient Portal → **Voice** tab (`/voice`)
   - Tap mic to speak or type in the text field; responses shown as text and optionally played aloud (toggle "Play aloud"). Uses REST `/api/v1/voice/process` for reliability.
   - Alternatively, connect to WebSocket `/ws/voice` and send `audio` or `text` messages with optional `want_tts`

3. **As hospital staff**:
   - Use Hospital Portal (port 3400)
   - "Logged in as" dropdown to select staff identity
   - Use AI Assistant (chat), patients, appointments, schedule

4. **As a caller (phone)**:
   - **Not yet supported**. When telephony is added, caller would dial a number, hear TTS, speak, and the same AI logic would run behind the gateway.

---

## Integration Points for Telephony

When adding PSTN/VoIP:

1. **Twilio**: Programmable Voice → Media Streams → WebSocket to `ws://streaming-voice:8006/ws/stream`
2. **Vapi**: Configure webhook to AURIXA pipeline or direct WebSocket
3. **Custom SIP**: Asterisk/FreeSWITCH module that bridges to our WebSocket
4. **Bland AI**: Similar WebSocket or HTTP streaming integration

The streaming-voice service is designed to accept:
- Text (for testing and webchat bridge)
- Base64 audio chunks (for any WebSocket-based client, including gateways)

No changes to the core pipeline logic are required; the channel adapter (gateway) handles protocol translation.

---

## Observability & Telemetry

Platform telemetry is aggregated by **Observability Core** (port 8008):

- **Health:** `GET http://localhost:8008/health` — service status and event count
- **Performance report:** `GET http://localhost:8008/api/v1/reports/performance` — overall and per-service metrics (latency, cost, counts)
- **Submit event:** `POST http://localhost:8008/api/v1/telemetry` — body: `TelemetryEvent` (service_name, event_type, data)

When running via Docker, ensure the observability-core service is up (e.g. `docker compose ps`); it requires `numpy` and is listed in `apps/observability-core/pyproject.toml`.
