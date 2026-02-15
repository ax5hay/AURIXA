#!/usr/bin/env bash
# Download a Vosk model for offline STT (Linux only - no macOS wheel).
# Usage: ./scripts/download-vosk-model.sh [model-dir]
# Model dir defaults to ./models/vosk-en (set VOSK_MODEL_PATH to this).

set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MODEL_DIR="${1:-$ROOT/models/vosk-en}"
mkdir -p "$MODEL_DIR"
cd "$MODEL_DIR"

# Small English model (~50MB) - from https://alphacephei.com/vosk/models
URL="https://alphacephei.com/vosk/models/vosk-model-en-us-0.22.zip"
if [ ! -f "am/final.mdl" ]; then
  echo "Downloading Vosk English model..."
  curl -sL "$URL" -o model.zip
  unzip -o model.zip
  if [ -d "vosk-model-en-us-0.22" ]; then
    mv vosk-model-en-us-0.22/* . 2>/dev/null || true
    rm -rf vosk-model-en-us-0.22
  fi
  rm -f model.zip
  echo "Model saved to $MODEL_DIR"
else
  echo "Model already exists at $MODEL_DIR"
fi

echo "Set in .env: VOSK_MODEL_PATH=$MODEL_DIR"
