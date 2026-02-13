FROM python:3.12-slim
WORKDIR /app
COPY pyproject.toml .
RUN pip install uv && uv pip install --system -r pyproject.toml
COPY src/ src/
EXPOSE 8004
CMD ["uvicorn", "rag_service.main:app", "--host", "0.0.0.0", "--port", "8004"]
