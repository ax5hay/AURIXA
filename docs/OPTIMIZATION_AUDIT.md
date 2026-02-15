# AURIXA Performance & Optimization Audit

**Scope:** Entire SaaS — API Gateway, Python services, frontends, DB/cache, Docker, integrations.  
**Goals:** Maximum speed, robustness, resilience, scalability, modularity, performance excellence end-to-end and per service.

---

## Executive Summary

| Area | Priority | Impact | Effort | Status |
|------|----------|--------|--------|--------|
| DB connection pool & pool_pre_ping | P0 | High | Low | Recommended |
| Shared HTTP clients (Python services) | P0 | High | Low | Recommended |
| Orchestration response cache (Redis or capped LRU) | P0 | High | Medium | Recommended |
| Gateway: streaming proxy for pipeline/LLM | P1 | High | Medium | Recommended |
| Docker healthchecks & depends_on conditions | P1 | Resilience | Low | Recommended |
| DB indexes for hot queries | P1 | Medium | Low | Recommended |
| Frontend: client-side cache (SWR/React Query) | P2 | Medium | Medium | Optional |
| Gateway: persistent HTTP agent (keep-alive) | P2 | Low–Medium | Low | Optional |

---

## 1. API Gateway (TypeScript / Fastify)

### Current State

- **Proxy:** Uses native `fetch()` per request; forwards to upstreams with path-based routing and timeouts (pipeline 180s, LLM 15s, others 30s).
- **Response handling:** Full buffering — `await response.text()` then `reply.send(body)`. No streaming.
- **Health:** `/health/services` runs parallel `fetch()` to each service with 3s timeout; no healthchecks defined in Docker for the gateway itself.
- **Rate limit:** 200 req/min per tenant/IP; no per-route or burst tuning.

### Findings

| Issue | Severity | Recommendation |
|-------|----------|-----------------|
| **Buffered proxy** | High | For `/orchestration/pipelines` and `/llm/*` (e.g. generate), stream response chunks to the client instead of buffering. Reduces TTFB and memory under load. |
| **No connection reuse** | Medium | Node 18+ `fetch` keeps connections alive per origin by default. For explicit pooling and keep-alive to multiple origins, use a shared `undici.Dispatcher` or `http.Agent` with `keepAlive: true` and pass through to `fetch` (or use `fastify-http-proxy` / `@fastify/http-proxy` with streaming). |
| **No gateway healthcheck in Docker** | Medium | Add `healthcheck` for gateway (e.g. `GET /health`) so orchestrators can mark the container healthy and use `depends_on: condition: service_healthy` for dependent services. |
| **WebSockets** | Low | Voice and conversation WS proxies are straightforward; ensure upstream connection timeouts and backpressure if upstream is slow. |

### Recommended Actions

1. **Streaming proxy (P1):** For routes that return large or slow responses (orchestration pipelines, LLM generate), detect `Transfer-Encoding: chunked` or `Content-Type: text/event-stream` and pipe the upstream body to the reply stream instead of buffering.
2. **Healthcheck in Docker:** Add `healthcheck` for `api-gateway` and, where appropriate, use `condition: service_healthy` for services that depend on it.
3. **Optional:** Introduce a shared HTTP agent (e.g. undici) with limits and keep-alive for gateway → backend calls if profiling shows connection churn.

---

## 2. Database (PostgreSQL + packages/db)

### Current State

- **Engine:** `create_async_engine(DATABASE_URL, echo=False, future=True)` — no `pool_size`, `max_overflow`, or `pool_pre_ping`.
- **Sessions:** FastAPI dependency `get_db_session()` yields a session per request and closes it; usage is correct.
- **Models:** Conversation, PipelineStep, Appointment, KnowledgeBaseArticle, etc. Some indexes (e.g. `session_id`, `service`) exist; hot query paths not all covered.

### Findings

| Issue | Severity | Recommendation |
|-------|----------|-----------------|
| **Default pool size** | High | Set explicit `pool_size` (e.g. 5–20) and `max_overflow` (e.g. 10) so multiple workers/containers don’t over-open connections. |
| **No pool_pre_ping** | High | Enable `pool_pre_ping=True` so stale/broken connections are discarded before use (critical after idle or failover). |
| **Unbounded pool** | Medium | Rely on `pool_size` + `max_overflow`; avoid creating many engines per process. |
| **Missing composite index** | Medium | Execution engine’s `_get_appointments` filters `Appointment.patient_id`, `status != 'cancelled'`, `order_by(start_time)`. Add composite index: `(patient_id, status, start_time)` to avoid full scans on large tables. |
| **AuditLog queries** | Low | If you query by `(service, action)` or time range, add indexes to match. |

### Recommended Actions

1. **Pool configuration (P0):** In `packages/db`, set e.g. `pool_size=10`, `max_overflow=10`, `pool_pre_ping=True` (and optionally `pool_recycle=3600`).
2. **Index (P1):** Add composite index on `appointments(patient_id, status, start_time)` (and tenant_id if filtered often).
3. **Env override:** Allow `DB_POOL_SIZE` / `DB_MAX_OVERFLOW` from env for tuning per environment.

---

## 3. Orchestration Engine

### Current State

- **HTTP:** Single shared `httpx.AsyncClient(timeout=60)` in `clients.py`; retries (3 attempts) for LLM/RAG/agent/safety. Good.
- **Response cache:** In-memory dict `_response_cache: dict[str, tuple[str, float]]`; TTL eviction only on read; no max size; not shared across instances.

### Findings

| Issue | Severity | Recommendation |
|-------|----------|-----------------|
| **Unbounded in-memory cache** | High | Cache can grow without limit; long-lived process may OOM. Use either: (a) Redis with TTL and optional maxmemory-policy, or (b) in-process LRU with max size (e.g. 1000 entries) and TTL eviction on read + periodic cleanup. |
| **Cache not shared** | Medium | With multiple orchestration replicas, each has its own cache. Move to Redis for shared cache and better hit rate. |
| **Pipeline strictly sequential** | Low | Intent → Agent or (RAG → Generate) → Safety is correct; no unnecessary parallelism to add. |
| **Telemetry** | Good | `emit_telemetry` is fire-and-forget with short timeout; non-blocking. |

### Recommended Actions

1. **Cache (P0):** Either (1) Add Redis-backed cache with TTL and use it when `REDIS_URL` is set, or (2) Keep in-memory but add a max size and LRU eviction (e.g. `cachetools.TTLCache(maxsize=1000, ttl=CACHE_TTL_SEC)`) plus periodic cleanup of expired keys.
2. **Optional (P2):** Use Redis for response cache when available; fallback to capped in-memory LRU.

---

## 4. LLM Router

### Current State

- **Route endpoint:** For semantic routing, creates `async with httpx.AsyncClient(timeout=5.0)` per request to call RAG `/api/v1/embed` — new client (and connection) every time.
- **Generate endpoint:** Uses `LLMRouter` (OpenAI/Anthropic/Gemini clients); those SDKs typically use their own connection pooling.
- **Startup:** Fetches LM Studio models and intent embeddings with one-off clients; acceptable.

### Findings

| Issue | Severity | Recommendation |
|-------|----------|-----------------|
| **New AsyncClient per route request** | High | Create one shared `httpx.AsyncClient` (e.g. in lifespan or module) for RAG/embed calls; reuse for every request to avoid connection churn and latency. |
| **Per-request client in generate** | Medium | If any code path still uses a new `httpx.AsyncClient` for generate, replace with shared client. |

### Recommended Actions

1. **Shared client (P0):** In LLM Router, create a single `httpx.AsyncClient` at startup (or in app state) with sensible limits and timeouts; use it for all RAG embed and any other internal HTTP calls. Close on shutdown.

---

## 5. Agent Runtime

### Current State

- **RAG calls:** `async with httpx.AsyncClient(timeout=10.0)` per request.
- **Execution engine calls:** `async with httpx.AsyncClient(timeout=15.0)` per request.

### Findings

| Issue | Severity | Recommendation |
|-------|----------|-----------------|
| **New client per request** | High | Use one shared `httpx.AsyncClient` (or two: one for RAG, one for execution) in app state, created in lifespan, closed on shutdown. Set timeouts per call if needed. |

### Recommended Actions

1. **Shared client(s) (P0):** Add shared `httpx.AsyncClient` in lifespan; use for RAG and execution-engine calls.

---

## 6. Streaming Voice

### Current State

- **Orchestration pipeline:** `async with httpx.AsyncClient(timeout=120.0)` per `_run_pipeline` call.
- **TTS/STT:** New `AsyncClient` per call in `tts.py` and `stt.py` for external APIs.

### Findings

| Issue | Severity | Recommendation |
|-------|----------|-----------------|
| **New client per pipeline call** | High | Reuse a shared client for orchestration (e.g. in app state, created in lifespan). |
| **TTS/STT clients** | Medium | Reuse one or two shared clients for TTS and STT providers to avoid connection churn. |

### Recommended Actions

1. **Shared client for orchestration (P0):** Create in lifespan; use in `_run_pipeline`.
2. **Shared clients for TTS/STT (P1):** Refactor to use app-state or module-level clients with appropriate timeouts.

---

## 7. RAG Service

### Current State

- **Startup:** Loads documents from DB, builds FAISS + BM25 in memory; single encode of full corpus. Good for latency after startup.
- **Telemetry:** `async with httpx.AsyncClient(timeout=2.0)` per emit — minor overhead; could use shared client.
- **Retrieve:** Sync `model.encode([request.prompt])` — CPU-bound; consider running in thread pool if it ever becomes a bottleneck (optional).

### Findings

| Issue | Severity | Recommendation |
|-------|----------|-----------------|
| **Telemetry client** | Low | Use a shared httpx client for observability posts. |
| **Document loading** | Low | If knowledge base grows large, consider lazy loading or tenant-scoped indexes; current design is fine for moderate size. |

### Recommended Actions

1. **Optional:** Shared `httpx.AsyncClient` for telemetry; run encode in `asyncio.to_thread` if profiling shows CPU contention.

---

## 8. Execution Engine

### Current State

- **DB:** Uses `get_db_session`; queries by `patient_id`, `status`, `start_time` on `Appointment`.
- **No explicit connection pool** — uses shared `packages/db` engine; pool settings will apply once added.

### Findings

| Issue | Severity | Recommendation |
|-------|----------|-----------------|
| **Index for get_appointments** | Medium | Add composite index on `(patient_id, status, start_time)` (see §2). |
| **N+1 / over-fetch** | Low | Current single-query pattern is fine; avoid loading full relationships if only IDs are needed. |

### Recommended Actions

1. **Index (P1):** Add the composite index in §2; no code change in execution engine.

---

## 9. Safety Guardrails & Observability

- **Safety:** Lightweight; no heavy I/O in hot path.
- **Observability:** Telemetry is fire-and-forget; ensure it never blocks the request path. Short timeout (2s) is good.

No critical changes; optional: shared httpx client for observability in each service that emits.

---

## 10. Frontend (Next.js)

### Current State

- **API client:** `fetchApi` with `cache: "no-store"` and configurable timeout; pipeline uses 180s.
- **No visible SWR/React Query:** Each page/component likely refetches on mount; no client-side deduplication or stale-while-revalidate.

### Findings

| Issue | Severity | Recommendation |
|-------|----------|-----------------|
| **No client-side cache** | Medium | For list/read-heavy endpoints (tenants, patients, config summary), use SWR or React Query with short stale time (e.g. 30s) to reduce redundant requests and make UI feel snappier. |
| **Bundle** | Low | `optimizePackageImports` for `clsx` is good; consider auditing other large deps and lazy-loading below-the-fold or route-specific code. |

### Recommended Actions

1. **Client cache (P2):** Add SWR or React Query; wrap `getTenants`, `getPatients`, `getConfigSummary`, `getKnowledgeArticles` with cache + revalidate.
2. **Optional:** Dynamic imports for heavy dashboard sections or modals.

---

## 11. Docker & Deployment

### Current State

- **Healthchecks:** Only `redis` and `postgres` have `healthcheck`; no healthchecks for api-gateway or Python services.
- **depends_on:** Gateway lists `orchestration-engine` and `llm-router` but without `condition: service_healthy`; other services use plain `depends_on` (start order only).

### Findings

| Issue | Severity | Recommendation |
|-------|----------|-----------------|
| **No healthchecks for app services** | High | Add `healthcheck` for api-gateway (GET /health), orchestration-engine, llm-router, rag-service, execution-engine, streaming-voice (GET /health on each). Use `interval`/`timeout`/`retries` so unhealthy containers are marked and can be restarted. |
| **depends_on without condition** | Medium | Where startup order matters (e.g. gateway after backends), use `depends_on: <svc>: condition: service_healthy` so Compose/Kubernetes waits for healthy backends before starting dependents. |
| **Resource limits** | Low | Optionally add `deploy.resources.limits` (memory/cpu) to avoid noisy neighbours in shared hosts. |

### Recommended Actions

1. **Healthchecks (P1):** Add `healthcheck` for api-gateway and all Python services that expose `/health`.
2. **depends_on:** Set `condition: service_healthy` for api-gateway → orchestration-engine, llm-router (and optionally rag-service) once they have healthchecks.
3. **Optional:** Set resource limits in docker-compose or in Kubernetes manifests.

---

## 12. Integrations (LLM, TTS, STT)

- **LLM:** OpenAI/Anthropic/Gemini SDKs use their own HTTP pooling; no change needed in AURIXA code.
- **LM Studio:** Reused via single router; ensure base URL is stable and timeouts are sufficient for first-token latency.
- **TTS/STT:** Prefer shared httpx clients per provider (see §6).

---

## Implementation Priority

1. **Immediate (P0):** DB pool + pool_pre_ping; shared httpx clients (orchestration already has one) in llm-router, agent-runtime, streaming-voice; orchestration cache cap or Redis.
2. **Short-term (P1):** Gateway streaming for pipeline/LLM responses; Docker healthchecks and healthy depends_on; DB composite index for appointments.
3. **Medium-term (P2):** Frontend client cache (SWR/React Query); optional gateway HTTP agent; resource limits.

---

## Summary Table (per service)

| Service | Speed | Resilience | Scalability | Notes |
|---------|--------|------------|-------------|--------|
| API Gateway | Buffering → streaming | Add healthcheck | OK | Shared agent optional |
| Orchestration | Cache Redis/cap | Pool + pre_ping | Cache shared with Redis |
| LLM Router | Shared httpx | — | OK | RAG embed reuse |
| Agent Runtime | Shared httpx | — | OK | RAG + execution reuse |
| RAG | OK | — | OK | Optional to_thread for encode |
| Streaming Voice | Shared httpx | — | OK | Orchestration + TTS/STT |
| Execution Engine | Index | Pool + pre_ping | OK | Index appointments |
| Frontend | Client cache | — | OK | SWR/React Query |
| Docker | Healthchecks | Healthy deps | Optional limits | All app services |

This audit should be re-run after major changes or before production load tests.

---

## Implemented (Post-Audit)

The following high-impact changes have been applied in the codebase:

1. **DB (packages/db):** `pool_size`, `max_overflow`, `pool_pre_ping`, `pool_recycle` with env overrides (`DB_POOL_SIZE`, `DB_MAX_OVERFLOW`, `DB_POOL_RECYCLE`).
2. **Orchestration:** In-memory response cache capped with `CACHE_MAX_ENTRIES` (default 1000) and TTL; eviction of oldest/expired on set.
3. **LLM Router:** Shared `httpx.AsyncClient` in app state for RAG embed and telemetry; closed on shutdown.
4. **Agent Runtime:** Shared `httpx.AsyncClient` in lifespan for RAG and execution-engine calls.
5. **Streaming Voice:** Shared `httpx.AsyncClient` in lifespan for orchestration pipeline calls.
6. **Docker:** Healthchecks added for api-gateway (Node http), orchestration-engine, llm-router, agent-runtime, rag-service, safety-guardrails, streaming-voice, execution-engine, observability-core. Gateway and streaming-voice use `depends_on: condition: service_healthy` for their backends; llm-router and agent-runtime wait for rag-service healthy.
7. **DB index:** Composite index `ix_appointments_patient_status_start` on `(patient_id, status, start_time)` for execution-engine appointment queries.
8. **WebSocket streaming (voice):** Gateway WS proxy buffers client messages until upstream is open (no message loss); handshake timeout 10s. Voice WebSocket now uses orchestration **streaming pipeline** (`/api/v1/pipelines/stream`): status + LLM token stream (`text_delta`) + done; REST `/api/v1/voice/process` unchanged (full pipeline response in parallel).
9. **LLM streaming:** OpenAI/LM Studio client and LLM router support `generate_stream`; `POST /api/v1/generate/stream` returns NDJSON (`delta`/`done`). Orchestration `POST /api/v1/pipelines/stream` returns NDJSON (`status`, `text_delta`, `done`) for razor-sharp voice WebSocket UX.

## Remaining Recommendations (Short List)

- **Gateway:** Stream proxy for **REST** pipeline/LLM responses (e.g. `POST /api/v1/orchestration/pipelines`) so browser can consume NDJSON or SSE without buffering full body (optional; voice WS already streams).
- **Frontend:** Add SWR or React Query for list/read endpoints (tenants, patients, config) for snappier UX.
- **Optional:** Redis-backed response cache in orchestration when `REDIS_URL` is set for multi-replica cache sharing.
- **Optional:** Resource limits in docker-compose or K8s for production.

---

## Verification, Security & Sanity Checks

### Run / Debug / Verify

1. **Kill:** `./scripts/kill-stack.sh` — frees ports 3000, 3100, 3300, 3400, 8001–8008.
2. **Run:** `./scripts/run-stack.sh` — needs Postgres (and optionally Redis). Start infra with `cd infra/docker && docker compose up -d postgres redis`, then `pnpm db:seed`, then run-stack.
3. **E2E:** `./scripts/e2e-check.sh` — hits gateway health, admin routes (proxied to orchestration), observe, voice health, and pipeline. Requires DB seeded (e.g. `GET /api/v1/admin/patients/1` expects at least one patient).
4. **Tests:** `pnpm test` (Turbo); api-gateway uses Vitest with `passWithNoTests: true`. Python apps: `pytest` in each app dir (some have no tests yet).

### Security & Vulnerabilities

| Area | Status | Notes |
|------|--------|--------|
| **SQL injection** | OK | Queries use SQLAlchemy `select()` / parameterized `text(…).bindparams()`; no raw user input in SQL. |
| **Admin routes** | Risk | `/api/v1/admin/*` are **unauthenticated** (auth plugin is a no-op placeholder). For production, add JWT/API-key/session auth and enforce on admin routes. |
| **CORS** | Dev-only | `CORS_ORIGIN` defaults to `*`. Set `CORS_ORIGIN` to allowed origins in production. |
| **Rate limit** | OK | 200 req/min per tenant/IP at gateway. |
| **Secrets** | OK | No hardcoded API keys in repo; use env (e.g. `OPENAI_API_KEY`, `JWT_SECRET`). |
| **Proxy timeouts** | OK | Proxy and admin proxy use `AbortSignal.timeout()`; pipeline/LLM get 180s/15s as appropriate. |

### Optimization Gaps (quick reference)

- Gateway: REST pipeline/LLM responses still buffered (streaming only on voice WS).
- Frontend: No client-side cache (SWR/React Query) for list/read APIs.
- Optional: Redis cache for orchestration when multi-replica; resource limits in Docker/K8s.
