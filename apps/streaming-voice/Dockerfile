FROM python:3.12-slim
WORKDIR /app

# ffmpeg for pydub (audio format conversion for OSS STT)
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*

# Copy monorepo root files
COPY pyproject.toml pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./

# Copy service pyproject.toml
COPY apps/streaming-voice/pyproject.toml apps/streaming-voice/

# Copy shared packages
COPY packages/ packages/

# Install dependencies (vosk, faster-whisper, pydub for OSS STT)
RUN pip install --no-cache-dir -e ./apps/streaming-voice

# Copy source code
COPY apps/streaming-voice/src src/

# Optional: mount VOSK_MODEL_PATH at /models/vosk
ENV VOSK_MODEL_PATH=""

EXPOSE 8006
CMD ["uvicorn", "streaming_voice.main:app", "--host", "0.0.0.0", "--port", "8006"]
