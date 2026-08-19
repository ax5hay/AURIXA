#!/usr/bin/env bash
# Quick health check for local stack.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
G="${GATEWAY:-http://localhost:3000}"

pass() { echo "✓ $1"; }
fail() { echo "✗ $1"; exit 1; }

echo "=== Local stack health ==="
curl -sf "$G/health" >/dev/null && pass "Gateway /health" || fail "Gateway /health"
curl -sf "$G/api/v1/admin/clients?tenant_id=1&limit=1" >/dev/null && pass "Admin clients" || fail "Admin clients"
curl -sf "$G/api/v1/admin/activity/overnight?tenant_id=1" >/dev/null && pass "Activity overnight" || fail "Activity overnight"
curl -sf "$G/api/v1/admin/activity/stale?tenant_id=1" >/dev/null && pass "Activity stale" || fail "Activity stale"
curl -sf "$G/api/v1/admin/escalations?tenant_id=1" >/dev/null && pass "Escalations" || fail "Escalations"
curl -sf "http://localhost:3400" >/dev/null && pass "Agent Workspace :3400" || fail "Agent Workspace :3400"
curl -sf "http://localhost:8001/health" >/dev/null && pass "Orchestration :8001" || fail "Orchestration :8001"
curl -sf "http://localhost:8004/health" >/dev/null && pass "RAG :8004" || fail "RAG :8004"
curl -sf "http://localhost:3300" >/dev/null && pass "Client Portal :3300" || fail "Client Portal :3300"
curl -sf "http://localhost:3100" >/dev/null && pass "Dashboard :3100" || fail "Dashboard :3100"
# Demo sign-in endpoints must accept POST when configured
code=$(curl -so /dev/null -w "%{http_code}" -X POST "http://localhost:3400/api/auth/local-demo")
[ "$code" = "200" ] && pass "Agent demo sign-in" || fail "Agent demo sign-in (HTTP $code)"
code=$(curl -so /dev/null -w "%{http_code}" -X POST "http://localhost:3300/api/auth/local-demo")
[ "$code" = "200" ] && pass "Client demo sign-in" || fail "Client demo sign-in (HTTP $code)"
echo "All checks passed."
