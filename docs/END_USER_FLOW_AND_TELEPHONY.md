# End-User Flow and Telephony I/O

This document defines how end users interact with AURIXA across different channels, the flows without and with telephony, and the input/output specifications for each layer.

---

## Executive Summary

**Current State**: The platform has a **WebSocket voice channel** and **webchat** (patient portal AI assistant). The **telephony layer (PSTN/VoIP)** is not yet implemented. End users can interact via:

1. **Webchat** — Text-based conversation in the patient portal
2. **WebSocket voice** — Browser-to-browser voice (mic → STT → AI → TTS → speakers) with no phone integration

**Planned**: Telephony via SIP/WebRTC gateways (e.g., Twilio, Vapi, Bland) will sit in front of the same streaming pipeline, providing PSTN/VoIP call handling.

---

## Channel Layer Overview

| Channel        | Status       | Endpoint/Protocol            | Primary Use                    |
|----------------|-------------|-----------------------------|--------------------------------|
| Voice (Web)    | Implemented  | WebSocket `/voice` → `/ws/stream` | In-browser voice conversations |
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

### 2. WebSocket Voice Flow (No Telephony)

**User**: Patient or staff using the voice-enabled interface (e.g., hospital portal AI assistant, or a dedicated voice widget).

**Flow**:
```
User clicks "Start voice" in browser
    → WebSocket connect to wss://host/voice (proxied to streaming-voice /ws/stream)
    → Browser captures mic → sends audio chunks as base64 in JSON

Inbound (User → Platform):
    {"type": "audio", "data": "<base64>"}  or  {"type": "text", "content": "..."}
    → Streaming-voice: STT (Deepgram/Whisper) → transcript
    → Orchestration pipeline → text response
    → TTS (OpenAI/ElevenLabs) → audio bytes

Outbound (Platform → User):
    {"type": "status", "status": "processing", "message": "Thinking..."}
    {"type": "audio", "data": "<base64>", "done": false}  (streaming TTS chunks)
    {"type": "audio", "data": "<base64>", "done": true}
    {"type": "text", "content": "...", "done": true}  (fallback when no TTS)
```

**I/O**:
- **Input**: WebSocket messages — `text` (content) or `audio` (base64)
- **Output**: WebSocket messages — `text`, `audio`, `status`, `error`

---

### 3. Telephony Flow (Planned — When Implemented)

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

| Provider   | Input        | Output              |
|-----------|--------------|---------------------|
| OpenAI    | Text string  | MP3/opus bytes      |
| ElevenLabs| Text string  | MP3 bytes           |
| (Local)   | Text string  | WAV bytes (planned) |

**Current**: `OPENAI_API_KEY` or `ELEVENLABS_API_KEY` enables TTS. Response includes `{"type": "audio", "data": "<base64>"}`.

---

## How an End User Uses the Platform Today

1. **As a patient (web)**:
   - Go to Patient Portal → Chat tab
   - Type messages; receive text responses (no voice)

2. **As a patient (voice — if voice UI is exposed)**:
   - Connect to WebSocket `/voice`
   - Speak into mic; receive text + optional audio responses

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
