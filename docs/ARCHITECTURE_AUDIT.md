# AURIXA Architecture Audit vs Product Requirements

Maps the production-grade conversational AI platform requirements to current implementation status.

## Summary

| Layer | Status | Notes |
|-------|--------|-------|
| Channel Layer | Partial | Voice, Webchat; SMS/WhatsApp/Mobile SDK/IVR not implemented |
| Streaming Layer | Partial | Text WebSocket; no streaming ASR, duplex, interrupt handling |
| Conversation Intelligence | Partial | LLM routing + keyword rules; no hybrid NLU, semantic routing |
| Agent Orchestration | Partial | Agent runtime with tool calls; no LangGraph/CrewAI planners |
| Knowledge (RAG) | Implemented | Vector + keyword boost, FAISS, DB fallback |
| Clinical/Compliance Safety | Implemented | Banned words, PII detection + redaction |
| Execution Layer | Partial | send_email, schedule_reminder, log_audit; no EHR/billing/insurance |
| Observability | Partial | Mock telemetry, performance reports; no AI metrics |
| Infrastructure | Partial | Microservices; no GPU/vLLM, K8s scaling, WebRTC |

---

## 1. Channel Layer

**Required:** Voice, SMS, Webchat, WhatsApp, Mobile SDK, Smart IVR fallback

| Channel | Status | Location |
|---------|--------|----------|
| Voice | ✅ Implemented | `streaming-voice` WebSocket `/ws/stream` |
| Webchat | ✅ Implemented | Patient portal chat, Playground |
| SMS | ❌ Not implemented | — |
| WhatsApp | ❌ Not implemented | — |
| Mobile SDK | ❌ Not implemented | — |
| Smart IVR fallback | ❌ Not implemented | — |

---

## 2. Streaming Layer

**Required:** Streaming ASR, partial transcripts, early intent, duplex, interrupt handling (<800ms)

| Feature | Status | Notes |
|---------|--------|-------|
| Real-time audio ingestion | ✅ | Voice accepts base64 audio |
| Streaming ASR (Deepgram) | ✅ Partial | When DEEPGRAM_API_KEY set |
| Duplex audio | ❌ | Response is text only |
| Interrupt handling | ❌ | — |
| Latency target (<800ms) | ❌ | Pipeline is request-response |

---

## 3. Conversation Intelligence (Hybrid NLU + LLM)

**Required:** Intent classifier, embedding similarity, context reasoning, semantic routing, confidence scoring

| Feature | Status | Location |
|---------|--------|----------|
| Intent classifier | ✅ Partial | LLM Router keyword rules |
| LLM fallback | ✅ | LLM Router with LOCAL/cloud fallback |
| Semantic routing | ✅ | RAG /embed + cosine similarity to intent embeddings |
| Context reasoning | ❌ | No conversation history in route |
| Confidence scoring | ✅ | RouteResponse.confidence from semantic match |
| Cost reduction (intent-based) | ✅ Partial | Keyword routing avoids LLM for simple cases |

---

## 4. Agent Orchestration

**Required:** Tool-using agents, multi-step workflows, LangGraph/CrewAI/Semantic Kernel

| Feature | Status | Location |
|---------|--------|----------|
| Tool calling LLMs | ✅ Partial | Agent runtime TOOL_REGISTRY |
| RAG tool integration | ✅ | `search_knowledge_base` calls RAG |
| Pipeline integration | ✅ | Orchestration calls agent when prompt suggests tool use |
| Function execution chains | ❌ | Single-tool dispatch only |
| Agent planners | ❌ | No LangGraph/CrewAI |
| Multi-step state machine | ❌ | — |

---

## 5. Knowledge Intelligence (RAG 2.0)

**Required:** Hybrid retrieval (BM25 + vector), domain rerankers, context injection

| Feature | Status | Location |
|---------|--------|----------|
| Vector search | ✅ | FAISS + sentence-transformers |
| Keyword boost | ✅ | `apps/rag-service` relevance scoring |
| BM25 hybrid | ✅ | rank-bm25 + Reciprocal Rank Fusion |
| Embed API | ✅ | POST `/api/v1/embed` for semantic routing |
| Medical/domain rerankers | ❌ | — |
| Chunk lineage | ❌ | — |
| DB + fallback docs | ✅ | `documents.py` |

---

## 6. Clinical / Compliance Safety Layer

**Required:** Risk classifiers, response validators, emergency detection, PHI leakage

| Feature | Status | Location |
|---------|--------|----------|
| Banned words | ✅ | `safety-guardrails` configurable |
| PII detection | ✅ | SSN, email, phone, credit card |
| PII redaction | ✅ | Pattern substitution |
| Emergency symptoms | ✅ | `SAFETY_EMERGENCY_KEYWORDS` env; chest pain, stroke, etc. |
| Unsafe advice detection | ❌ | — |
| Escalation triggers | ✅ | `requires_escalation` in ValidateResponse |

---

## 7. Execution Layer

**Required:** EHR, billing, scheduling, insurance verification, prescriptions

| Feature | Status | Location |
|---------|--------|----------|
| send_email | ✅ | `execution-engine` |
| schedule_reminder | ✅ | — |
| log_audit | ✅ | — |
| get_appointments, create_appointment | ✅ Stub | Execution + agent wiring |
| check_insurance, get_availability | ✅ Stub | — |
| request_prescription_refill | ✅ Stub | — |
| EHR integration | Stub | Scaffolding for real APIs |

---

## 8. Observability Layer

**Required:** Intent accuracy, hallucination rate, retrieval precision, voice metrics (silence, talk ratio)

| Feature | Status | Location |
|---------|--------|----------|
| Performance reports | ✅ | `observability-core` |
| Conversation telemetry | ✅ | Orchestration stores steps |
| Live pipeline telemetry | ✅ | Orchestration emits pipeline_step to observability |
| Intent accuracy | ❌ | Not tracked |
| Voice metrics | ❌ | — |
| Retrieval precision | ❌ | — |

---

## 9. Infrastructure Layer

**Required:** GPU clusters, vLLM, Kubernetes, WebRTC

| Feature | Status | Notes |
|---------|--------|-------|
| Microservices | ✅ | 10+ services |
| LM Studio (local LLM) | ✅ | OpenAI-compatible |
| vLLM / GPU inference | ❌ | — |
| Kubernetes | Partial | k8s templates exist |
| WebRTC | ❌ | — |

---

## 10. Voice → Profile Sync (Mock User)

**Required:** When a user calls, updates appear on their profile page

| Feature | Status | Location |
|---------|--------|----------|
| patient_id in pipeline | ✅ | PipelineRequest, voice WS |
| Conversation storage | ✅ | Conversation meta_data |
| GET /patients/:id/conversations | ✅ | Orchestration + gateway |
| Patient portal "Recent conversations" | ✅ | Dashboard tab |
| Chat sends patient_id | ✅ | Patient portal sendMessage |

---

## Recommended Priorities

1. **Fix 404 routing** – Dashboard/patient-portal page resolution
2. **Streaming ASR** – Integrate Whisper/Deepgram for real voice
3. **SMS channel** – Twilio or similar adapter
4. **Semantic routing** – Embedding-based intent before LLM
5. **Execution EHR/billing** – Placeholder adapters for demos
6. **Observability AI metrics** – Intent accuracy, retrieval precision
