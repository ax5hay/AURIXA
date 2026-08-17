#!/usr/bin/env bash
# Capture full-page PNG screenshots of all portal screens into docs/screenshots/.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/docs/screenshots"
E2E="$ROOT/e2e"

echo "=== AURIXA documentation screenshots ==="

for port in 3300 3400 3100; do
  if ! curl -sf "http://127.0.0.1:${port}" >/dev/null; then
    echo "ERROR: Nothing listening on http://127.0.0.1:${port}"
    echo "Start the stack first: ./scripts/docker-up.sh or pnpm dev"
    exit 1
  fi
done

rm -rf "$OUT"
mkdir -p "$OUT"

cd "$E2E"
SCREENSHOT_OUT="$OUT" pnpm exec playwright test screenshots --config=playwright.screenshots.config.ts

count="$(find "$OUT" -name '*.png' | wc -l | tr -d ' ')"
echo ""
echo "Captured $count screenshots under docs/screenshots/"
find "$OUT" -name '*.png' | sort
