#!/usr/bin/env bash
# Detailed end-to-end tests for all AURIXA services.
# Prerequisites: Full stack running (./scripts/run-stack.sh), DB seeded, LM Studio optional for pipeline.

set -e
GATEWAY="${GATEWAY:-http://localhost:3000}"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'
FAILED=0

pass() { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
fail() { echo -e "${RED}✗${NC} $1"; FAILED=1; }

echo "=== AURIXA Detailed E2E (Gateway: $GATEWAY) ==="
echo ""

# --- 1. Gateway ---
echo "--- 1. API Gateway (3000) ---"
curl -sf "$GATEWAY/" >/dev/null && pass "GET /" || fail "GET /"
curl -sf "$GATEWAY/health" >/dev/null && pass "GET /health" || fail "GET /health"
curl -sf "$GATEWAY/health/services" >/dev/null && pass "GET /health/services" || fail "GET /health/services"
echo ""

# --- 2. Direct service health (all Python) ---
echo "--- 2. Direct service health ---"
for port in 8001 8002 8003 8004 8005 8006 8007 8008; do
  name=""
  case $port in 8001) name="orchestration";; 8002) name="llm-router";; 8003) name="agent-runtime";; 8004) name="rag";; 8005) name="safety";; 8006) name="voice";; 8007) name="execution";; 8008) name="observability";; esac
  curl -sf --max-time 3 "http://localhost:$port/health" >/dev/null && pass "$name ($port) /health" || fail "$name ($port) /health"
done
echo ""

# --- 3. Gateway proxy to each service ---
echo "--- 3. Gateway proxy routes ---"
curl -sf --max-time 5 "$GATEWAY/api/v1/orchestration/knowledge/articles" >/dev/null && pass "GET /api/v1/orchestration/knowledge/articles" || fail "orchestration proxy"
curl -sf --max-time 5 -X POST "$GATEWAY/api/v1/llm/route" -H "Content-Type: application/json" -d '{"prompt":"hello"}' >/dev/null && pass "POST /api/v1/llm/route" || fail "llm-router proxy"
curl -sf --max-time 5 -X POST "$GATEWAY/api/v1/rag/retrieve" -H "Content-Type: application/json" -d '{"prompt":"hours","top_k":2}' >/dev/null && pass "POST /api/v1/rag/retrieve" || fail "rag proxy"
curl -sf --max-time 5 -X POST "$GATEWAY/api/v1/safety/validate" -H "Content-Type: application/json" -d '{"text":"Hello"}' >/dev/null && pass "POST /api/v1/safety/validate" || fail "safety proxy"
curl -sf --max-time 10 -X POST "$GATEWAY/api/v1/agents/run" -H "Content-Type: application/json" -d '{"task":{"prompt":"weather in Boston"}}' >/dev/null && pass "POST /api/v1/agents/run" || fail "agent-runtime proxy"
curl -sf --max-time 5 "$GATEWAY/api/v1/execute/actions" >/dev/null && pass "GET /api/v1/execute/actions" || fail "execution proxy"
curl -sf --max-time 5 "$GATEWAY/api/v1/observe/reports/performance" >/dev/null && pass "GET /api/v1/observe/reports/performance" || fail "observability proxy"
echo ""

# --- 4. Admin (orchestration via gateway) ---
echo "--- 4. Admin routes ---"
curl -sf "$GATEWAY/api/v1/admin/tenants" >/dev/null && pass "GET admin/tenants" || fail "admin/tenants"
curl -sf "$GATEWAY/api/v1/admin/patients" >/dev/null && pass "GET admin/patients" || fail "admin/patients"
code=$(curl -so /dev/null -w "%{http_code}" "$GATEWAY/api/v1/admin/patients/1")
[ "$code" = "200" ] && pass "GET admin/patients/1" || [ "$code" = "404" ] && warn "GET admin/patients/1 (404)" || fail "GET admin/patients/1 ($code)"
curl -sf "$GATEWAY/api/v1/admin/appointments" >/dev/null && pass "GET admin/appointments" || fail "admin/appointments"
curl -sf "$GATEWAY/api/v1/admin/knowledge/articles" >/dev/null && pass "GET admin/knowledge/articles" || fail "admin/knowledge/articles"
curl -sf "$GATEWAY/api/v1/admin/analytics/summary" >/dev/null && pass "GET admin/analytics/summary" || fail "admin/analytics/summary"
echo ""

# --- 5. Pipeline (full orchestration; LM Studio can be slow on first token) ---
echo "--- 5. Pipeline ---"
if curl -sf --max-time 150 -X POST "$GATEWAY/api/v1/orchestration/pipelines" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"What are your operating hours?","session_id":"e2e-test"}' | grep -q "final_response"; then
  pass "POST /api/v1/orchestration/pipelines (full response)"
else
  warn "POST /api/v1/orchestration/pipelines (timeout or no final_response)"
fi
echo ""

# --- 6. Pipeline stream (NDJSON) ---
echo "--- 6. Pipeline stream ---"
first=$(curl -sf --max-time 90 -X POST "$GATEWAY/api/v1/orchestration/pipelines/stream" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Hi","session_id":"e2e-stream"}' 2>/dev/null | head -1)
if echo "$first" | grep -qE '"event":\s*"(status|text_delta|done)"'; then
  pass "POST /api/v1/orchestration/pipelines/stream (NDJSON)"
else
  [ -z "$first" ] && warn "POST pipelines/stream (empty or timeout)" || warn "POST pipelines/stream (unexpected: $first)"
fi
echo ""

# --- 7. Voice REST ---
echo "--- 7. Voice (REST) ---"
voice_status=$(curl -so /dev/null -w "%{http_code}" --max-time 30 -X POST "$GATEWAY/api/v1/voice/process" \
  -H "Content-Type: application/json" \
  -d '{"audio_b64":"ZGF0YQ==","want_tts":false}')
[ "$voice_status" = "200" ] && pass "POST /api/v1/voice/process (200)" || [ "$voice_status" = "400" ] && pass "POST /api/v1/voice/process (400 invalid audio ok)" || warn "POST voice/process ($voice_status)"
echo ""

# --- 8. LLM generate/stream (if LM Studio up) ---
echo "--- 8. LLM (route + generate) ---"
route_json=$(curl -sf --max-time 5 -X POST "$GATEWAY/api/v1/llm/route" -H "Content-Type: application/json" -d '{"prompt":"hello"}' 2>/dev/null) || true
if [ -n "$route_json" ] && echo "$route_json" | grep -q "model"; then
  pass "POST /api/v1/llm/route returns model"
  model=$(echo "$route_json" | grep -o '"model":"[^"]*"' | head -1 | cut -d'"' -f4)
  if [ -n "$model" ]; then
    gen_status=$(curl -so /dev/null -w "%{http_code}" --max-time 30 -X POST "$GATEWAY/api/v1/llm/generate" \
      -H "Content-Type: application/json" \
      -d "{\"messages\":[{\"role\":\"user\",\"content\":\"Say hi\"}],\"model\":\"$model\"}" 2>/dev/null) || true
    [ "$gen_status" = "200" ] && pass "POST /api/v1/llm/generate (200)" || warn "POST llm/generate ($gen_status)"
  fi
else
  warn "POST llm/route failed or no model"
fi
echo ""

echo "=== Detailed E2E Complete ==="
[ $FAILED -eq 0 ] && echo "All required checks passed." || echo "Some checks failed."
exit $FAILED
