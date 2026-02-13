"""Pydantic models for the Observability Core service."""

from pydantic import BaseModel, Field
from typing import List, Dict, Any, Literal
import time

class TelemetryEvent(BaseModel):
    """Represents a single telemetry event from a downstream service."""
    service_name: str = Field(description="The name of the service that generated the event.")
    event_type: Literal["llm_call", "api_call", "pipeline_step"] = Field(description="The type of event.")
    timestamp: float = Field(description="The timestamp of the event.", default_factory=time.time)
    data: Dict[str, Any] = Field(description="The data associated with the event.", default_factory=dict)

class PerformanceMetrics(BaseModel):
    """Metrics for a specific service or event type."""
    count: int = Field(description="The number of events.")
    avg_latency_ms: float = Field(description="Average latency in milliseconds.")
    p95_latency_ms: float = Field(description="95th percentile latency in milliseconds.")
    total_cost_usd: float | None = Field(description="Total estimated cost in USD (for LLM calls).", default=None)
    
class PerformanceReport(BaseModel):
    """A summary of platform performance."""
    generated_at: float = Field(description="The timestamp when the report was generated.", default_factory=time.time)
    overall_metrics: Dict[str, PerformanceMetrics] = Field(description="Overall metrics by event type.")
    service_metrics: Dict[str, Dict[str, PerformanceMetrics]] = Field(description="Metrics broken down by service.")
