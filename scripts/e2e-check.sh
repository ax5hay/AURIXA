#!/usr/bin/env bash
# End-to-end check for AURIXA routes and APIs.
# Run with: ./scripts/e2e-check.sh
# Prerequisites: API Gateway (3000), Orchestration (8001), Observability (8008) running.
# If analytics/config routes fail, restart orchestration to pick up latest routes.

set -e
GATEWAY="${GATEWAY:-http://localhost:3000}"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "${GREEN}✓${NC} $1"; }
fail() { echo -e "${RED}✗${NC} $1"; exit 1; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }

echo "=== AURIXA E2E Check (Gateway: $GATEWAY) ==="

# Gateway root
curl -sf "$GATEWAY/" > /dev/null && pass "GET /" || fail "GET /"

# Gateway health
curl -sf "$GATEWAY/health" > /dev/null && pass "GET /health" || fail "GET /health"

# Health services
curl -sf "$GATEWAY/health/services" > /dev/null && pass "GET /health/services" || fail "GET /health/services"

# Admin routes (via gateway)
curl -sf "$GATEWAY/api/v1/admin/tenants" > /dev/null && pass "GET /api/v1/admin/tenants" || fail "GET /api/v1/admin/tenants"
curl -sf "$GATEWAY/api/v1/admin/audit" > /dev/null && pass "GET /api/v1/admin/audit" || fail "GET /api/v1/admin/audit"
curl -sf "$GATEWAY/api/v1/admin/analytics/summary" > /dev/null && pass "GET /api/v1/admin/analytics/summary" || fail "GET /api/v1/admin/analytics/summary"
curl -sf "$GATEWAY/api/v1/admin/config/summary" > /dev/null && pass "GET /api/v1/admin/config/summary" || fail "GET /api/v1/admin/config/summary"
curl -sf "$GATEWAY/api/v1/admin/config/detail" > /dev/null && pass "GET /api/v1/admin/config/detail" || fail "GET /api/v1/admin/config/detail"
curl -sf "$GATEWAY/api/v1/admin/knowledge/articles" > /dev/null && pass "GET /api/v1/admin/knowledge/articles" || fail "GET /api/v1/admin/knowledge/articles"
curl -sf "$GATEWAY/api/v1/admin/patients" > /dev/null && pass "GET /api/v1/admin/patients" || fail "GET /api/v1/admin/patients"

# Orchestration routes (via proxy)
curl -sf "$GATEWAY/api/v1/orchestration/knowledge/articles" > /dev/null && pass "GET /api/v1/orchestration/knowledge/articles" || warn "GET /api/v1/orchestration/knowledge/articles (orchestration may be down)"

# Observability
curl -sf "$GATEWAY/api/v1/observe/reports/performance" > /dev/null && pass "GET /api/v1/observe/reports/performance" || warn "GET /api/v1/observe/reports/performance (observability may be down)"

# Voice service health (direct)
curl -sf "http://localhost:8006/health" > /dev/null && pass "Voice service GET /health" || warn "Voice service GET /health (voice may be down)"

# Pipeline (orchestration) - allow 90s for LLM response
curl -sf --max-time 90 -X POST "$GATEWAY/api/v1/orchestration/pipelines" -H "Content-Type: application/json" -d '{"prompt":"Hi"}' > /dev/null && pass "POST /api/v1/orchestration/pipelines" || warn "POST /api/v1/orchestration/pipelines (pipeline/LLM may be down)"

echo ""
echo "=== E2E Check Complete ==="
