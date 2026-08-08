FROM python:3.12-slim
WORKDIR /app

COPY packages/ packages/
COPY apps/deployment-controller/pyproject.toml apps/deployment-controller/
COPY apps/deployment-controller/src apps/deployment-controller/src/
RUN pip install --no-cache-dir -e ./packages/db -e ./apps/deployment-controller

EXPOSE 8009
CMD ["uvicorn", "deployment_controller.main:app", "--host", "0.0.0.0", "--port", "8009"]
