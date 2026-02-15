FROM python:3.12-slim
WORKDIR /app

# ffmpeg for pydub (audio format conversion), curl for model download
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg curl && rm -rf /var/lib/apt/lists/*

# Copy monorepo root files
COPY pyproject.toml pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./

# Copy service pyproject.toml
COPY apps/streaming-voice/pyproject.toml apps/streaming-voice/

# Copy shared packages
COPY packages/ packages/

# Copy source code (needed for editable install)
COPY apps/streaming-voice/src apps/streaming-voice/src/

# Install dependencies (OSS STT: faster-whisper, vosk; OSS TTS: piper, edge-tts)
RUN pip install --no-cache-dir -e ./apps/streaming-voice

# Download Piper TTS model (OSS, local, no API key)
RUN mkdir -p /models/piper && cd /models/piper && \
    python -m piper.download_voices en_US-lessac-medium 2>/dev/null || \
    curl -sL -o en_US-lessac-medium.onnx \
    "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx"

ENV PIPER_MODEL_PATH="/models/piper/en_US-lessac-medium.onnx"
ENV VOSK_MODEL_PATH=""

EXPOSE 8006
CMD ["uvicorn", "streaming_voice.main:app", "--host", "0.0.0.0", "--port", "8006"]
