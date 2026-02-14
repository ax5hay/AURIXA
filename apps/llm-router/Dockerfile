FROM python:3.12-slim
WORKDIR /app

# Copy monorepo root files
COPY pyproject.toml pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./

# Copy service pyproject.toml
COPY apps/llm-router/pyproject.toml apps/llm-router/

# Copy shared packages
COPY packages/ packages/

# Install dependencies
RUN pip install --no-cache-dir -e ./apps/llm-router

# Copy source code
COPY apps/llm-router/src src/

EXPOSE 8002
CMD ["uvicorn", "llm_router.main:app", "--host", "0.0.0.0", "--port", "8002"]
