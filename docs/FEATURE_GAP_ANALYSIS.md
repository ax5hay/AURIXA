# AURIXA Feature Gap Analysis vs Original Product Prompt

A deep-dive audit of service code against the production-grade conversational AI platform requirements.  
**Reference:** Original system product context prompt (channel, streaming, conversation intelligence, agent orchestration, RAG 2.0, safety, execution, observability, infrastructure).

---

## Executive Summary

| Layer | Prompt Requirement | Current Implementation | Gap |
|-------|--------------------|------------------------|-----|
| Channel | Voice, SMS, Webchat, WhatsApp, Mobile SDK, Smart IVR | Voice WebSocket, Webchat (patient portal/playground) | SMS, WhatsApp, Mobile SDK, IVR missing |
| Streaming | Streaming ASR, duplex, partial transcripts, <800ms | Text + placeholder audio; no ASR | No Whisper/Deepgram; no duplex; high latency |
| Conversation Intelligence | Hybrid NLU, semantic routing, confidence scoring | Keyword-based routing; LOCAL/cloud fallback | No embeddings; no confidence in routing |
| Agent Orchestration | Tool-using agents, multi-step, LangGraph/CrewAI | Keyword tool dispatch; no LLM function calling | Not in pipeline; no state machine |
| RAG 2.0 | BM25 + vector, rerankers, context injection | Vector + keyword boost; FAISS | No BM25; no rerankers; no history injection |
| Safety | Risk classifiers, emergency detection, escalation | Banned words, PII redaction | No emergency/escalation |
| Execution | EHR, billing, appointments, prescriptions | send_email, schedule_reminder, log_audit | No real integrations |
| Observability | Intent accuracy, hallucination, voice metrics | Mock telemetry only | No live ingestion from pipeline |
| Infrastructure | GPU/vLLM, K8s, WebRTC | Microservices, LM Studio | No vLLM; limited scaling |
| Cost Optimization | 40–70% LLM reduction | Local-first routing | No context compression, caching, distilled models |

---

## 1. Channel Layer

**Prompt:** Voice, SMS, Webchat, WhatsApp, Mobile SDK, Smart IVR fallback.

| Channel | Status | Location | Notes |
|---------|--------|----------|-------|
| Voice | Implemented | `streaming-voice` `/ws/stream`, gateway `/voice` proxy | Accepts text + base64 audio; audio is placeholder |
| Webchat | Implemented | Patient portal, Playground | Chat UI → orchestration pipeline |
| SMS | Missing | — | Requires Twilio/similar adapter |
| WhatsApp | Missing | — | Requires WhatsApp Business API |
| Mobile SDK | Missing | — | Would need iOS/Android native SDK |
| Smart IVR fallback | Missing | — | DTMF/voice menu fallback for failures |

---

## 2. Streaming Voice Layer

**Prompt:** Streaming ASR → partial transcripts → early intent → real-time response; Whisper/Deepgram; duplex; interrupt handling; <800ms.

| Feature | Status | Code Location |
|---------|--------|---------------|
| Real-time audio ingestion | Partial | `streaming_voice/main.py` accepts base64 audio |
| Streaming ASR (Whisper/Deepgram) | Partial | Deepgram when DEEPGRAM_API_KEY set; `_transcribe_audio` |
| Duplex audio | Missing | Response is text only; no TTS/audio back |
| Interrupt handling | Missing | — |
| Latency target (<800ms) | Not met | Pipeline is synchronous request-response; LM Studio can be slow |

---

## 3. Conversation Intelligence (Hybrid NLU + LLM)

**Prompt:** Intent classifier, embedding similarity, context reasoning, semantic routing, confidence scoring; reduce LLM cost.

| Feature | Status | Code Location |
|---------|--------|---------------|
| Intent classifier | Partial | `llm_router/main.py` keyword rules (haiku/opus/gemini) |
| LLM fallback | Implemented | LOCAL first; cloud for keyword matches |
| Semantic routing | Implemented | LLM Router calls RAG `/embed`, cosine similarity to intent embeddings |
| Context reasoning | Missing | No conversation history in route |
| Confidence scoring | Implemented | `RouteResponse.confidence` from embedding similarity |
| Cost reduction | Partial | Response cache (TTL); keyword routing; no context compression |

---

## 4. Agent Orchestration

**Prompt:** Tool-using AI agents; query enterprise systems; multi-step workflows; LangGraph/CrewAI/Semantic Kernel.

| Feature | Status | Code Location |
|---------|--------|---------------|
| Tool registry | Implemented | `agent_runtime/main.py` TOOL_REGISTRY |
| RAG tool | Implemented | `search_knowledge_base` calls RAG |
| Pipeline integration | Missing | Orchestration never calls agent-runtime |
| LLM function calling | Missing | Keyword-based tool selection (`tool_name in task.prompt`) |
| Multi-step state machine | Missing | Single-tool dispatch only |
| Agent planners (LangGraph/CrewAI) | Missing | — |

---

## 5. Knowledge Intelligence (RAG 2.0)

**Prompt:** Hybrid retrieval (BM25 + vector), medical/domain rerankers, context injection (history, reports).

| Feature | Status | Code Location |
|---------|--------|---------------|
| Vector search | Implemented | `rag_service/main.py` FAISS + SentenceTransformer |
| Keyword boost | Implemented | Relevance scoring for term matches |
| BM25 hybrid | Implemented | rank-bm25 + Reciprocal Rank Fusion; `RAG_USE_HYBRID` env |
| Medical/domain rerankers | Missing | — |
| Chunk lineage tracking | Missing | — |
| DB + fallback docs | Implemented | `documents.py` load_documents_from_db |

---

## 6. Clinical / Compliance Safety

**Prompt:** Risk classifiers, response validators, emergency detection, PHI leakage, escalation triggers.

| Feature | Status | Code Location |
|---------|--------|---------------|
| Banned words | Implemented | `safety_guardrails/main.py` configurable via env |
| PII detection | Implemented | SSN, email, phone, credit card patterns |
| PII redaction | Implemented | Pattern substitution |
| Emergency symptom detection | Missing | — |
| Unsafe advice detection | Missing | — |
| Escalation triggers | Missing | No `requires_escalation` flag |

---

## 7. Execution Layer

**Prompt:** Appointment APIs, EHR, billing, prescriptions, insurance verification.

| Feature | Status | Code Location |
|---------|--------|---------------|
| send_email | Placeholder | `execution_engine` |
| schedule_reminder | Placeholder | — |
| log_audit | Placeholder | — |
| get_appointments, create_appointment | Stub | Execution engine + agent integration |
| check_insurance, get_availability | Stub | — |
| request_prescription_refill | Stub | — |
| EHR integration | Stub | Scaffolding for real integrations |

---

## 8. Observability

**Prompt:** Intent accuracy, hallucination rate, retrieval precision, voice metrics (silence, talk ratio), call success.

| Feature | Status | Code Location |
|---------|--------|---------------|
| Telemetry ingestion API | Implemented | `observability_core` POST `/api/v1/telemetry` |
| Live telemetry from services | Implemented | Orchestration (pipeline_step), LLM router (llm_call with cost) emit to observability |
| Performance reports | Implemented | Mock data + real analysis of stored events |
| Intent accuracy tracking | Missing | — |
| Voice metrics | Missing | — |
| Retrieval precision | Missing | — |

---

## 9. Infrastructure

**Prompt:** GPU clusters, vLLM, Kubernetes scaling, WebRTC streaming gateways.

| Feature | Status | Notes |
|---------|--------|-------|
| Microservices | Implemented | 10+ services |
| LM Studio (local LLM) | Implemented | OpenAI-compatible |
| vLLM / GPU inference | Missing | — |
| Kubernetes | Partial | k8s templates exist |
| WebRTC | Missing | — |

---

## Recommended Implementation Priorities

### P1 – Immediate (Implemented in this session)

1. **Safety:** Emergency keyword detection + escalation flag
2. **Orchestration ↔ Agent:** Integrate agent-runtime into pipeline when prompt suggests tool use
3. **Observability:** Emit real telemetry from orchestration to observability-core

### P2 – Short-term

4. **Conversation Intelligence:** Semantic routing via RAG embeddings before LLM
5. **RAG 2.0:** Add BM25 hybrid retrieval (rank-bm25)
6. **Agent:** Wire LLM with function calling for tool selection
7. **Observability:** Add telemetry from LLM router (cost, latency)

### P3 – Medium-term (Partial)

8. **Streaming ASR:** Deepgram integration when DEEPGRAM_API_KEY set
9. **Execution:** EHR/appointment adapters (get_appointments, create_appointment, check_insurance, get_availability, request_prescription_refill)
10. **Channel:** SMS adapter (Twilio) — not implemented
11. **Cost:** Response caching (ORCHESTRATION_RESPONSE_CACHE_TTL, skip for agent path)

### Deferred (per user request)

- Auth and identity services
