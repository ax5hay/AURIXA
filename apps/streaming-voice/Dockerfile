FROM python:3.12-slim
WORKDIR /app

# Copy monorepo root files
COPY pyproject.toml pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./

# Copy service pyproject.toml
COPY apps/streaming-voice/pyproject.toml apps/streaming-voice/

# Copy shared packages
COPY packages/ packages/

# Install dependencies
RUN pip install --no-cache-dir -e ./apps/streaming-voice

# Copy source code
COPY apps/streaming-voice/src src/

EXPOSE 8006
CMD ["uvicorn", "streaming_voice.main:app", "--host", "0.0.0.0", "--port", "8006"]
