FROM python:3.12-slim
WORKDIR /app

# Copy monorepo root files
COPY pyproject.toml pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./

# Copy service pyproject.toml
COPY apps/observability-core/pyproject.toml apps/observability-core/

# Copy shared packages
COPY packages/ packages/

# Install dependencies
RUN pip install --no-cache-dir -e ./apps/observability-core

# Copy source code
COPY apps/observability-core/src src/

EXPOSE 8008
CMD ["uvicorn", "observability_core.main:app", "--host", "0.0.0.0", "--port", "8008"]
