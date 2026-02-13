# AURIXA

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python)](https://www.python.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js)](https://nodejs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Fastify](https://img.shields.io/badge/Fastify-4.x-000000?logo=fastify)](https://www.fastify.io/)
[![Next.js](https://img.shields.io/badge/Next.js-14+-000000?logo=next.js)](https://nextjs.org/)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-Ready-326CE5?logo=kubernetes)](https://kubernetes.io/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

> **Real-time conversational AI orchestration platform** — Multi-tenant, modular, horizontally scalable infrastructure for building sophisticated conversational experiences.

---

## Architecture

<details open>
<summary><b>System Diagram</b></summary>

```
                    ┌─────────────────┐
                    │   API Gateway   │ ← Fastify, rate limiting, auth, WS proxy
                    │     :3000       │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
    ┌─────────▼──┐  ┌───────▼───┐  ┌───────▼──────┐
    │Orchestration│  │ Streaming │  │ Observability│
    │  Engine    │  │   Voice   │  │    Core      │
    │   :8001    │  │   :8006   │  │    :8008     │
    └─────┬──────┘  └───────────┘  └──────────────┘
          │
    ┌─────┼──────────────┬──────────────┐
    │     │              │              │
┌───▼──┐ ┌▼────────┐ ┌──▼───┐ ┌───────▼──┐
│ LLM  │ │  Agent  │ │ RAG  │ │  Safety  │
│Router│ │ Runtime │ │Svc   │ │Guardrails│
│:8002 │ │  :8003  │ │:8004 │ │  :8005   │
└──────┘ └─────────┘ └──────┘ └──────────┘
                                    │
                          ┌─────────▼─────────┐
                          │ Execution Engine   │
                          │      :8007         │
                          └────────────────────┘
```

</details>

---

## Monorepo Structure

<details open>
<summary><b>Directory Layout</b></summary>

```
aurixa/
├── apps/                          Independently deployable services
│   ├── api-gateway/               TS/Fastify — routing, auth, rate limiting, WS proxy
│   ├── orchestration-engine/      Python/FastAPI — conversation state machine, pipeline execution
│   ├── llm-router/                Python/FastAPI — intent classification, cost-aware LLM routing
│   ├── agent-runtime/             Python/FastAPI — tool calling, multi-step planning, state memory
│   ├── rag-service/               Python/FastAPI — hybrid retrieval, reranking, context compression
│   ├── safety-guardrails/         Python/FastAPI — risk classification, policy filters, escalation
│   ├── streaming-voice/           Python/FastAPI — duplex audio, ASR, partial transcripts
│   ├── execution-engine/          Python/FastAPI — external API execution, retry, idempotency
│   └── observability-core/        Python/FastAPI — metrics aggregation, latency, cost tracking
│
├── packages/                      Shared libraries
│   ├── config/                    Environment loading, Zod validation, service registry
│   ├── logging/                   Pino (TS) + Loguru (Python), structured JSON, correlation IDs
│   ├── auth/                      JWT validation, API key auth, tenant context, RBAC
│   ├── telemetry/                 OpenTelemetry tracing, span helpers, OTLP export
│   ├── llm-clients/               Pluggable LLM abstraction (OpenAI, Claude, Gemini, local)
│   └── ui-kit/                    React components, Tailwind preset, Framer Motion animations
│
├── frontend/                      User-facing interfaces
│   ├── dashboard/                 Next.js — conversation playground, analytics, pipeline viz
│   └── admin-console/             Next.js — tenant management, service health, audit logs
│
└── infra/                         Infrastructure as Code
    ├── docker/                    docker-compose for local dev
    ├── k8s/                       Kubernetes manifests
    └── terraform/                 AWS infrastructure (VPC, EKS, RDS, ElastiCache)
```

</details>

---

## Service Responsibilities

| Service | Port | Language | Purpose |
|---------|:----:|:--------:|---------|
| **api-gateway** | `3000` | TypeScript | Ingress routing, auth, rate limiting, WebSocket proxy |
| **orchestration-engine** | `8001` | Python | Conversation pipeline execution, state management |
| **llm-router** | `8002` | Python | Intent classification, BERT + FAISS, cost-aware routing |
| **agent-runtime** | `8003` | Python | Tool calling, multi-step planning, async execution |
| **rag-service** | `8004` | Python | BM25 + vector retrieval, reranking, source attribution |
| **safety-guardrails** | `8005` | Python | Risk classification, policy filters, response validation |
| **streaming-voice** | `8006` | Python | Duplex audio streaming, ASR hooks, barge-in detection |
| **execution-engine** | `8007` | Python | External API calls, retry logic, idempotency, scheduling |
| **observability-core** | `8008` | Python | Metrics aggregation, cost analysis, performance reports |

---

## LLM Plugin System

Pluggable provider abstraction at `packages/llm-clients/`. Every provider implements the standard interface:

```python
class LLMClient(ABC):
    async def generate(self, request: LLMRequest) -> LLMResponse: ...
    async def health_check(self) -> bool: ...
    def estimate_cost(self, prompt_tokens: int, completion_tokens: int) -> float: ...
```

### Supported Providers

| Provider | Models |
|----------|--------|
| **OpenAI** | GPT-4o, GPT-4 Turbo, o1, o3-mini |
| **Anthropic** | Claude Opus, Sonnet, Haiku |
| **Google Gemini** | 2.0 Flash, 1.5 Pro, 1.5 Flash |
| **Local** | Any OpenAI-compatible endpoint (LM Studio, Ollama, vLLM) |

> The `LLMRouter` auto-detects configured providers from environment variables and builds a fallback chain. **Providers are hot-swappable at runtime.**

---

## Quick Start

### Prerequisites
- **Node.js** 20+
- **pnpm** 9+
- **Python** 3.11+
- **uv** (recommended)

### Installation

```bash
# Clone repository
git clone <repo-url> aurixa && cd aurixa

# Setup environment
cp .env.example .env

# Install dependencies
pnpm install
```

### Running Services

**TypeScript service:**
```bash
cd apps/api-gateway && pnpm dev
```

**Python service:**
```bash
cd apps/rag-service && uvicorn rag_service.main:app --reload
```

**Full stack (Docker):**
```bash
cd infra/docker && docker-compose up -d
```

---

## Observability

### Structured Logging

Every service emits **structured JSON logs** with:
- Request correlation IDs (`x-request-id` header propagation)
- Service-level tags
- Latency measurements
- Error stack capture

Configuration: `packages/telemetry/`

### Distributed Tracing

OpenTelemetry tracing with span propagation across service boundaries via HTTP headers. All services report:

- **Per-service latency** (p50, p95, p99)
- **LLM cost** per provider and model
- **Token consumption** rates
- **Intent classification** accuracy
- **Error rate** heatmaps

> Aggregated in the **observability-core** service.

---

## Deployment

### Local Development
Docker Compose boots the full stack including Postgres and Redis.
```bash
cd infra/docker && docker-compose up
```

### Kubernetes
Manifests in `infra/k8s/` with:
- Health checks (liveness & readiness probes on `/health`)
- Resource limits and requests
- Ingress configuration

### Cloud (AWS)
Terraform modules in `infra/terraform/` provision:
- **VPC** with public/private subnets
- **EKS** cluster
- **RDS** PostgreSQL
- **ElastiCache** Redis

---

## Scaling Philosophy

### Horizontal First
Every service is **stateless** and independently scalable. State lives in Postgres, Redis, or vector stores.

### Async Everywhere
- All Python services use **async FastAPI**
- All TypeScript services use **async Fastify**
- No blocking I/O in the request path

### Cost-Aware Routing
The LLM router considers:
- Model pricing
- Latency
- Availability

Simple queries → cheaper models. Complex reasoning → premium models.

### Graceful Degradation
- RAG service slow? → Fall back to direct LLM generation
- Provider down? → Fail over to the next one
- Service unhealthy? → Shed load and retry

### Observability-Driven
Every service reports:
- Boot time
- Memory footprint
- Connection status

Runtime metrics drive scaling decisions.

---

## Tech Stack

| Layer | Technology |
|-------|----------|
| **Monorepo** | Turborepo + pnpm workspaces |
| **API Gateway** | Fastify 5, Pino |
| **Microservices** | FastAPI, Loguru, Pydantic |
| **LLM SDKs** | OpenAI, Anthropic, Google AI |
| **Vector Search** | FAISS (swappable to Pinecone/Qdrant) |
| **Frontend** | Next.js 15, Tailwind, Framer Motion |
| **Infrastructure** | Docker, Kubernetes, Terraform |
| **Observability** | OpenTelemetry, OTLP |
| **Databases** | PostgreSQL 16, Redis 7 |

---

## License

MIT License — See [LICENSE](LICENSE) for details
