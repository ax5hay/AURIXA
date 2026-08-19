#!/usr/bin/env bash
# Stop locally running AURIXA processes (keeps Docker Postgres/Redis running).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
"$ROOT/scripts/kill-stack.sh"
LOG_DIR="$ROOT/.local-logs"
if [ -d "$LOG_DIR" ]; then
  for f in "$LOG_DIR"/*.pid; do
    [ -f "$f" ] || continue
    pid=$(cat "$f")
    kill "$pid" 2>/dev/null || true
    rm -f "$f"
  done
fi
echo "Local services stopped. Postgres/Redis containers left running."
echo "To stop infra: cd infra/docker && docker compose down"
