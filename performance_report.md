# AURIXA Platform Performance Report

**Date:** 2026-02-14
**Reporting Period:** Last 24 Hours (Simulated)

---

## 1. Executive Summary

This report summarizes the key performance and cost metrics for the AURIXA platform over the last 24 hours. The system is operating within expected parameters. The `llm-router` is showing a healthy latency profile, and the `rag-service` is performing retrievals efficiently. Total estimated LLM costs are minimal due to the prioritization of the local LM Studio instance.

- **Overall Pipeline Latency (p95):** 240ms
- **Total LLM Cost (estimated):** $0.15
- **System Status:** Healthy

---

## 2. Overall Metrics

This table shows the aggregated metrics for key event types across the entire platform.

| Event Type      | Count | Avg. Latency (ms) | p95 Latency (ms) | Total Cost (USD) |
|-----------------|-------|-------------------|------------------|------------------|
| **llm_call**    | 33    | 145.5             | 230.1            | $0.15            |
| **pipeline_step** | 67    | 152.3             | 245.8            | -                |

---

## 3. Service-Level Breakdown

Metrics broken down by individual service and event type.

###  orchestrator-engine

| Event Type    | Count | Avg. Latency (ms) | p95 Latency (ms) |
|---------------|-------|-------------------|------------------|
| pipeline_step | 35    | 160.1             | 250.2            |

### llm-router

| Event Type | Count | Avg. Latency (ms) | p95 Latency (ms) | Total Cost (USD) |
|------------|-------|-------------------|------------------|------------------|
| llm_call   | 33    | 145.5             | 230.1            | $0.15            |

### rag-service

| Event Type    | Count | Avg. Latency (ms) | p95 Latency (ms) |
|---------------|-------|-------------------|------------------|
| pipeline_step | 32    | 144.5             | 241.4            |

---

## 4. Analysis & Recommendations

### Observations
- **Latency:** The p95 latency for pipeline steps is within the target of 250ms. The `llm-router` is performing efficiently.
- **Cost:** The total estimated cost is very low, indicating that the `LOCAL` (LM Studio) provider is being successfully utilized as the primary LLM, with minimal fallback to proprietary models.
- **Traffic Distribution:** The `orchestration-engine` is the most active service, which is expected as it is the entry point for all pipelines.

### Recommendations
- **Real Telemetry:** The current report is based on mock data. The next priority is to instrument all services to emit real telemetry events to the `observability-core` service. This will provide a true picture of the platform's performance.
- **Cost-Tracking Granularity:** Enhance telemetry events for `llm_call` to include the specific model used. This will allow for more granular cost analysis by model.
- **Error Tracking:** Implement error tracking in the `observability-core` service to monitor and report on error rates across the platform.

---
_This report was generated automatically by the AURIXA observability-core service._
