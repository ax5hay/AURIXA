# AURIXA — Docker fresh-start guide (MCP coder)

**Audience:** An MCP-connected coding agent (or human operator) bringing AURIXA up on a **new machine** with **no prior setup**.  
**Goal:** Full local stack in Docker — Postgres, Redis, 10 backend services, 3 frontends, seeded demo data (1,000 clients, 60% US / 40% India).

**Repo root:** all paths below are relative to the cloned `AURIXA` repository unless noted.

---

## What “done” looks like

| Check | Expected |
|-------|----------|
| `docker compose ps` | Postgres, Redis, gateway, Python services, 3 frontends **Up** (db-migrate/db-seed **Exited 0**) |
| `curl -sf http://127.0.0.1:3000/health` | HTTP 200 |
| `curl -sf http://127.0.0.1:3300/` | HTTP 200 (client portal) |
| `curl -sf http://127.0.0.1:3400/` | HTTP 200 (agent workspace) |
| `curl -sf http://127.0.0.1:3100/` | HTTP 200 (dashboard) |
| `GET /api/v1/admin/clients/1` | HTTP 200 — **Jane Smith** demo client exists |

**Primary URLs**

| App | URL | Demo sign-in |
|-----|-----|----------------|
| Client portal | http://127.0.0.1:3300 | `/auth/signin` → **Continue with local demo** (Jane Smith, client #1) |
| Agent workspace | http://127.0.0.1:3400 | `/auth/signin` → local demo (**Demo Agent**) |
| Operator dashboard | http://127.0.0.1:3100 | Sign in → **Local development** (dev auth enabled in Compose) |
| API gateway | http://127.0.0.1:3000 | — |
| Playground (E2E tests) | http://127.0.0.1:3100/playground | **Run All Tests** |

---

## Prerequisites (fresh PC)

Install **before** cloning:

1. **Git**
2. **Docker Desktop** (or Docker Engine + Compose v2 on Linux)
   - Enable Compose V2 (`docker compose`, not legacy `docker-compose`)
   - **Memory: allocate ≥ 8 GB RAM** to Docker (Settings → Resources).  
     `agent-runtime` and `execution-engine` are memory-heavy; 4 GB often causes **OOM exit 137**.
   - **Disk: ≥ 15 GB free** for first image build
3. **Optional (local dev without Docker frontends):** Node 20+, pnpm 9+ — **not required** for Docker-only bootstrap

**Not required for Docker bootstrap:** Python, pnpm, LM Studio (LM Studio only needed if you want **live LLM chat** responses).

---

## Step 1 — Clone the repository

```bash
git clone <repo-url> AURIXA
cd AURIXA
```

Replace `<repo-url>` with the actual remote (e.g. `git@github.com:org/AURIXA.git`).

---

## Step 2 — Create environment file

```bash
cp .env.example .env
```

For **Docker-only** local demo, the root `.env` can stay mostly default. Compose injects in-container values (Postgres URL, demo auth flags, gateway URLs).

**Optional overrides in `.env`:**

```dotenv
# Database seed volume (defaults shown)
SEED_CLIENT_COUNT=1000
SEED_RANDOM_SEED=42
SEED_BATCH_SIZE=200

# Only if running LM Studio on the host for chat generation:
# LM_STUDIO_BASE_URL=http://host.docker.internal:1234/v1
```

Do **not** commit `.env` (secrets / local config).

---

## Step 3 — Start the full stack (recommended script)

From repo root:

```bash
chmod +x scripts/docker-up.sh
./scripts/docker-up.sh --build
```

What this does:

1. Starts **Postgres** + **Redis**
2. Waits for Postgres health
3. Runs **db-migrate** then **db-seed** (wipes and re-seeds DB)
4. Builds (with `--build`) and starts **all application containers** in detached mode

**First `--build` on a fresh machine:** expect **15–45 minutes** depending on CPU/network (many Python + Node images).

### Alternative — raw Compose (same result)

```bash
cd infra/docker

# Infrastructure + migrate + seed + all services (first time)
docker compose up --build -d

# Re-seed only (keeps volumes, rebuilds seed image if needed)
docker compose build db-seed && docker compose run --rm db-seed
```

---

## Step 4 — Wait for health

Backend chain: Postgres → db-migrate → db-seed → orchestration / execution / deployment-controller → api-gateway → frontends.

```bash
cd infra/docker
docker compose ps
```

Watch until these are **running** (not restarting):

- `postgres`, `redis`
- `api-gateway`, `orchestration-engine`, `llm-router`, `rag-service`, `safety-guardrails`
- `agent-runtime`, `execution-engine`, `streaming-voice`, `observability-core`, `deployment-controller`
- `dashboard`, `client-portal`, `agent-workspace`

`db-migrate` and `db-seed` should show **Exited (0)**.

**Tail logs if something is stuck:**

```bash
cd infra/docker
docker compose logs -f api-gateway orchestration-engine rag-service agent-runtime
```

---

## Step 5 — Verify (MCP agent checklist)

Run from repo root after containers are up:

```bash
# Quick HTTP checks
curl -sf http://127.0.0.1:3000/health && echo " gateway OK"
curl -sf http://127.0.0.1:3300/ && echo " client portal OK"
curl -sf http://127.0.0.1:3400/ && echo " agent workspace OK"
curl -sf http://127.0.0.1:3100/ && echo " dashboard OK"

# Demo client must exist
curl -sf http://127.0.0.1:3000/api/v1/admin/clients/1 | head -c 200

# Full scripted E2E (optional)
./scripts/e2e-check.sh
```

**Deploy utility verify** (checks health paths from service manifest):

```bash
pnpm run deploy verify
```

*(Requires Node/pnpm installed; skip if Docker-only machine.)*

**Dashboard playground:** open http://127.0.0.1:3100/playground → **Run All Tests**.

---

## Step 6 — Demo walkthrough (smoke test)

1. **Client portal** — http://127.0.0.1:3300/auth/signin → local demo → Home shows **Tour Day** for Jane Smith  
2. **Listings** — http://127.0.0.1:3300/listings — match badges, compare flow  
3. **Agent workspace** — http://127.0.0.1:3400 → Clients → **Jane Smith** → 60-second brief  
4. **Dashboard** — http://127.0.0.1:3100/playground → service tests  

More narrative: [DEMO_PRESENTATION.md](./DEMO_PRESENTATION.md)

---

## Service map (ports)

| Service | Host port | Health |
|---------|-----------|--------|
| API Gateway | 3000 | http://127.0.0.1:3000/health |
| Orchestration | 8001 | http://127.0.0.1:8001/health |
| LLM Router | 8002 | http://127.0.0.1:8002/health |
| Agent Runtime | 8003 | http://127.0.0.1:8003/health |
| RAG | 8004 | http://127.0.0.1:8004/health |
| Safety | 8005 | http://127.0.0.1:8005/health |
| Voice | 8006 | http://127.0.0.1:8006/health |
| Execution | 8007 | http://127.0.0.1:8007/health |
| Observability | 8008 | http://127.0.0.1:8008/health |
| Deployment controller | 8009 | http://127.0.0.1:8009/health |
| Dashboard | 3100 | http://127.0.0.1:3100/ |
| Client portal | 3300 | http://127.0.0.1:3300/ |
| Agent workspace | 3400 | http://127.0.0.1:3400/ |
| Postgres | 5432 | user `aurixa` / pass `aurixa` / db `aurixa` |
| Redis | 6379 | — |

Compose file: `infra/docker/docker-compose.yml`

---

## Database re-seed (reset demo data)

Wipes all tables and reloads curated + random data:

```bash
cd infra/docker
docker compose build db-seed
docker compose run --rm db-seed
```

Expected log line:

```text
Seed complete: 6 tenants, 1000 clients (600 US / 400 IN), ...
```

**No need to restart** other services after re-seed unless they crashed; gateway reads DB on each request.

---

## Optional — Enable LLM chat responses

UI, listings, showings, and safety work **without** an LLM. **Generated chat text** requires a model provider.

**Local (LM Studio on host):**

1. Install [LM Studio](https://lmstudio.ai/), load a model, start local server (default `http://127.0.0.1:1234/v1`)
2. In `.env`:

   ```dotenv
   LM_STUDIO_BASE_URL=http://host.docker.internal:1234/v1
   ```

3. Restart LLM-dependent services:

   ```bash
   cd infra/docker
   docker compose up -d --build llm-router orchestration-engine agent-runtime
   ```

Without LM Studio, chat may return 500 from the pipeline — that is expected; non-chat flows still demo fine.

---

## Troubleshooting

### Port already in use

```bash
lsof -i :3000 -i :3300 -i :3400 -i :3100 -i :5432
```

Stop conflicting processes or change host ports in `infra/docker/docker-compose.yml` (not recommended for MCP scripts that assume defaults).

### `agent-runtime` or `execution-engine` exits 137 (OOM)

- Increase Docker Desktop memory to **8 GB+**
- Restart: `docker compose up -d agent-runtime execution-engine`

### `db-seed` fails: `No module named 'seed_data'`

Rebuild seed image (Dockerfile must copy `seed_data.py` and `seed_random.py`):

```bash
cd infra/docker
docker compose build db-seed --no-cache
docker compose run --rm db-seed
```

### Gateway unhealthy / frontends 502

```bash
cd infra/docker
docker compose logs api-gateway orchestration-engine --tail 100
docker compose up -d --build api-gateway orchestration-engine
```

### Client `/api/v1/admin/clients/1` returns 404

Database not seeded. Run **Database re-seed** above.

### Frontends show stale UI after git pull

Rebuild frontends:

```bash
cd infra/docker
docker compose up -d --build client-portal agent-workspace dashboard
```

### Nuclear reset (delete DB volume)

```bash
cd infra/docker
docker compose down -v   # WARNING: destroys Postgres/Redis data volumes
docker compose up --build -d
```

---

## Stop / restart

```bash
cd infra/docker

# Stop containers (keep data volumes)
docker compose down

# Start again (no rebuild)
docker compose up -d

# Stop + remove volumes
docker compose down -v
```

---

## MCP agent command cheat sheet

Execute in order on a **fresh PC**:

```bash
# 1. Clone (adjust URL)
git clone <repo-url> AURIXA && cd AURIXA

# 2. Env
cp .env.example .env

# 3. Full stack
./scripts/docker-up.sh --build

# 4. Verify
curl -sf http://127.0.0.1:3000/health
curl -sf http://127.0.0.1:3000/api/v1/admin/clients/1
curl -sf -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3300/

# 5. Optional re-seed
cd infra/docker && docker compose run --rm db-seed
```

**Key paths for code changes:**

| Area | Path |
|------|------|
| Compose | `infra/docker/docker-compose.yml` |
| Seed (curated) | `packages/db/seed_data.py` |
| Seed (random/Faker) | `packages/db/seed_random.py` |
| Seed runner | `packages/db/seed.py` |
| Client portal | `frontend/client-portal/` |
| Agent workspace | `frontend/agent-workspace/` |
| Dashboard | `frontend/dashboard/` |
| UI kit (shared) | `packages/ui-kit/` |

**Hot reload (frontends only, no Docker):** stop frontend containers, then from repo root run local dev — see README *Quick Start*. Backends stay in Docker on port 3000.

---

## Related docs

- [README.md](../README.md) — architecture and quick start  
- [DEMO_PRESENTATION.md](./DEMO_PRESENTATION.md) — demo script and talking points  
- [DEPLOYMENT_RUNBOOK.md](./DEPLOYMENT_RUNBOOK.md) — production/cloud (not needed for local Docker)  
- [REAL_ESTATE_DOMAIN.md](./REAL_ESTATE_DOMAIN.md) — domain model and entities  

---

## Success criteria summary

An MCP coder can mark bootstrap **complete** when:

1. All three frontends return HTTP 200  
2. `GET http://127.0.0.1:3000/api/v1/admin/clients/1` returns Jane Smith  
3. Client portal local demo sign-in works  
4. Agent workspace local demo sign-in works  
5. Playground **Run All Tests** passes (or only LLM tests fail if no model configured)
