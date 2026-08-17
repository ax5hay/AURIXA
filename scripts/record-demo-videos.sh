#!/usr/bin/env bash
# Record short Playwright walkthrough videos for all three AURIXA surfaces.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/docs/demo-videos"
E2E="$ROOT/e2e"

echo "=== AURIXA demo video recorder ==="
echo "Requires client portal (:3300), agent workspace (:3400), and dashboard (:3100)."

for port in 3300 3400 3100; do
  if ! curl -sf "http://127.0.0.1:${port}" >/dev/null; then
    echo "ERROR: Nothing listening on http://127.0.0.1:${port}"
    echo "Start the stack first: ./scripts/docker-up.sh or pnpm dev"
    exit 1
  fi
done

mkdir -p "$OUT"
rm -rf "$E2E/test-results/demo-videos"

cd "$E2E"
pnpm exec playwright test demo-videos --config=playwright.demo-videos.config.ts

copy_video() {
  local pattern="$1"
  local dest="$2"
  local found
  found="$(find "$E2E/test-results/demo-videos" -type f -name 'video.webm' -path "*${pattern}*" | head -1)"
  if [[ -z "$found" ]]; then
    echo "WARN: No recording found for pattern: $pattern"
    return 1
  fi
  cp "$found" "$dest"
  echo "Wrote $dest ($(du -h "$dest" | cut -f1))"
}

copy_video "client-portal-demo-video" "$OUT/client-portal-demo.webm"
copy_video "agent-workspace-demo-video" "$OUT/agent-workspace-demo.webm"
copy_video "operator-dashboard-demo-video" "$OUT/operator-dashboard-demo.webm"

echo ""
echo "Done. Videos:"
ls -lh "$OUT"/*.webm 2>/dev/null || true
