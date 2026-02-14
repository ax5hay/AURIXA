#!/usr/bin/env bash
# Run the minimum AURIXA stack for development.
# 1. Starts Postgres (and Redis) via Docker if not running
# 2. Seeds the database
# 3. Starts API Gateway, Orchestration, Observability
# 4. Starts frontends (Dashboard unified, Patient Portal)
# Frontends use --hostname 127.0.0.1 for sandbox/CI compatibility.

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Kill any existing stack first (avoid EADDRINUSE)
"$ROOT/scripts/kill-stack.sh" 2>/dev/null || true
# Ensure ports are free before starting (kill-stack has internal wait)
for port in 3000 3100 3300 8001 8002 8003 8004 8005 8006 8007 8008; do
  for _ in 1 2 3 4 5; do
    if ! lsof -ti:$port &>/dev/null; then break; fi
    echo "Port $port still busy, waiting..."
    sleep 2
  done
done

# Pre-build patient portal while system is idle (avoids build during heavy load; start is instant)
echo "Pre-building Patient Portal..."
if (cd "$ROOT/frontend/patient-portal" && rm -rf .next && pnpm build 2>&1); then
  echo "Patient Portal build complete."
else
  echo "Warn: Patient Portal build failed; will try dev mode as fallback."
  PATIENT_PORTAL_DEV_FALLBACK=1
fi

# Load .env if present
if [ -f .env ]; then
  set -a
  source .env 2>/dev/null || true
  set +a
fi

# Raise open-file limit to avoid EMFILE (too many open files) with multiple dev servers
ulimit -n 65536 2>/dev/null || true
# Use polling instead of native watchers to reduce file descriptors (avoids EMFILE)
# Also avoids "operation not permitted" from fsevents/kqueue on macOS
export WATCHPACK_POLLING=true
export CHOKIDAR_USEPOLLING=true

echo "=== AURIXA Run Stack ==="

# Start infra if docker available
if command -v docker &> /dev/null; then
  if ! docker ps | grep -q aurixa.*postgres; then
    echo "Starting Postgres..."
    cd infra/docker && docker-compose up -d postgres redis 2>/dev/null || true
    cd "$ROOT"
    sleep 3
  fi
else
  echo "Docker not found. Ensure Postgres is running on localhost:5432 (user: aurixa, pass: aurixa, db: aurixa)"
fi

# Wait for Postgres to accept connections (retry seed until success or max attempts)
echo "Seeding database..."
SEED_OK=false
for attempt in 1 2 3 4 5; do
  if pnpm db:seed 2>&1; then
    SEED_OK=true
    break
  fi
  if [ "$attempt" -lt 5 ]; then
    echo "Seed attempt $attempt failed; waiting 3s for Postgres..."
    sleep 3
  fi
done
if [ "$SEED_OK" != "true" ]; then
  echo "Warn: db:seed failed after 5 attempts. Run 'pnpm db:seed' manually. Patient portal may show 'Could not load profile'."
fi

# Start backend services in background
echo "Starting API Gateway..."
(cd apps/api-gateway && API_GATEWAY_HOST=127.0.0.1 pnpm dev) &
GATEWAY_PID=$!
sleep 2

# Python services: use uv run (or pip-installed uvicorn)
# uv can panic on some macOS; fallback with PYTHONPATH for workspace packages
run_python_app() {
  local dir=$1 mod=$2 port=$3
  local full_dir="$ROOT/$dir"
  local src_path="$full_dir/src"
  (cd "$full_dir" && (
    uv run uvicorn "$mod.main:app" --host 0.0.0.0 --port "$port" 2>/dev/null ||
    PYTHONPATH="$ROOT/packages/db/src:$ROOT/packages/llm-clients/src:$ROOT:$src_path:$full_dir" python -m uvicorn "$mod.main:app" --host 0.0.0.0 --port "$port"
  )) &
}

# Python apps: try uv run first; if uv panics (e.g. macOS), ensure deps are installed:
#   pip install -e packages/db packages/llm-clients
#   pip install -e apps/orchestration-engine apps/observability-core apps/llm-router apps/agent-runtime apps/rag-service apps/safety-guardrails apps/streaming-voice apps/execution-engine

echo "Starting Orchestration Engine..."
run_python_app apps/orchestration-engine orchestration_engine 8001
sleep 2

echo "Starting Observability Core..."
run_python_app apps/observability-core observability_core 8008
sleep 1

echo "Starting RAG Service (model load ~30s)..."
run_python_app apps/rag-service rag_service 8004
sleep 2

echo "Starting LLM Router..."
run_python_app apps/llm-router llm_router 8002
sleep 3

echo "Starting Agent Runtime..."
run_python_app apps/agent-runtime agent_runtime 8003
sleep 1

echo "Starting Safety Guardrails..."
run_python_app apps/safety-guardrails safety_guardrails 8005
sleep 1

echo "Starting Streaming Voice..."
run_python_app apps/streaming-voice streaming_voice 8006
sleep 1

echo "Starting Execution Engine..."
run_python_app apps/execution-engine execution_engine 8007
sleep 1

# Start frontends
echo "Starting frontends..."
pnpm --filter @aurixa/dashboard dev &
# Patient portal: use pre-built start if available, else dev mode
if [ "${PATIENT_PORTAL_DEV_FALLBACK:-}" = "1" ]; then
  WATCHPACK_POLLING=true pnpm --filter @aurixa/patient-portal dev &
else
  (cd "$ROOT/frontend/patient-portal" && pnpm start) &
fi

echo ""
echo "Stack running. Endpoints:"
echo "  Gateway:       http://localhost:3000"
echo "  Orchestration: http://localhost:8001"
echo "  LLM Router:   http://localhost:8002"
echo "  Agent Runtime: http://localhost:8003"
echo "  RAG Service:  http://localhost:8004"
echo "  Safety:       http://localhost:8005"
echo "  Voice:        http://localhost:8006"
echo "  Execution:    http://localhost:8007"
echo "  Observability: http://localhost:8008"
echo "  Dashboard:    http://localhost:3100 (unified)"
echo "  Patient:      http://localhost:3300"
echo ""
echo "Run ./scripts/e2e-check.sh to verify APIs."
echo "If Python services fail, run ./scripts/bootstrap-python.sh once."
echo "Press Ctrl+C to stop all."

wait
