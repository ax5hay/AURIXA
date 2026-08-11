#!/usr/bin/env bash
# Fail CI when banned healthcare product copy appears in user-facing frontend paths.
# See docs/REAL_ESTATE_RENAME_INVENTORY.md §10 and docs/REAL_ESTATE_DOMAIN.md Phase 10.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v rg >/dev/null 2>&1; then
  echo "ripgrep (rg) is required for domain copy checks."
  exit 1
fi

SCAN_DIRS=(
  frontend/client-portal/src
  frontend/agent-workspace/src
  frontend/dashboard/src
)

# Case-insensitive phrase patterns (RE2 syntax for rg)
PATTERNS=(
  'patient portal'
  'hospital portal'
  'clinical workspace'
  'healthcare assistant'
  'HIPAA'
  '\bprescription\b'
  '\bmedications?\b'
  '\bdiagnosis\b'
  '\bclinician\b'
  '\brefill\b'
  'my care'
  'medical record'
  'care messages'
  'care team'
)

# Files that may reference legacy APIs, role aliases, or deprecated wrappers
ALLOWLIST_GLOBS=(
  '!**/middleware.ts'
  '!**/StaffContext.tsx'
  '!**/api/**/route.ts'
  '!**/api.ts'
  '!**/*session*.ts'
  '!**/*oidc*.ts'
  '!**/Healthcare.tsx'
)

rg_args=(--ignore-case --no-heading --line-number)
for glob in "${ALLOWLIST_GLOBS[@]}"; do
  rg_args+=(-g "$glob")
done

fail=0
for dir in "${SCAN_DIRS[@]}"; do
  if [[ ! -d "$dir" ]]; then
    echo "WARN: scan directory missing: $dir"
    continue
  fi
  for pattern in "${PATTERNS[@]}"; do
    if matches="$(rg "${rg_args[@]}" "$pattern" "$dir" 2>/dev/null || true)"; then
      if [[ -n "$matches" ]]; then
        echo "FAIL: banned phrase /$pattern/ in $dir"
        echo "$matches"
        echo
        fail=1
      fi
    fi
  done
done

# Active workspace must not ship legacy portal folder names
for legacy in frontend/patient-portal frontend/hospital-portal; do
  if [[ -d "$legacy" ]] && grep -q "$legacy" pnpm-workspace.yaml 2>/dev/null; then
    echo "FAIL: legacy path $legacy is still listed in pnpm-workspace.yaml"
    fail=1
  fi
done

if [[ "$fail" -ne 0 ]]; then
  echo "Domain copy check failed. Update copy to real estate terminology or allowlist with justification."
  exit 1
fi

echo "Domain copy check passed."
