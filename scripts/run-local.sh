#!/usr/bin/env bash
# Run AURIXA locally — Docker only for Postgres + Redis.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
LOG_DIR="$ROOT/.local-logs"
mkdir -p "$LOG_DIR"
pnpm_run() { npx --yes pnpm "$@"; }
export -f pnpm_run 2>/dev/null || true

# shellcheck disable=SC1091
source "$ROOT/.venv/bin/activate"
if [ -f "$ROOT/.env" ]; then set -a; source "$ROOT/.env"; set +a; fi

export DATABASE_URL="${DATABASE_URL:-postgresql+asyncpg://aurixa:aurixa@localhost:5432/aurixa}"
export LM_STUDIO_BASE_URL="${LM_STUDIO_BASE_URL:-http://127.0.0.1:1234/v1}"
export STAFF_DEMO_AUTH_ENABLED="${STAFF_DEMO_AUTH_ENABLED:-true}"
export STAFF_SESSION_SECRET="${STAFF_SESSION_SECRET:-aurixa-local-staff-session-secret-32b}"
export CLIENT_SESSION_SECRET="${CLIENT_SESSION_SECRET:-aurixa-local-client-session-secret-32}"
export CLIENT_DEMO_AUTH_ENABLED="${CLIENT_DEMO_AUTH_ENABLED:-true}"
export API_GATEWAY_URL="${API_GATEWAY_URL:-http://localhost:3000}"
export WATCHPACK_POLLING=true
export CHOKIDAR_USEPOLLING=true

run_py() {
  local dir="$1" mod="$2" port="$3" name="$4"
  echo "Starting $name on :$port ..."
  (cd "$ROOT/$dir" && uvicorn "$mod.main:app" --host 127.0.0.1 --port "$port") \
    >"$LOG_DIR/$name.log" 2>&1 &
  echo $! >"$LOG_DIR/$name.pid"
}

echo "=== Sync frontend .env.local files ==="
bash "$ROOT/scripts/sync-frontend-env.sh"

echo "=== Build shared packages (once) ==="
npx --yes pnpm --filter @aurixa/auth --filter @aurixa/config --filter @aurixa/logging --filter @aurixa/telemetry --filter @aurixa/ui-kit build >/dev/null 2>&1 || true

echo "=== Infra (Docker): Postgres + Redis ==="
cd "$ROOT/infra/docker"
docker compose up -d postgres redis
cd "$ROOT"

echo "=== Backend (local Python) ==="
run_py apps/observability-core observability_core 8008 observability
run_py apps/safety-guardrails safety_guardrails 8005 safety
run_py apps/rag-service rag_service 8004 rag
sleep 2
run_py apps/execution-engine execution_engine 8007 execution
run_py apps/agent-runtime agent_runtime 8003 agent-runtime
run_py apps/llm-router llm_router 8002 llm-router
run_py apps/orchestration-engine orchestration_engine 8001 orchestration
run_py apps/streaming-voice streaming_voice 8006 voice

echo "=== API Gateway (local Node) ==="
(cd "$ROOT/apps/api-gateway" && API_GATEWAY_HOST=127.0.0.1 npx --yes pnpm dev) >"$LOG_DIR/gateway.log" 2>&1 &
echo $! >"$LOG_DIR/gateway.pid"

echo "=== Frontends (local Next.js dev) ==="
npx --yes pnpm --filter @aurixa/dashboard dev >"$LOG_DIR/dashboard.log" 2>&1 &
echo $! >"$LOG_DIR/dashboard.pid"
npx --yes pnpm --filter @aurixa/client-portal dev >"$LOG_DIR/client-portal.log" 2>&1 &
echo $! >"$LOG_DIR/client-portal.pid"
npx --yes pnpm --filter @aurixa/agent-workspace dev >"$LOG_DIR/agent-workspace.log" 2>&1 &
echo $! >"$LOG_DIR/agent-workspace.pid"

echo ""
echo "Local stack starting. Logs: $LOG_DIR/"
echo "  Gateway:         http://localhost:3000"
echo "  Agent Workspace: http://localhost:3400"
echo "  Client Portal:   http://localhost:3300"
echo "  Dashboard:       http://localhost:3100"
echo ""
echo "Run: ./scripts/verify-local.sh  (wait ~60s for RAG model load)"
