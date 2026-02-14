FROM python:3.12-slim
WORKDIR /app

# Copy monorepo root files
COPY pyproject.toml pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./

# Copy service pyproject.toml
COPY apps/safety-guardrails/pyproject.toml apps/safety-guardrails/

# Copy shared packages
COPY packages/ packages/

# Install dependencies
RUN pip install --no-cache-dir -e ./apps/safety-guardrails

# Copy source code
COPY apps/safety-guardrails/src src/

EXPOSE 8005
CMD ["uvicorn", "safety_guardrails.main:app", "--host", "0.0.0.0", "--port", "8005"]
