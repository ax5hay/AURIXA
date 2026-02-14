FROM python:3.12-slim
WORKDIR /app

# Copy monorepo root files
COPY pyproject.toml pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./

# Copy service pyproject.toml
COPY apps/rag-service/pyproject.toml apps/rag-service/

# Copy shared packages
COPY packages/ packages/

# Install dependencies
RUN pip install --no-cache-dir -e ./apps/rag-service

# Copy source code
COPY apps/rag-service/src src/

EXPOSE 8004
CMD ["uvicorn", "rag_service.main:app", "--host", "0.0.0.0", "--port", "8004"]
