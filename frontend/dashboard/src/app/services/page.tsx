"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  DataTable,
  DiagnosticBundle,
  EmptyState,
  PageHeader,
  SectionHeader,
} from "@aurixa/ui-kit";
import { getAnalytics, getServiceHealth } from "@/app/services/api";
import { MetricStrip, PageShell, StatusBadge } from "@/components/OperatorCompositions";

type Service = { key: string; name: string; status: string; latencyMs?: number };

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [analytics, setAnalytics] = useState<Awaited<ReturnType<typeof getAnalytics>> | null>(null);
  const [selected, setSelected] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [health, metrics] = await Promise.all([
        getServiceHealth(),
        getAnalytics().catch(() => null),
      ]);
      const next = Object.entries(health).map(([key, item]) => ({
        key,
        name: key.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
        status: item?.status ?? "unknown",
        latencyMs: item?.latencyMs,
      }));
      setServices(next);
      setAnalytics(metrics);
      setRefreshedAt(new Date());
      setSelected((current) => next.find((item) => item.key === current?.key) ?? null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Service health could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);

  const issues = services.filter((service) => service.status !== "healthy");
  const latencyValues = services.flatMap((service) =>
    service.latencyMs == null ? [] : [service.latencyMs],
  );
  const avgLatency = latencyValues.length
    ? latencyValues.reduce((sum, value) => sum + value, 0) / latencyValues.length
    : null;
  const metrics = useMemo(
    () => (selected ? analytics?.service_metrics?.[selected.key] : undefined),
    [analytics, selected],
  );

  return (
    <PageShell>
      <PageHeader
        eyebrow="Operate"
        title="Service operations"
        description="Live availability and latency from the service health endpoint. Select a row for available telemetry."
        actions={
          <Button onClick={refresh} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh checks"}
          </Button>
        }
        aside={
          <DiagnosticBundle
            title="Support snapshot"
            description="Copy current health and telemetry for support."
            data={() => ({ services, analytics })}
            context={{ selected: selected?.key, refreshedAt }}
            className="min-w-72 border-0 bg-transparent p-0"
          />
        }
      />
      {error && (
        <Alert title="Service health unavailable" tone="danger" className="mb-5">
          {error}
        </Alert>
      )}
      <MetricStrip
        items={[
          {
            label: "Services checked",
            value: loading ? "—" : services.length,
            detail: refreshedAt
              ? `Refreshed ${refreshedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
              : "Not yet checked",
          },
          {
            label: "Healthy",
            value: loading ? "—" : services.length - issues.length,
            detail: "Reported healthy",
          },
          {
            label: "Needs attention",
            value: loading ? "—" : issues.length,
            detail: issues.some((item) => item.status === "down")
              ? "Includes unavailable service"
              : "Degraded or unknown",
          },
          {
            label: "Average check latency",
            value: avgLatency == null ? "—" : `${avgLatency.toFixed(0)}ms`,
            detail: "Across checks with latency",
          },
        ]}
      />
      <div className="grid gap-7 xl:grid-cols-[minmax(0,1.5fr)_minmax(20rem,0.5fr)]">
        <section>
          <SectionHeader
            title="Current checks"
            description="Status is not inferred when the endpoint provides no result."
            count={services.length}
          />
          {!loading && !services.length ? (
            <EmptyState
              title="No service checks returned"
              description="Confirm that the API gateway is available, then refresh."
            />
          ) : (
            <DataTable
              caption="Current service health checks"
              headers={["Service", "Status", "Latency", "Action"]}
            >
              {loading ? (
                <tr>
                  <td colSpan={4} className="table-cell py-10 text-center">
                    Checking services…
                  </td>
                </tr>
              ) : (
                services.map((service) => (
                  <tr
                    key={service.key}
                    className={selected?.key === service.key ? "bg-white/[0.04]" : undefined}
                  >
                    <td className="table-cell font-semibold text-white">{service.name}</td>
                    <td className="table-cell">
                      <StatusBadge status={service.status} />
                    </td>
                    <td className="table-cell font-mono">
                      {service.latencyMs == null ? "Not reported" : `${service.latencyMs}ms`}
                    </td>
                    <td className="table-cell text-right">
                      <Button variant="quiet" onClick={() => setSelected(service)}>
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </DataTable>
          )}
        </section>
        <section>
          <SectionHeader
            title={selected ? selected.name : "Service detail"}
            description={
              selected ? "Available observability metrics." : "Select a service to inspect."
            }
          />
          {!selected ? (
            <EmptyState
              compact
              title="No service selected"
              description="Choose Inspect in the service table."
            />
          ) : (
            <div className="surface-card">
              <div className="mb-5 flex items-center justify-between">
                <span className="text-sm text-white/55">Current status</span>
                <StatusBadge status={selected.status} />
              </div>
              {metrics && Object.keys(metrics).length ? (
                <dl className="space-y-4">
                  {Object.entries(metrics).map(([event, value]) => (
                    <div key={event} className="border-t border-white/10 pt-3">
                      <dt className="text-sm font-semibold capitalize">
                        {event.replace(/_/g, " ")}
                      </dt>
                      <dd className="mt-1 text-xs leading-5 text-white/55">
                        {value?.count ?? 0} events · {(value?.avg_latency_ms ?? 0).toFixed(0)}ms
                        average · {(value?.p95_latency_ms ?? 0).toFixed(0)}ms p95
                        {value?.total_cost_usd != null
                          ? ` · $${value.total_cost_usd.toFixed(4)}`
                          : ""}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-sm leading-6 text-white/55">
                  No observability events were returned for this service.
                </p>
              )}
            </div>
          )}
        </section>
      </div>
    </PageShell>
  );
}
