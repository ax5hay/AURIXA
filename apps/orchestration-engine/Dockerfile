FROM python:3.12-slim
WORKDIR /app

# Copy monorepo root files
COPY pyproject.toml pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./

# Copy service pyproject.toml
COPY apps/orchestration-engine/pyproject.toml apps/orchestration-engine/

# Copy shared packages
COPY packages/ packages/

# Copy source code (needed for editable install)
COPY apps/orchestration-engine/src apps/orchestration-engine/src/

# Install shared packages first, then service
RUN pip install --no-cache-dir -e ./packages/db -e ./apps/orchestration-engine

EXPOSE 8001
CMD ["uvicorn", "orchestration_engine.main:app", "--host", "0.0.0.0", "--port", "8001"]
