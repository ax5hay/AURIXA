FROM python:3.12-slim
WORKDIR /app

# Copy monorepo root files
COPY pyproject.toml pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./

# Copy service pyproject.toml
COPY apps/llm-router/pyproject.toml apps/llm-router/

# Copy shared packages
COPY packages/ packages/

# Copy source code (needed for editable install)
COPY apps/llm-router/src apps/llm-router/src/

# Install shared packages first, then service
RUN pip install --no-cache-dir -e ./packages/llm-clients -e ./apps/llm-router

EXPOSE 8002
CMD ["uvicorn", "llm_router.main:app", "--host", "0.0.0.0", "--port", "8002"]
