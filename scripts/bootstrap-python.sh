#!/usr/bin/env bash
# One-time Python dependency setup. Run: ./scripts/bootstrap-python.sh
# Required before run-stack.sh if Python services fail with ModuleNotFoundError.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
export PROJECT_ROOT="$ROOT"

echo "Installing shared packages..."
pip install -e packages/db
pip install -e packages/llm-clients

echo "Installing Python apps..."
for app in orchestration-engine observability-core llm-router agent-runtime rag-service safety-guardrails streaming-voice execution-engine; do
  echo "  - $app"
  pip install -e "apps/$app"
done
echo "Done. You can now run ./scripts/run-stack.sh"
