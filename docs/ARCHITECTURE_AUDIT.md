# AURIXA Architecture Audit vs Product Requirements

Maps the production-grade conversational AI platform requirements to current implementation status for the **real estate** domain.

## Summary

| Layer                      | Status      | Notes                                                              |
| -------------------------- | ----------- | ------------------------------------------------------------------ |
| Channel Layer              | Partial     | Voice, Webchat; SMS/WhatsApp/Mobile SDK/IVR not implemented        |
| Streaming Layer            | Partial     | REST voice + WS token stream; no duplex interrupt handling         |
| Conversation Intelligence  | Partial     | LLM routing + semantic intents; limited multi-turn context         |
| Agent Orchestration        | Partial     | Agent runtime with tool calls; no LangGraph/CrewAI planners        |
| Knowledge (RAG)            | Implemented | Vector + BM25 hybrid, FAISS, tenant articles                       |
| Compliance Safety          | Implemented | Fair housing, fraud, legal escalation; PII redaction               |
| Execution Layer            | Partial     | DB-backed showings, listings, financing, leads; no MLS/CRM APIs    |
| Observability              | Partial     | Telemetry, performance reports; limited AI quality metrics         |
| Infrastructure             | Partial     | Microservices + Helm; no GPU/vLLM, WebRTC                          |

---

## 1. Channel Layer

**Required:** Voice, SMS, Webchat, WhatsApp, Mobile SDK, Smart IVR fallback

| Channel            | Status             | Location                                 |
| ------------------ | ------------------ | ---------------------------------------- |
| Voice              | ✅ Implemented     | `streaming-voice` REST + WebSocket       |
| Webchat            | ✅ Implemented     | Client portal chat, Playground           |
| SMS                | ❌ Not implemented | —                                        |
| WhatsApp           | ❌ Not implemented | —                                        |
| Mobile SDK         | ❌ Not implemented | —                                        |
| Smart IVR fallback | ❌ Not implemented | —                                        |

---

## 2. Streaming Layer

**Required:** Streaming ASR, partial transcripts, early intent, duplex, interrupt handling (<800ms)

| Feature                   | Status     | Notes                        |
| ------------------------- | ---------- | ---------------------------- |
| Real-time audio ingestion | ✅         | Voice accepts base64 audio   |
| Streaming ASR             | ✅ Partial | faster-whisper / Vosk / Deepgram |
| Duplex audio              | ❌         | Response is text + optional TTS |
| Interrupt handling        | ❌         | —                            |
| Latency target (<800ms)   | ❌         | Pipeline is request-response |

---

## 3. Conversation Intelligence (Hybrid NLU + LLM)

| Feature                       | Status     | Location                                            |
| ----------------------------- | ---------- | --------------------------------------------------- |
| Intent classifier             | ✅ Partial | LLM Router keyword + semantic intents               |
| LLM fallback                  | ✅         | LLM Router with LOCAL/cloud fallback                |
| Semantic routing              | ✅         | RAG `/embed` + cosine similarity                    |
| Context reasoning             | ❌         | Limited conversation history in route               |
| Confidence scoring            | ✅         | RouteResponse.confidence from semantic match        |
| Cost reduction (intent-based) | ✅ Partial | Keyword routing avoids LLM for simple cases         |

---

## 4. Agent Orchestration

| Feature                   | Status     | Location                                                |
| ------------------------- | ---------- | ------------------------------------------------------- |
| Tool calling LLMs         | ✅ Partial | Agent runtime TOOL_REGISTRY                             |
| RAG tool integration      | ✅         | `search_knowledge_base` calls RAG                       |
| Pipeline integration      | ✅         | Orchestration calls agent when prompt suggests tool use |
| Function execution chains | ❌         | Single-tool dispatch only                               |
| Agent planners            | ❌         | No LangGraph/CrewAI                                     |
| Multi-step state machine  | ❌         | —                                                       |

---

## 5. Knowledge Intelligence (RAG 2.0)

| Feature                  | Status | Location                                  |
| ------------------------ | ------ | ----------------------------------------- |
| Vector search            | ✅     | FAISS + sentence-transformers             |
| Keyword boost            | ✅     | `apps/rag-service` relevance scoring      |
| BM25 hybrid              | ✅     | rank-bm25 + Reciprocal Rank Fusion        |
| Embed API                | ✅     | POST `/api/v1/embed` for semantic routing |
| Domain rerankers         | ❌     | —                                         |
| Chunk lineage            | ❌     | —                                         |
| DB + fallback docs       | ✅     | Real estate fallback documents            |

---

## 6. Compliance Safety Layer

**Required:** Risk classifiers, response validators, fair housing / fraud escalation, PHI leakage controls

| Feature                 | Status | Location                                                  |
| ----------------------- | ------ | --------------------------------------------------------- |
| Banned words            | ✅     | `safety-guardrails` configurable                          |
| PII detection           | ✅     | SSN, email, phone, credit card                            |
| PII redaction           | ✅     | Pattern substitution                                      |
| Fair housing / fraud    | ✅     | `SAFETY_*` real estate policy keywords                   |
| Unsafe advice detection | ❌     | —                                                         |
| Escalation triggers     | ✅     | `requires_escalation` + `escalation_type` in ValidateResponse |

---

## 7. Execution Layer

**Required:** MLS, CRM, scheduling, financing, maintenance workflows

| Feature                              | Status  | Location                  |
| ------------------------------------ | ------- | ------------------------- |
| send_email                           | ✅      | `execution-engine`        |
| schedule_reminder                    | ✅      | —                         |
| log_audit                            | ✅      | —                         |
| get_showings, create_showing         | ✅ Stub | Execution + agent wiring  |
| get_listings, get_client_financing   | ✅ Stub | —                         |
| create_service_request, create_lead  | ✅ Stub | —                         |
| MLS / CRM integration                | Stub    | Scaffolding for real APIs |

---

## 8. Observability Layer

| Feature                 | Status | Location                                           |
| ----------------------- | ------ | -------------------------------------------------- |
| Performance reports     | ✅     | `observability-core`                               |
| Conversation telemetry  | ✅     | Orchestration stores steps                         |
| Live pipeline telemetry | ✅     | Orchestration emits pipeline_step                  |
| Intent accuracy         | ❌     | Not tracked                                        |
| Voice metrics           | ❌     | —                                                  |
| Retrieval precision     | ❌     | —                                                  |

---

## 9. Infrastructure Layer

| Feature               | Status  | Notes               |
| --------------------- | ------- | ------------------- |
| Microservices         | ✅      | 10+ services        |
| LM Studio (local LLM) | ✅      | OpenAI-compatible   |
| vLLM / GPU inference  | ❌      | —                   |
| Kubernetes / Helm     | Partial | Helm is release path |
| WebRTC                | ❌      | —                   |

---

## 10. Voice → Profile Sync

| Feature                               | Status | Location                   |
| ------------------------------------- | ------ | -------------------------- |
| client_id in pipeline                 | ✅     | PipelineRequest (+ legacy patient_id alias) |
| Conversation storage                  | ✅     | Conversation meta_data     |
| GET /clients/:id/conversations        | ✅     | Orchestration + gateway    |
| Client portal conversation history    | ✅ Partial | Client BFF              |
| Chat sends client context             | ✅     | Client portal sendMessage  |

---

## Recommended Priorities

1. **MLS / CRM adapters** – Replace DB stubs with organization integrations
2. **Streaming ASR polish** – Lower latency voice turn-around
3. **SMS channel** – Twilio or similar adapter
4. **Multi-step agent flows** – Showing booking with confirmation steps
5. **Observability AI metrics** – Intent accuracy, retrieval precision
6. **Telephony (PSTN)** – See `docs/END_USER_FLOW_AND_TELEPHONY.md`
