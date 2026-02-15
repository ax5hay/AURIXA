#!/usr/bin/env bash
# Quick verification that the AURIXA stack is running.
# Prerequisites: All services started (see scripts/run-stack.sh or run manually).

GATEWAY="${GATEWAY:-http://localhost:3000}"
FAILED=0

check() {
  if curl -sf "$1" > /dev/null 2>&1; then
    echo "✓ $2"
  else
    echo "✗ $2 ($1)"
    FAILED=1
  fi
}

echo "=== AURIXA Stack Verification ==="
check "$GATEWAY/" "Gateway root"
check "$GATEWAY/health" "Gateway health"
check "$GATEWAY/api/v1/admin/tenants" "Admin tenants"
check "$GATEWAY/api/v1/admin/analytics/summary" "Analytics summary"
check "$GATEWAY/api/v1/admin/config/detail" "Config detail"
check "http://127.0.0.1:3100" "Dashboard (3100 - unified)"
check "http://127.0.0.1:3300" "Patient Portal (3300)"
check "http://127.0.0.1:3400" "Hospital Portal (3400)"

[ $FAILED -eq 0 ] && echo "" && echo "All checks passed." || exit 1
