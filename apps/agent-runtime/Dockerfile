FROM python:3.12-slim
WORKDIR /app

# Copy monorepo root files
COPY pyproject.toml pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./

# Copy service pyproject.toml
COPY apps/agent-runtime/pyproject.toml apps/agent-runtime/

# Copy shared packages
COPY packages/ packages/

# Copy source code (needed for editable install)
COPY apps/agent-runtime/src apps/agent-runtime/src/

# Install shared packages first, then service
RUN pip install --no-cache-dir -e ./packages/llm-clients -e ./apps/agent-runtime

EXPOSE 8003
CMD ["uvicorn", "agent_runtime.main:app", "--host", "0.0.0.0", "--port", "8003"]
