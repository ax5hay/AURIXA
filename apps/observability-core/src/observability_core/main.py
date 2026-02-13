from contextlib import asynccontextmanager
from fastapi import FastAPI
from loguru import logger
import numpy as np
import random

from .models import TelemetryEvent, PerformanceReport, PerformanceMetrics

# Use an in-memory list to store events for this mock implementation
# A real implementation would use a time-series database like Prometheus or InfluxDB.
TELEMETRY_EVENTS: list[TelemetryEvent] = []


def generate_mock_data():
    """Create some fake telemetry data for demonstration."""
    services = ["orchestration-engine", "llm-router", "rag-service"]
    for _ in range(100):
        service = random.choice(services)
        event_type = "llm_call" if service == "llm-router" else "pipeline_step"
        cost = random.uniform(0.001, 0.01) if event_type == "llm_call" else None
        latency = random.gauss(150, 50)
        
        event = TelemetryEvent(
            service_name=service,
            event_type=event_type,
            data={"latency_ms": latency, "cost_usd": cost}
        )
        TELEMETRY_EVENTS.append(event)
    logger.info("Generated {} mock telemetry events.", len(TELEMETRY_EVENTS))

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Log service startup and shutdown, and generate mock data."""
    logger.info("Observability Core service starting up")
    generate_mock_data()
    yield
    logger.info("Observability Core service shutting down")


app = FastAPI(
    title="AURIXA Observability Core",
    version="0.1.0",
    lifespan=lifespan,
    description="Service for aggregating and reporting on platform-wide telemetry.",
)


@app.get("/health", summary="Health check endpoint")
async def health():
    """Return a 200 OK status if the service is healthy."""
    return {"service": "observability-core", "status": "healthy", "event_count": len(TELEMETRY_EVENTS)}


@app.post("/api/v1/telemetry", status_code=202, summary="Submit a telemetry event")
async def submit_telemetry(event: TelemetryEvent):
    """Receives and stores a single telemetry event."""
    logger.debug("Received event from {}: {}", event.service_name, event.event_type)
    TELEMETRY_EVENTS.append(event)
    return {"status": "accepted"}


@app.get("/api/v1/reports/performance", response_model=PerformanceReport, summary="Generate a performance report")
async def get_performance_report():
    """Analyzes stored telemetry to generate a performance report."""
    logger.info("Generating performance report from {} events.", len(TELEMETRY_EVENTS))
    
    # This is a simplified analysis. A real implementation would be more complex.
    overall_metrics = {}
    service_metrics = {}

    all_events = TELEMETRY_EVENTS
    event_types = {e.event_type for e in all_events}
    services = {e.service_name for e in all_events}

    for et in event_types:
        events = [e for e in all_events if e.event_type == et]
        latencies = [e.data["latency_ms"] for e in events if "latency_ms" in e.data]
        costs = [e.data["cost_usd"] for e in events if e.data.get("cost_usd")]
        
        overall_metrics[et] = PerformanceMetrics(
            count=len(events),
            avg_latency_ms=np.mean(latencies) if latencies else 0,
            p95_latency_ms=np.percentile(latencies, 95) if latencies else 0,
            total_cost_usd=sum(costs) if costs else None
        )

    for sn in services:
        service_metrics[sn] = {}
        for et in event_types:
            events = [e for e in all_events if e.service_name == sn and e.event_type == et]
            if not events:
                continue
            latencies = [e.data["latency_ms"] for e in events if "latency_ms" in e.data]
            costs = [e.data["cost_usd"] for e in events if e.data.get("cost_usd")]
            
            service_metrics[sn][et] = PerformanceMetrics(
                count=len(events),
                avg_latency_ms=np.mean(latencies) if latencies else 0,
                p95_latency_ms=np.percentile(latencies, 95) if latencies else 0,
                total_cost_usd=sum(costs) if costs else None
            )

    return PerformanceReport(
        overall_metrics=overall_metrics,
        service_metrics=service_metrics,
    )
