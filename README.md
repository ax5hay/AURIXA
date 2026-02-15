# AURIXA

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Fastify](https://img.shields.io/badge/Fastify-5.x-000000?logo=fastify&logoColor=white)](https://www.fastify.io/)
[![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![turborepo](https://img.shields.io/badge/monorepo-turborepo-EF4444?logo=turborepo&logoColor=white)](https://turbo.build/)


> **Enterprise-grade conversational AI orchestration platform** — Multi-tenant, modular, horizontally scalable microservices infrastructure for building sophisticated real-time conversational experiences with cost-aware LLM routing and integrated safety guardrails.

<p align="center">
  <a href="#quick-start">Quick Start</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#services">Services</a> •
  <a href="#development">Development</a> •
  <a href="#deployment">Deployment</a>
</p>

---

## Architecture

The AURIXA platform follows a **microservices-first** architecture with clear separation of concerns. All services are **stateless** and communicate asynchronously through the API Gateway, enabling independent scaling and deployment.

<details open>
<summary><b>System Architecture Diagram</b></summary>

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CLIENT APPLICATIONS                              │
│                                                                              │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐   │
│  │     Dashboard (Unified Admin)    │  │  Patient Portal                 │   │
│  │        (Next.js 15)              │  │     (Next.js 15)                 │   │
│  │        Port 3100                 │  │     Port 3300                   │   │
│  └─────────────────────────────────┘  └─────────────────────────────────┘   │
│                                  ▲                                           │
└──────────────────────────────────┼───────────────────────────────────────────┘
                                   │ HTTPS / WebSocket
┌──────────────────────────────────┼───────────────────────────────────────────┐
│                                  │                                           │
│                    ┌─────────────▼─────────────┐                            │
│                    │    API GATEWAY            │                            │
│                    │  Fastify 5 + Plugins      │                            │
│                    │  • Rate Limiting          │                            │
│                    │  • CORS & Security        │                            │
│                    │  • WebSocket Proxy        │                            │
│                    │  • Request Logging        │                            │
│                    │     Port 3000             │                            │
│                    └────────────┬──────────────┘                            │
│                                 │                                           │
│     ┌───────────────────────────┼───────────────────────────────┐          │
│     │                           │                               │          │
│ ┌───▼────────────┐   ┌──────────▼──────────┐   ┌───────────────▼────┐     │
│ │    REQUEST     │   │   ORCHESTRATION     │   │   OBSERVABILITY    │     │
│ │   ROUTING      │   │      ENGINE         │   │       CORE         │     │
│ │   & PROXYING   │   │   (FastAPI)         │   │    (FastAPI)       │     │
│ │                │   │   • State Mgmt      │   │   • Metrics        │     │
│ │                │   │   • Pipeline Exec   │   │   • Analytics      │     │
│ │                │   │   Port 8001         │   │   Port 8008        │     │
│ └────────────────┘   └──────────┬──────────┘   └────────────────────┘     │
│                                  │                                          │
│     ┌────────────────────────────┼────────────────────────────┐           │
│     │                            │                            │           │
│ ┌───▼──────┐  ┌──────────┐ ┌────▼─────┐ ┌──────────┐ ┌──────▼───┐       │
│ │ LLM      │  │  AGENT   │ │   RAG    │ │ SAFETY   │ │STREAMING │       │
│ │ ROUTER   │  │ RUNTIME  │ │ SERVICE  │ │GUARDRAILS│ │  VOICE   │       │
│ │(FastAPI) │  │(FastAPI) │ │(FastAPI) │ │(FastAPI) │ │(FastAPI) │       │
│ │• Routing │  │• Tools   │ │• Retrieval           │ │• Audio   │       │
│ │• Cost-Aware • Planning  │ │• Reranking           │ │• ASR     │       │
│ │Port 8002 │  │Port 8003 │ │Port 8004 │ │Port 8005 │ │Port 8006 │       │
│ └──────────┘  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│                      │                                                     │
│                 ┌────▼─────────┐                                           │
│                 │   EXECUTION  │                                           │
│                 │   ENGINE     │                                           │
│                 │  (FastAPI)   │                                           │
│                 │  Port 8007   │                                           │
│                 └──────────────┘                                           │
└───────────────────────────────────────────────────────────────────────────┘
                         │
        ┌────────────────┴────────────────┐
        │                                 │
    ┌───▼───────┐               ┌────────▼────┐
    │PostgreSQL │               │    Redis    │
    │ Database  │               │    Cache    │
    │ Port 5432 │               │ Port 6379   │
    └───────────┘               └─────────────┘
```

</details>

---

## Features & Capabilities

### Pipeline Flow (E2E)

```
User → API Gateway (:3000)
  ↓
Orchestration Engine (:8001)
  ├─ 1. Intent → LLM Router (:8002) — semantic + keyword routing, model selection
  ├─ 2. Agent path (if appointment/insurance/search) → Agent Runtime (:8003)
  │      └─ Execution Engine (:8007) — get_appointments, check_insurance, etc. (DB-backed)
  ├─ 3. RAG path (else) → RAG Service (:8004) — hybrid BM25 + vector retrieval
  │      └─ LLM Router — generate response
  ├─ 4. Safety Guardrails (:8005) — validate, emergency escalation
  └─ 5. Response → User
```

- **Response caching**: Repeated prompts cached (TTL 300s) for cost reduction
- **Emergency escalation**: Safety detects clinical keywords (chest pain, stroke) and flags `requires_escalation`
- **Telemetry**: Orchestration, LLM Router, RAG emit to Observability Core

### Execution Engine (DB-Backed)

| Action | Description |
|--------|-------------|
| `get_appointments` | List upcoming appointments for a patient |
| `create_appointment` | Create appointment (patient, date, reason) |
| `check_insurance` | Verify insurance coverage and copay |
| `get_availability` | List available slots by date |
| `request_prescription_refill` | Submit refill for active prescriptions |

### Database Schema

- **Patients**, **Appointments** (with reason), **Tenants**, **Conversations**
- **PatientInsurance** — plan, payer, copay, status
- **Prescription** — medication, status, refill_requested_at
- **AvailabilitySlot** — date, time, provider for scheduling
- **KnowledgeBaseArticle** — RAG documents per tenant

### Admin API (DB Writes)

| Endpoint | Method | Description |
|----------|--------|--------------|
| `/api/v1/admin/tenants` | POST | Create tenant |
| `/api/v1/admin/patients` | POST | Create patient |

The Tenants page uses Add Tenant to create new organizations. Execution Engine handles appointment creation and prescription refill requests.

### Playground (Dashboard)

The **Playground** at http://localhost:3100/playground provides:

- **Service Health & Metrics** — Live health status and latency for all 8 services; telemetry (conversations, tenants, patients, event counts, avg latency); auto-loads on open
- **Run All Tests** — One-click verification of all services; shows pass/fail and latency per test
- **Full pipeline test** — Run E2E with patient context and sample prompts
- **Service API tests** — Route, RAG, Safety, Agent, Execution, Knowledge Articles, LLM Providers, LLM Models, Audit Log, Service Health
- **Test results table** — Last 20 test runs with status, latency (ms), and errors
- **Execution actions** — get_appointments, check_insurance, get_availability, create_appointment (DB write), request_prescription_refill (DB write)
- **Flow visualization** — Intent → RAG/Agent → Generate → Safety steps

---

## Monorepo Structure

AURIXA uses **Turborepo** with **pnpm workspaces** for efficient dependency management and parallel task execution across all packages and services.

<details open>
<summary><b>Complete Directory Layout</b></summary>

```
aurixa/
├── apps/                          Independently deployable microservices
│   ├── api-gateway/               TypeScript/Fastify (Port 3000)
│   │   ├── src/
│   │   │   ├── index.ts           App initialization & service registry
│   │   │   ├── config.ts          Service endpoints configuration
│   │   │   ├── middleware/        Request logging, error handling
│   │   │   ├── routes/
│   │   │   │   ├── health.ts      Health check endpoints
│   │   │   │   ├── proxy.ts       Service routing & proxying
│   │   │   │   ├── websocket.ts   WebSocket connections
│   │   │   │   └── admin.ts       Admin endpoints
│   │   │   └── plugins/           Fastify plugin integrations
│   │   └── package.json
│   │
│   ├── orchestration-engine/      Python/FastAPI (Port 8001)
│   │   ├── src/orchestration_engine/
│   │   │   ├── main.py            Server initialization & lifecycle
│   │   │   ├── models.py          Pydantic request/response schemas
│   │   │   ├── config.py          Environment configuration
│   │   │   └── clients.py         Client service calls
│   │   └── pyproject.toml
│   │
│   ├── llm-router/                Python/FastAPI (Port 8002)
│   │   ├── src/llm_router/
│   │   │   ├── main.py            Routing logic & provider selection
│   │   │   ├── models.py          Pydantic schemas
│   │   │   └── config.py          Configuration & routing rules
│   │   └── pyproject.toml
│   │
│   ├── agent-runtime/             Python/FastAPI (Port 8003)
│   ├── rag-service/               Python/FastAPI (Port 8004)
│   ├── safety-guardrails/         Python/FastAPI (Port 8005)
│   ├── streaming-voice/           Python/FastAPI (Port 8006)
│   ├── execution-engine/          Python/FastAPI (Port 8007)
│   └── observability-core/        Python/FastAPI (Port 8008)
│
├── packages/                      Shared libraries & utilities
│   ├── llm-clients/               AI provider abstraction layer
│   │   ├── src/aurixa_llm/
│   │   │   ├── base.py            Abstract LLM client interface
│   │   │   ├── types.py           Shared type definitions
│   │   │   ├── router.py          Multi-provider router
│   │   │   ├── openai_client.py   OpenAI integration
│   │   │   ├── anthropic_client.py Anthropic integration
│   │   │   └── gemini_client.py   Google Gemini integration
│   │   └── pyproject.toml
│   │
│   ├── db/                        Database layer
│   │   ├── src/aurixa_db/
│   │   │   ├── models.py          SQLAlchemy ORM models
│   │   │   └── database.py        Database engine & session
│   │   ├── seed.py                Database seeding script
│   │   └── pyproject.toml
│   │
│   ├── auth/                      Authentication & authorization
│   │   ├── src/
│   │   │   ├── index.ts           JWT & API key validation
│   │   │   └── python_auth.py     Python auth utilities
│   │   └── package.json
│   │
│   ├── config/                    Configuration management
│   │   ├── src/
│   │   │   └── index.ts           Env loading, validation, secrets
│   │   └── package.json
│   │
│   ├── logging/                   Structured logging
│   │   ├── src/
│   │   │   └── index.ts           Pino logger setup (TS)
│   │   ├── python_logger.py       Loguru logger setup (Python)
│   │   └── package.json
│   │
│   ├── telemetry/                 Observability & tracing
│   │   ├── src/
│   │   │   └── index.ts           OpenTelemetry setup
│   │   └── package.json
│   │
│   └── ui-kit/                    React components & styles
│       ├── src/
│       │   └── components/        Reusable React components
│       ├── tailwind.preset.js     Shared Tailwind config
│       └── package.json
│
├── frontend/                      User-facing applications
│   ├── dashboard/                 Unified admin: analytics, playground, tenants, services, audit, configuration (Next.js 15, Port 3100)
│   ├── patient-portal/            Patient interface (Next.js 15, Port 3300)
│   └── hospital-portal/           Hospital staff interface (Next.js 15, Port 3400)
│
├── infra/                         Infrastructure as Code
│   ├── docker/                    Docker Compose (local development)
│   │   └── docker-compose.yml     Full stack orchestration
│   ├── k8s/                       Kubernetes manifests
│   │   ├── namespace.yaml
│   │   ├── api-gateway.yaml
│   │   └── python-service-template.yaml
│   └── terraform/                 AWS infrastructure
│       ├── main.tf                VPC, EKS, RDS, ElastiCache
│       ├── variables.tf
│       └── outputs.tf
│
├── .env.example                   Example environment configuration
├── package.json                   Root workspace configuration
├── pnpm-workspace.yaml            Workspace definitions
├── pnpm-lock.yaml                 Locked dependency versions
├── tsconfig.base.json             Root TypeScript configuration
├── turbo.json                     Turborepo configuration
└── README.md                      This file
```

</details>

---

## Service Architecture & Responsibilities

| Service | Port | Language | Key Features |
|---------|:----:|:--------:|----------|
| **API Gateway** | `3000` | TypeScript | Request routing, WebSocket proxy, Rate limiting, CORS, Security headers |
| **Orchestration Engine** | `8001` | Python | Conversation state management, Pipeline orchestration, Database persistence |
| **LLM Router** | `8002` | Python | Cost-aware provider routing, FAISS embeddings, Intelligent model selection |
| **Agent Runtime** | `8003` | Python | Tool invocation, Multi-step planning, Function calling, Async execution |
| **RAG Service** | `8004` | Python | Hybrid retrieval (BM25 + vectors), Reranking, Context compression, Source tracking |
| **Safety Guardrails** | `8005` | Python | Risk classification, Policy enforcement, Response filtering, Escalation logic |
| **Streaming Voice** | `8006` | Python | Voice I/O: STT, TTS (OSS first). REST: full response; WebSocket: status + **LLM token stream** + TTS. Orchestration pipeline (and `/pipelines/stream` for WS). |
| **Execution Engine** | `8007` | Python | External API calls, Retry logic, Idempotency, Task scheduling |
| **Observability Core** | `8008` | Python | Telemetry aggregation, Performance reports (`/api/v1/reports/performance`), Metrics, Cost analysis |

---

## LLM Provider Abstraction Layer

The AURIXA platform provides a **pluggable, provider-agnostic LLM abstraction** through the `llm-clients` package. This enables seamless switching between providers without code changes and intelligent cost-aware routing.

<details open>
<summary><b>Provider Integration</b></summary>

### Supported Providers

| Provider | Models | Status | Features |
|----------|--------|:------:|----------|
| **OpenAI** | GPT-4o, GPT-4 Turbo, o1, o3-mini | Active | Tool calling, Vision, Streaming |
| **Anthropic** | Claude 3 Opus, Sonnet, Haiku | Active | Extended context (200K), Native tools |
| **Google Gemini** | 2.0 Flash, 1.5 Pro, 1.5 Flash | Active | Multimodal, Real-time streaming |
| **Local** | Any OpenAI-compatible | Active | LM Studio, Ollama, vLLM |

### Standard LLM Client Interface

```python
from aurixa_llm import LLMClient, LLMRequest, LLMResponse, LLMProvider

# Every provider implements this interface
class LLMClient(ABC):
    async def generate(request: LLMRequest) -> LLMResponse:
        """Generate text with optional tool calling."""
        ...
    
    async def health_check() -> bool:
        """Check provider availability."""
        ...
    
    def estimate_cost(prompt_tokens: int, completion_tokens: int) -> float:
        """Calculate estimated cost for a request."""
        ...
```

### Dynamic Provider Discovery

The LLM Router auto-detects configured providers from environment variables and builds an intelligent fallback chain:

```bash
# .env configuration
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=AIzaSy...
LM_STUDIO_BASE_URL=http://127.0.0.1:1234/v1  # LM Studio (local, cost-free)
```

**Automatic Provider Selection:**
- Detects available providers at startup
- Health checks run continuously
- Cost-aware routing prefers cheaper models for simple queries
- Automatic fallback if primary provider fails
- Hot-swappable at runtime (no restart needed)

</details>

---

## Quick Start

### Prerequisites

**Node.js** 20+ | **pnpm** 9+ | **Python** 3.11+ | **Docker & Docker Compose**

### Installation

```bash
# Clone repository
git clone <repo-url> aurixa && cd aurixa

# Install dependencies (for local dev)
pnpm install

# Setup environment variables
cp .env.example .env
```

### Run the Full Stack via Docker (Recommended)

Run the entire SaaS (Postgres, Redis, all backend services, and frontends) with Docker:

```bash
# From repo root: first time or after code changes (builds all images)
./scripts/docker-up.sh --build

# Subsequent runs (no rebuild)
./scripts/docker-up.sh
```

Or with Docker Compose directly:

```bash
cd infra/docker
docker compose down          # Stop and remove containers (optional)
docker compose up --build -d # Build and start all services in background
```

The stack will:
1. Start Postgres and Redis
2. Run db-seed to populate the database
3. Build and start API Gateway, Orchestration, LLM Router, Agent Runtime, RAG, Safety, Streaming Voice, Execution Engine, Observability Core
4. Build and start Dashboard, Patient Portal, Hospital Portal

**Endpoints after startup:**

| Service            | URL |
|--------------------|-----|
| API Gateway        | http://localhost:3000 |
| Dashboard          | http://localhost:3100 |
| **Playground**     | http://localhost:3100/playground |
| Patient Portal     | http://localhost:3300 |
| Hospital Portal    | http://localhost:3400 |
| Orchestration      | http://localhost:8001 |
| LLM Router         | http://localhost:8002 |
| Agent Runtime      | http://localhost:8003 |
| RAG Service        | http://localhost:8004 |
| Safety Guardrails  | http://localhost:8005 |
| Streaming Voice    | http://localhost:8006 |
| Execution Engine   | http://localhost:8007 |
| Observability Core | http://localhost:8008 |

**Stop the stack:**
```bash
cd infra/docker && docker compose down
```

### Run the Full Stack Locally (Alternative)

Start all services without Docker (Postgres/Redis still via Docker if available):

```bash
./scripts/kill-stack.sh
./scripts/run-stack.sh
```

The script will start Postgres/Redis (Docker), seed the DB, then run API Gateway, all Python services, and the three frontends. If Python services fail, run `./scripts/bootstrap-python.sh` once.

### Verify Installation

```bash
./scripts/e2e-check.sh
```

Or use the **Playground** at http://localhost:3100/playground — click **Run All Tests** to verify services.

Manually:
```bash
curl http://localhost:3000/health
curl http://localhost:8008/health   # Observability Core (telemetry)
curl http://localhost:3100/
curl http://localhost:3300/
curl http://localhost:3400/
```

### Alternative: Individual Services

```bash
# API Gateway
cd apps/api-gateway && pnpm dev

# Orchestration Engine
cd apps/orchestration-engine && uvicorn orchestration_engine.main:app --reload --port 8001
```

### Database Seeding

```bash
# Run manually if needed (run-stack does this automatically)
pnpm db:seed
```

### Frontend Applications

| App             | Port | Purpose                                                       |
|-----------------|------|---------------------------------------------------------------|
| Dashboard       | 3100 | System status, **Playground** (E2E + service tests + metrics), tenants (with Add Tenant), services, analytics, knowledge, config, audit |
| Patient Portal  | 3300 | Patient chat & appointments, help articles, AI assistant      |
| Hospital Portal | 3400 | Staff dashboard (reception, nurses, doctors, schedulers), patients, appointments, scheduling, AI assistant, knowledge base, system status |

- **Playground** (`/playground`): Run All Tests, service health & telemetry, full pipeline, individual services (Route/RAG/Safety/Agent/Execution/Knowledge/LLM/Audit), and DB-backed execution actions including writes (create_appointment, request_prescription_refill)
- **Tenants** (`/tenants`): List tenants; Add Tenant creates new tenants (DB write)
- **Patient Portal — Voice** (`/voice`): Mic or text input; REST-based voice processing (STT → pipeline → optional TTS); user toggle for "Play aloud" (TTS on/off)
- Both apps fetch from API Gateway (port 3000). Telemetry data is provided by Observability Core (port 8008).

---

## Development Workflow

### Project Commands

```bash
# Install all dependencies across workspace
pnpm install

# Development mode for all services
pnpm dev

# Build all TypeScript services
pnpm build

# Run linting across workspace
pnpm lint

# Type checking
pnpm typecheck

# Run tests
pnpm test

# Clean all build artifacts
pnpm clean
```

### Service-Specific Development

**API Gateway (TypeScript):**
```bash
cd apps/api-gateway
pnpm dev            # Hot-reload with tsx
pnpm build          # Compile to JavaScript
pnpm test           # Run tests with Vitest
```

**Orchestration Engine (Python):**
```bash
cd apps/orchestration-engine
uvicorn orchestration_engine.main:app --reload --port 8001
pytest tests/       # Run pytest
```

**LLM Router (Python):**
```bash
cd apps/llm-router
uvicorn llm_router.main:app --reload --port 8002
```

### Database Management

```bash
# Run database migrations (from packages/db)
cd packages/db
python seed.py      # Seed initial data

# Connect to PostgreSQL
psql -h localhost -U aurixa -d aurixa
```

---

## Observability & Monitoring

### Structured Logging

Every service emits **JSON-formatted logs** with automatic correlation:

```json
{
  "timestamp": "2026-02-14T10:30:45.123Z",
  "level": "info",
  "service": "llm-router",
  "correlationId": "req_abc123xyz",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "LLM call completed",
  "duration_ms": 245,
  "tokens_used": { "prompt": 150, "completion": 45 },
  "cost_usd": 0.0075,
  "model": "gpt-4o",
  "provider": "openai"
}
```

**Log Levels:** `debug` | `info` | `warning` | `error` | `critical`

**Access logs with correlation:**
```bash
# Filter logs by request ID
docker-compose logs | grep "550e8400-e29b-41d4-a716-446655440000"

# Follow service logs
docker-compose logs -f orchestration-engine
```

### Performance Metrics & Telemetry

The **Observability Core** service (port 8008) collects and aggregates telemetry:

- **Health:** `GET http://localhost:8008/health` — returns service status and event count
- **Performance report:** `GET http://localhost:8008/api/v1/reports/performance` — overall and per-service metrics (latency, cost, counts)
- **Submit events:** `POST http://localhost:8008/api/v1/telemetry` — services send events for aggregation
- **Latency percentiles:** p50, p95, p99 (per service)
- **LLM costs:** Breakdown by provider and model
- **Error rates:** Percentage of failed requests

Ensure the observability-core container is running (`docker compose ps`); if it exits, check logs and rebuild (it requires `numpy` in its dependencies).

### Health Check Endpoints

All services expose `/health` endpoints:

```bash
curl http://localhost:8001/health

# Response:
{
  "service": "orchestration-engine",
  "status": "healthy",
  "database": "connected",
  "redis": "connected",
  "uptime_seconds": 3600,
  "memory_mb": 124.5
}
```



---

## CI/CD Pipeline

AURIXA uses **GitHub Actions** for continuous integration and deployment. All workflows are defined in `.github/workflows/`.

### Workflows Overview

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| **Docker Build** | Push/PR to main/develop | Builds Docker images for all services |
| **Docker Build & Push** | Push to main or tags | Builds and pushes to registries (GHCR, Docker Hub) |
| **Tests** | Push/PR | Runs TypeScript and Python test suites |
| **Lint & Security** | Push/PR | ESLint, type checking, SAST scanning, dependency checks |

### Docker Build Workflow

Automatically builds Docker images for all services when code is pushed:

```yaml
# Triggered on:
# - Push to main/develop branches
# - Pull requests to main/develop
# - Changes to apps/, packages/, or infra/docker/

# Builds images for:
# - api-gateway
# - orchestration-engine
# - llm-router
# - agent-runtime
# - rag-service
# - safety-guardrails
# - streaming-voice
# - execution-engine
# - observability-core
```

**Output:** Images are cached in GitHub Container Registry for faster builds.

### Docker Build & Push Workflow

Builds and pushes Docker images to registries:

```bash
# GitHub Container Registry
ghcr.io/${{ owner }}/aurixa-api-gateway:latest
ghcr.io/${{ owner }}/aurixa-api-gateway:v1.0.0

# Docker Hub (if configured)
docker.io/${{ owner }}/aurixa-api-gateway:latest
docker.io/${{ owner }}/aurixa-api-gateway:v1.0.0
```

**Configuration:**
Add GitHub secrets for Docker Hub (optional):
- `DOCKERHUB_USERNAME` - Your Docker Hub username
- `DOCKERHUB_TOKEN` - Your Docker Hub token

### Test Workflow

Runs automated tests across all services:

**TypeScript Services:**
- ESLint
- Type checking (TypeScript compiler)
- Unit tests (Vitest)

**Python Services:**
- Type checking (Pyright)
- Unit tests (pytest)

### Lint & Security Workflow

Performs code quality and security checks:

- **ESLint** - JavaScript/TypeScript linting
- **Prettier** - Code formatting checks
- **Trivy** - Container and filesystem vulnerability scanning
- **Safety** - Python dependency vulnerability checking
- **pnpm audit** - Node.js dependency checking
- **Markdown Lint** - Documentation quality

### Local Testing

Test workflows locally before pushing:

```bash
# Run all tests
pnpm test

# Run linting
pnpm lint

# Format code
pnpm prettier --write .

# Type check
pnpm typecheck
```

### Setting Up Registries

**GitHub Container Registry (automatic):**
- Uses `GITHUB_TOKEN` - no additional setup needed

**Docker Hub (optional):**
```bash
# Create GitHub secrets
gh secret set DOCKERHUB_USERNAME --body "your_docker_username"
gh secret set DOCKERHUB_TOKEN --body "your_docker_token"
```

### Deployment from Images

**Pull and run images:**
```bash
# From GHCR
docker pull ghcr.io/${{ owner }}/aurixa-api-gateway:latest
docker run -p 3000:3000 ghcr.io/${{ owner }}/aurixa-api-gateway:latest

# From Docker Hub
docker pull docker.io/${{ owner }}/aurixa-api-gateway:latest
docker run -p 3000:3000 docker.io/${{ owner }}/aurixa-api-gateway:latest
```

**Using in docker-compose:**
```yaml
services:
  api-gateway:
    image: ghcr.io/your-org/aurixa-api-gateway:latest
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
```

---

## Deployment

### Local Development (Docker Compose)

Full-stack deployment with all services, databases, and caches. Compose file is in `infra/docker/`; build context is the **monorepo root** (parent of `infra/`).

```bash
cd infra/docker
docker compose up --build -d   # Build and start all (first time or after changes)
# or
docker compose up -d            # Start existing images only

# Verify all services
docker compose ps -a

# Check service logs
docker compose logs -f api-gateway
docker compose logs observability-core   # Telemetry service

# Stop all services
docker compose down
```

**Services started:**
- PostgreSQL 16 (localhost:5432), Redis 7 (localhost:6379)
- db-seed (one-off, then exits)
- API Gateway (3000), Orchestration (8001), LLM Router (8002), Agent Runtime (8003), RAG (8004), Safety (8005), Streaming Voice (8006), Execution Engine (8007), Observability Core (8008)
- Dashboard (3100), Patient Portal (3300), Hospital Portal (3400)

### Docker Images

Each service has a `Dockerfile` in its app directory. Images are built with **monorepo root** as build context so shared packages (`packages/db`, `packages/llm-clients`, etc.) are available.

**Build all images:**
```bash
cd infra/docker
docker compose build
```

**Build a single service:**
```bash
docker build -f apps/api-gateway/Dockerfile -t aurixa/api-gateway:latest .
# Run from repo root so context includes package.json, packages/, apps/
```

### Kubernetes Deployment

Manifests available in `infra/k8s/`:

```bash
# Create namespace
kubectl apply -f infra/k8s/namespace.yaml

# Deploy services
kubectl apply -f infra/k8s/api-gateway.yaml
kubectl apply -f infra/k8s/python-service-template.yaml

# Check deployment status
kubectl get pods -n aurixa
kubectl logs -n aurixa deployment/api-gateway

# View service endpoint
kubectl get svc -n aurixa
```

**Kubernetes features:**
- Health check probes (liveness & readiness)
- Auto-scaling policies
- Service discovery
- Network policies
- Persistent volumes for PostgreSQL

### Cloud Deployment (AWS/Terraform)

Infrastructure as Code templates in `infra/terraform/`:

```bash
# Initialize Terraform
cd infra/terraform
terraform init

# Review planned changes
terraform plan

# Apply infrastructure
terraform apply

# Outputs include RDS endpoint, EKS cluster, etc.
terraform output
```

**Provisions:**
- VPC with public/private subnets
- EKS Kubernetes cluster (3 nodes)
- RDS PostgreSQL 16 database
- ElastiCache Redis cluster
- Application Load Balancer
- Auto-scaling groups

---

## Architecture Principles

### 1. **Stateless Services**
All microservices are **stateless** and horizontally scalable. Persistent state is stored in PostgreSQL or Redis.

```python
# Good: State in database
conversation = await db.get_conversation(id)
conversation.status = "completed"
await db.save(conversation)

# Bad: State in memory
conversation_cache = {}  # Lost on restart!
```

### 2. **Asynchronous Processing**
Every service uses async/await patterns to handle concurrent requests without blocking:

```typescript
// API Gateway uses async Fastify
app.get('/api/v1/*', async (request, reply) => {
  const response = await httpClient.get(url);
  return response;
});

# Python services use async FastAPI
@app.post('/api/v1/generate')
async def generate(request: GenerateRequest):
    result = await llm_router.generate(request)
    return result
```

### 3. **Cost-Aware Routing**
The LLM Router intelligently selects providers based on:
- **Cost** - Prefers cheaper models when possible
- **Latency** - Considers response time SLAs
- **Availability** - Falls back to alternative providers
- **Complexity** - Routes complex tasks to capable models

### 4. **Graceful Degradation**
Services fail gracefully with sensible fallbacks:

```python
# RAG Service fallback
try:
    results = await vector_search(query)
except TimeoutError:
    results = await bm25_fallback(query)

# LLM Router fallback
try:
    response = await openai_client.generate(request)
except Exception:
    response = await anthropic_client.generate(request)  # Next in chain
```

### 5. **Observability-Driven Operations**
Every service reports metrics that drive scaling and optimization:

```python
# Telemetry example
@app.post('/api/v1/pipeline/execute')
async def execute_pipeline(request: PipelineRequest):
    start = time.time()
    
    result = await orchestration.execute(request)
    
    # Report metrics
    duration_ms = (time.time() - start) * 1000
    observability.record_metric(
        name='pipeline_execution',
        duration_ms=duration_ms,
        status='success',
        steps=len(request.steps)
    )
    
    return result
```

---

## Security

### Authentication & Authorization

**API Gateway:**
- JWT token validation
- API key authentication
- Tenant isolation via headers
- Rate limiting (200 req/min per tenant)

**Services:**
- Inter-service communication with service accounts
- Request signing for critical operations
- CORS policies enforced

### Data Protection

- **In Transit:** TLS 1.3 for all network communication
- **At Rest:** PostgreSQL encryption, Redis password protection
- **Secrets:** Environment variables for sensitive data
- **Audit:** All API calls logged with correlation IDs

### Compliance

- Multi-tenant isolation
- Full request/response logging
- Audit trail for all data access
- Safety guardrails service for compliance checking

---

## API Examples

### Generate LLM Response

```bash
curl -X POST http://localhost:3000/api/v1/generate \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: tenant-123" \
  -d '{
    "messages": [
      {"role": "user", "content": "What is AURIXA?"}
    ],
    "model": "gpt-4o",
    "temperature": 0.7,
    "max_tokens": 500
  }'
```

### Execute Orchestration Pipeline

```bash
curl -X POST http://localhost:3000/api/v1/orchestration/pipelines \
  -H "Content-Type: application/json" \
  -d '{"prompt": "What is AURIXA?"}'
```

### WebSocket Connection

```javascript
const ws = new WebSocket('ws://localhost:3000/ws/conversations/conv-456');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
};

ws.send(JSON.stringify({
  type: 'message',
  content: 'Hello, assistant!'
}));
```

---

## Testing

### End-to-end (stack running)

With the full stack and DB seeded:

```bash
./scripts/e2e-check.sh          # Gateway, admin, pipeline, health
./scripts/e2e-detailed.sh       # All services health, proxy routes, pipeline stream, voice, LLM
```

### Run All Tests

```bash
# TypeScript services (Vitest)
pnpm test

# Python services (pytest)
cd apps/orchestration-engine && pytest
cd apps/llm-router && pytest
```

### Coverage Reports

```bash
# Generate coverage for entire workspace
pnpm test -- --coverage

# View HTML report
open coverage/index.html
```

---

## Documentation

- [Streaming Service & End-User Flows](./docs/STREAMING_AND_END_USER_FLOWS.md) — Streaming-voice (REST + WebSocket with **LLM token streaming** over WS), channel layer, and full layman flows for AURIXA admin, patient, and hospital tenants
- [End-User Flow & Telephony](./docs/END_USER_FLOW_AND_TELEPHONY.md) — Webchat, WebSocket voice, REST voice, STT/TTS providers (OSS first), telephony integration points
- [Performance Report](./performance_report.md) — System metrics and benchmarks
- [Architecture Audit](./docs/ARCHITECTURE_AUDIT.md) — Architecture review
- [Feature Gap Analysis](./docs/FEATURE_GAP_ANALYSIS.md) — Capability gaps and roadmap
- [API Reference](./docs/api/) — Endpoint documentation (if present)
- Deployment: see [Quick Start](#quick-start) and [Deployment](#deployment) above

---

## Contributing

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feat/amazing-feature`
3. **Commit** changes: `git commit -m 'feat: add amazing feature'`
4. **Push** to branch: `git push origin feat/amazing-feature`
5. **Open** a Pull Request

### Code Style

- **TypeScript:** ESLint + Prettier
- **Python:** Black formatter, isort imports
- **Commits:** Conventional Commits format

```bash
# Run linting
pnpm lint

# Format code
pnpm prettier --write .
```

---

## Performance

Current performance metrics (simulated, 24-hour period):

| Metric | Value |
|--------|-------|
| **Overall Pipeline Latency (p95)** | 240ms |
| **Average LLM Response Time** | 145ms |
| **Total LLM Cost** | $0.15 |
| **System Uptime** | 99.9% |
| **Requests/sec** | 150+ |

See [performance_report.md](./performance_report.md) for detailed metrics.

---

## Tech Stack

| Category | Technology |
|----------|-----------|
| **Orchestration** | Turborepo, pnpm workspaces |
| **API Gateway** | Fastify 5, TypeScript 5.7 |
| **Services** | FastAPI 0.115, Python 3.11 |
| **Database** | PostgreSQL 16, SQLAlchemy async |
| **Cache** | Redis 7 |
| **Frontend** | Next.js 15, React 19, Tailwind CSS |
| **LLM Providers** | OpenAI, Anthropic, Google Gemini |
| **Observability** | OpenTelemetry, Loguru, Pino |
| **Containers** | Docker, Docker Compose |
| **Orchestration** | Kubernetes, Helm |
| **IaC** | Terraform |


---

<p align="center">
  Built for Performance
</p>
