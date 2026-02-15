# How the Streaming Service Works & Full End-User Flows

This document explains (1) how the **streaming-voice** service works, (2) how **streaming** fits into the channel layer, and (3) the **full layman flow** of the software for each type of user: AURIXA admin, patient, and hospital tenants/staff.

---

## Part 1: How the Streaming (Voice) Service Works

The **streaming-voice** service (port 8006) is the piece that handles **voice in and voice out**: it turns speech into text, runs that text through the same AI pipeline as chat, and optionally turns the AI’s reply back into speech.

### What “streaming” means here

- **Voice path**:
  - **REST** (`POST /api/v1/voice/process`): One request (e.g. one recording) → one response (transcript + reply text + optional audio). The pipeline runs to completion and returns a single `final_response`; **no token-level streaming**. Kept as-is for reliability and simple clients.
  - **WebSocket** (`/ws/voice` → `/ws/stream`): A long-lived connection where the client sends messages (audio or text) and gets back **progressive updates**: status messages (“Classifying intent…”, “Searching knowledge base…”, “Generating response…”), **LLM token stream** (`text_delta`), then final `text` and optional `audio`. So over WebSocket the LLM reply is streamed token-by-token for a snappier feel; REST stays single response in parallel.

### Where the service sits

- **API Gateway** (port 3000) is the single entry for the outside world.
- For **voice**:
  - **REST**: Browser calls `POST /api/v1/voice/process` (or `/api/v1/voice/tts` for text-to-speech only). Gateway forwards to **streaming-voice**.
  - **WebSocket**: Browser connects to `ws://host/ws/voice`. Gateway **proxies** that connection to streaming-voice’s `ws://.../ws/stream`, buffering client messages until the upstream connection is open so no messages are lost on slow connect.

So the streaming service works in two ways:

1. **REST** — Used by the Patient Portal Voice page (recommended, more reliable).
2. **WebSocket** — Optional; used for real-time duplex (e.g. future telephony gateway or custom apps).

### Step-by-step: what happens inside streaming-voice

**REST path (`POST /api/v1/voice/process`):**

1. Request body: `audio_b64` (recorded audio as base64), optional `patient_id`, optional `want_tts` (default true).
2. **Decode** the base64 to raw audio bytes.
3. **STT (speech-to-text)**: Run the audio through the STT stack (faster-whisper / Vosk first, then proprietary fallbacks). Result = **transcript** (string).
4. **Pipeline**: Call the **orchestration engine** with that transcript (same as a chat message):  
   `POST http://orchestration-engine:8001/api/v1/pipelines` with `{ prompt: transcript, patient_id }`.  
   Orchestration does intent → RAG or agent → LLM → safety → one **final_response** string.
5. **TTS (optional)**: If `want_tts` is true and TTS is configured, run the **final_response** through TTS (Piper / edge-tts first, then OpenAI/ElevenLabs). Result = audio bytes (e.g. MP3), then base64.
6. **Response**: Return JSON: `{ transcript, response, audio_b64 }` (audio_b64 only if TTS was requested and succeeded).

**WebSocket path (`/ws/stream`):**

1. Client opens a WebSocket to the gateway at `/ws/voice`; gateway proxies to streaming-voice’s `/ws/stream` (with message buffering until upstream is open).
2. Client sends **JSON messages**, for example:
   - `{ "type": "audio", "data": "<base64>", "patient_id": 1, "want_tts": true }`
   - `{ "type": "text", "content": "Hello", "want_tts": true }`
3. For each message, streaming-voice calls the **orchestration streaming pipeline** (`POST .../api/v1/pipelines/stream`), which returns NDJSON: `status`, `text_delta`, then `done`.
4. Streaming-voice forwards to the client over WebSocket:
   - `{ "type": "status", "status": "processing", "message": "Classifying intent..." }` (and similar status lines)
   - `{ "type": "text_delta", "content": "<token or chunk>" }` for each LLM token/chunk
   - `{ "type": "text", "content": "<full reply>", "done": true, "session_id": "..." }`
   - If TTS requested: `{ "type": "audio", "data": "<base64>", "mime": "audio/mpeg", "done": true }`

So over **WebSocket**, the LLM response is streamed token-by-token (`text_delta`) for a snappy experience; **REST** remains one full response per request in parallel.

---

## Part 2: How Streaming Works in the Channel Layer

The **channel layer** is “how the user talks to the platform”: web, phone, etc.

| Channel        | Protocol / API                    | “Streaming” in practice |
|----------------|-----------------------------------|---------------------------|
| **Webchat**    | REST: `POST /api/v1/orchestration/pipelines` | One request → one full text response. No token streaming; no voice. |
| **Voice (web)**| REST: `POST /api/v1/voice/process`           | One request (audio or effectively one “turn”) → one response (transcript + text + optional audio). |
| **Voice (web)**| WebSocket: `ws://host/ws/voice` → `/ws/stream` | Duplex: status + **LLM token stream** (`text_delta`) + final text + optional audio. Razor-sharp streaming. |
| **Voice (phone)** | Planned (SIP/WebRTC gateway)              | Same as above: gateway would send audio to our WebSocket (or REST); we’d respond with audio. |

So:

- **Webchat**: no streaming; classic request/response.
- **Voice REST**: one “turn” per request; the **content** (audio in, audio out) is what makes it “voice”; no token-level streaming.
- **Voice WebSocket**: the **channel** is streaming and the **LLM reply** is streamed token-by-token (`text_delta`); the client sees status updates and incremental text, then final text and optional TTS audio.

**Orchestration** exposes:
- `POST /api/v1/pipelines` — full pipeline, one JSON response (used by REST voice and webchat).
- `POST /api/v1/pipelines/stream` — same pipeline but returns NDJSON stream (`status`, `text_delta`, `done`) for voice WebSocket and any client that wants token-level streaming.

---

## Part 3: Full Layman Flow by End User

Below is the full flow of the software as each type of user experiences it.

---

### AURIXA Admin (Platform Operator)

**Who:** Someone who operates the AURIXA team platform.

**Where they go:** **Dashboard** — http://localhost:3100 (or your deployed URL).

**What they do:**

1. **Log in / use Dashboard**  
   - Single front-end that talks to the API Gateway (port 3000). All backend services (orchestration, LLM, RAG, safety, voice, execution, observability) sit behind the gateway.

2. **Tenants**  
   - See list of tenants (e.g. hospitals/clinics).  
   - Add new tenants (organizations).  
   - Data is stored in the database; the gateway proxies admin API calls to the right services.

3. **Services & health**  
   - See status of backend services (orchestration, LLM router, RAG, safety, streaming-voice, execution, observability).  
   - Health checks hit each service’s `/health` via the gateway.

4. **Playground**  
   - Run tests: “Run All Tests” hits multiple APIs (route, RAG, safety, agent, execution, knowledge, LLM, audit, health).  
   - Full pipeline test: send a prompt and get a final response (same pipeline as chat/voice).  
   - Execution actions: e.g. get appointments, check insurance, create appointment, request prescription refill (these go through the execution engine and DB).

5. **Analytics / Observability**  
   - Telemetry and performance data come from **Observability Core** (port 8008).  
   - Dashboard can show metrics, latency, cost; data is aggregated from events sent by orchestration, LLM router, etc.

6. **Knowledge, configuration, audit, settings**  
   - Manage knowledge base (for RAG), system configuration, audit logs, and app settings.  
   - All via the same gateway; gateway routes to the right microservice.

**End-to-end (layman):**  
Admin opens Dashboard → uses menus (Tenants, Services, Playground, Analytics, Knowledge, etc.) → every action is an HTTP request to the gateway → gateway forwards to the right service(s) → response comes back and the UI updates. No voice; no streaming in the sense of WebSocket voice. “Streaming” for admin is irrelevant unless they use a future token-streaming UI.

---

### Patient

**Who:** A patient (person receiving care) using the patient-facing app.

**Where they go:** **Patient Portal** — http://localhost:3300 (or your deployed URL).

**What they do:**

1. **Profile / home**  
   - See their profile and a home screen.  
   - Data loaded via API Gateway (e.g. patient info, appointments).

2. **Chat (text)**  
   - Go to **Chat**.  
   - Type a message → browser sends `POST /api/v1/orchestration/pipelines` with `{ prompt, patient_id }`.  
   - Gateway forwards to **Orchestration Engine**.  
   - Orchestration: intent → RAG or agent → LLM → safety → one `final_response`.  
   - Response shown in the chat UI.  
   - No voice, no streaming; one request per message.

3. **Voice**  
   - Go to **Voice** tab.  
   - **Option A — Speak:**  
     - Press mic, speak, release.  
     - Browser encodes the recording to base64 and sends **one** `POST /api/v1/voice/process` with `{ audio_b64, patient_id, want_tts }`.  
     - Gateway → **streaming-voice**.  
     - Streaming-voice: STT → transcript → same orchestration pipeline (one call) → optional TTS → returns `{ transcript, response, audio_b64 }`.  
     - UI shows transcript and reply; if “Play aloud” is on, it plays `audio_b64`.  
   - **Option B — Type on Voice page:**  
     - Type in the text box and send.  
     - Text is sent either as pipeline-only (like chat) or via voice process; if “Play aloud” is on, the app may call `/api/v1/voice/tts` to speak the reply.  
   - So for the patient, “streaming” in practice is: one question (voice or text) → one answer (text + optional speech). The **streaming-voice service** is what does STT and TTS; the **channel** is REST (one request, one response per turn).

4. **Appointments**  
   - View (and possibly manage) appointments.  
   - API calls go through the gateway to orchestration/execution/database as needed.

5. **Help**  
   - View help/articles.  
   - May be backed by knowledge base or static content; again via gateway.

**End-to-end (layman):**  
Patient opens Patient Portal → chooses Chat or Voice.  
- **Chat:** type → one API call (pipeline) → one text reply.  
- **Voice:** speak or type on Voice page → one (or two) API call(s) (voice/process and maybe TTS) → one text reply + optional played audio.  
The “streaming” they might notice is the **audio** (recording sent, then reply played); under the hood it’s still one request/response per turn unless the app is later changed to use the WebSocket voice channel.

---

### Hospital Tenant / Staff (Reception, Nurses, Doctors, Schedulers)

**Who:** Staff of a hospital or clinic (tenant) using the staff-facing app.

**Where they go:** **Hospital Portal** — http://localhost:3400 (or your deployed URL).

**What they do:**

1. **Identity**  
   - “Logged in as” or role selection (e.g. reception, nurse, doctor).  
   - Used for context in chat and for any tenant-scoped data.

2. **Chat (AI assistant)**  
   - Staff use the in-app **Chat** to ask questions (e.g. policies, schedules, patient summaries).  
   - Same mechanism as patient chat: `POST /api/v1/orchestration/pipelines` with prompt (and tenant/user context if sent).  
   - One request per message; one full text response. No voice or message streaming in the current design.

3. **Patients**  
   - List and view patients (and possibly patient details).  
   - API calls go through the gateway to backend services that read from the database.

4. **Appointments**  
   - View and manage appointments (create, reschedule, etc.).  
   - Uses execution engine and DB via the gateway.

5. **Schedule**  
   - View schedule (slots, availability).  
   - Again via gateway and backend.

6. **Knowledge**  
   - Access internal knowledge base (policies, procedures).  
   - RAG and knowledge APIs behind the gateway.

7. **Status**  
   - System status (e.g. health of services).  
   - Same observability/health endpoints as admin, possibly with a simpler view.

**End-to-end (layman):**  
Staff open Hospital Portal → pick identity → use Chat, Patients, Appointments, Schedule, Knowledge, Status. Every action is HTTP request → gateway → one or more backend services → response. No voice in the current Hospital Portal; no streaming except in the same sense as patient chat (one message, one reply). The **streaming-voice** service is not in the path for staff unless you add a voice UI to the hospital portal later.

---

## Summary Table

| User type        | App            | Main actions                    | Uses streaming-voice? | “Streaming” in practice        |
|------------------|----------------|----------------------------------|------------------------|---------------------------------|
| AURIXA admin     | Dashboard      | Tenants, services, playground, analytics, knowledge, audit, config | No  | N/A                             |
| Patient          | Patient Portal | Chat (text), Voice (mic/text + play aloud), appointments, help | Yes (Voice tab) | Voice: one REST request per turn (audio in/out); optional WebSocket for future |
| Hospital staff   | Hospital Portal | Chat, patients, appointments, schedule, knowledge, status | No  | Same as chat: one request, one reply |

---

## Putting It All Together

- **Streaming-voice service**: Accepts voice (or text), runs STT → orchestration pipeline (one call) → optional TTS. Exposed via REST (`/api/v1/voice/process`, `/api/v1/voice/tts`) and WebSocket (`/ws/stream`). Gateway proxies so the outside world only talks to the gateway.
- **Streaming in the channel layer**: Only the **voice WebSocket** is a real message stream (many messages back and forth). Voice REST and webchat are one request, one response per turn. LLM token streaming is not implemented yet.
- **Admins** use the Dashboard for configuration, testing, and observability; no voice.
- **Patients** use the Patient Portal for chat and voice; voice goes through the streaming-voice service (REST or WebSocket).
- **Hospital staff** use the Hospital Portal for chat and operational screens; they do not use the streaming-voice service today.

All user flows go through the **API Gateway**; the gateway routes to orchestration, streaming-voice, or other services as needed. The **orchestration engine** is the single place that runs the full pipeline (intent → RAG/agent → LLM → safety); streaming-voice is the adapter that adds voice in (STT) and voice out (TTS) around that same pipeline.
