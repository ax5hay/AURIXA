FROM python:3.12-slim
WORKDIR /app

# Copy monorepo root files
COPY pyproject.toml pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./

# Copy service pyproject.toml
COPY apps/rag-service/pyproject.toml apps/rag-service/

# Copy shared packages
COPY packages/ packages/

# Copy source code (needed for editable install)
COPY apps/rag-service/src apps/rag-service/src/

# Install shared packages first, then service
RUN pip install --no-cache-dir -e ./packages/db -e ./apps/rag-service

EXPOSE 8004
CMD ["uvicorn", "rag_service.main:app", "--host", "0.0.0.0", "--port", "8004"]
