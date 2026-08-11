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
curl -sf "$GATEWAY/api/v1/admin/clients" > /dev/null && pass "GET /api/v1/admin/clients" || fail "GET /api/v1/admin/clients"
E2E_CLIENT_CODE=$(curl -so /dev/null -w "%{http_code}" "$GATEWAY/api/v1/admin/clients/1")
if [ "$E2E_CLIENT_CODE" = "200" ]; then
  pass "GET /api/v1/admin/clients/1 (client profile)"
elif [ "$E2E_CLIENT_CODE" = "404" ]; then
  warn "GET /api/v1/admin/clients/1 returned 404 (run db seed)"
else
  fail "GET /api/v1/admin/clients/1 (status $E2E_CLIENT_CODE)"
fi
curl -sf "$GATEWAY/api/v1/admin/showings" > /dev/null && pass "GET /api/v1/admin/showings" || fail "GET /api/v1/admin/showings"
curl -sf "$GATEWAY/api/v1/admin/listings" > /dev/null && pass "GET /api/v1/admin/listings" || fail "GET /api/v1/admin/listings"
curl -sf "$GATEWAY/api/v1/admin/leads" > /dev/null && pass "GET /api/v1/admin/leads" || fail "GET /api/v1/admin/leads"
# Legacy aliases (until frontends migrate in Phase 4–5)
curl -sf "$GATEWAY/api/v1/admin/patients" > /dev/null && pass "GET /api/v1/admin/patients (legacy alias)" || fail "GET /api/v1/admin/patients"
curl -sf "$GATEWAY/api/v1/admin/appointments" > /dev/null && pass "GET /api/v1/admin/appointments (legacy alias)" || fail "GET /api/v1/admin/appointments"

# Orchestration routes (via proxy)
curl -sf "$GATEWAY/api/v1/orchestration/knowledge/articles" > /dev/null && pass "GET /api/v1/orchestration/knowledge/articles" || warn "GET /api/v1/orchestration/knowledge/articles (orchestration may be down)"

# Observability
curl -sf "$GATEWAY/api/v1/observe/reports/performance" > /dev/null && pass "GET /api/v1/observe/reports/performance" || warn "GET /api/v1/observe/reports/performance (observability may be down)"

# Voice service health (direct)
curl -sf "http://localhost:8006/health" > /dev/null && pass "Voice service GET /health" || warn "Voice service GET /health (voice may be down)"

# Deployment controller and protected control-plane API
curl -sf "http://localhost:8009/health" > /dev/null && pass "Deployment controller GET /health" || warn "Deployment controller GET /health (controller may be down)"
if [ -n "${DEPLOYMENT_ADMIN_TOKEN:-}" ]; then
  curl -sf \
    -H "Authorization: Bearer $DEPLOYMENT_ADMIN_TOKEN" \
    "$GATEWAY/api/v1/admin/deployments" > /dev/null \
    && pass "GET /api/v1/admin/deployments (authorized)" \
    || fail "GET /api/v1/admin/deployments (authorized)"
else
  DEPLOYMENT_UNAUTH_CODE=$(curl -so /dev/null -w "%{http_code}" "$GATEWAY/api/v1/admin/deployments")
  if [ "$DEPLOYMENT_UNAUTH_CODE" = "401" ]; then
    pass "GET /api/v1/admin/deployments rejects unauthenticated access"
  else
    fail "GET /api/v1/admin/deployments expected 401, received $DEPLOYMENT_UNAUTH_CODE"
  fi
  warn "Set DEPLOYMENT_ADMIN_TOKEN to exercise the authorized deployment overview"
fi

# Pipeline (orchestration) - allow 90s for LLM response
curl -sf --max-time 90 -X POST "$GATEWAY/api/v1/orchestration/pipelines" -H "Content-Type: application/json" -d '{"prompt":"Hi"}' > /dev/null && pass "POST /api/v1/orchestration/pipelines" || warn "POST /api/v1/orchestration/pipelines (pipeline/LLM may be down)"

echo ""
echo "=== E2E Check Complete ==="
