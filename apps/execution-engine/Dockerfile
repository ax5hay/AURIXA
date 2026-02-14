FROM python:3.12-slim
WORKDIR /app

# Copy monorepo root files
COPY pyproject.toml pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./

# Copy service pyproject.toml
COPY apps/execution-engine/pyproject.toml apps/execution-engine/

# Copy shared packages
COPY packages/ packages/

# Install dependencies
RUN pip install --no-cache-dir -e ./apps/execution-engine

# Copy source code
COPY apps/execution-engine/src src/

EXPOSE 8007
CMD ["uvicorn", "execution_engine.main:app", "--host", "0.0.0.0", "--port", "8007"]
