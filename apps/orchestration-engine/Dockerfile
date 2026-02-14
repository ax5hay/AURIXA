FROM python:3.12-slim
WORKDIR /app

# Copy monorepo root files
COPY pyproject.toml pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./

# Copy service pyproject.toml
COPY apps/orchestration-engine/pyproject.toml apps/orchestration-engine/

# Copy shared packages
COPY packages/ packages/

# Install dependencies
RUN pip install --no-cache-dir -e ./apps/orchestration-engine

# Copy source code
COPY apps/orchestration-engine/src src/

EXPOSE 8001
CMD ["uvicorn", "orchestration_engine.main:app", "--host", "0.0.0.0", "--port", "8001"]
