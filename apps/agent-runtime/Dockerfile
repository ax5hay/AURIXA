FROM python:3.12-slim
WORKDIR /app

# Copy monorepo root files
COPY pyproject.toml pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./

# Copy service pyproject.toml
COPY apps/agent-runtime/pyproject.toml apps/agent-runtime/

# Copy shared packages
COPY packages/ packages/

# Install dependencies
RUN pip install --no-cache-dir -e ./apps/agent-runtime

# Copy source code
COPY apps/agent-runtime/src src/

EXPOSE 8003
CMD ["uvicorn", "agent_runtime.main:app", "--host", "0.0.0.0", "--port", "8003"]
