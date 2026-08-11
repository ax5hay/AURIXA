"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  EmptyState,
  PageHeader,
  SectionHeader,
  Timeline,
  WorkQueue,
} from "@aurixa/ui-kit";
import {
  getAnalytics,
  getAnalyticsSummary,
  getAuditLog,
  getServiceHealth,
  getTenants,
  type AnalyticsSummary,
  type AuditEntry,
  type ServiceHealth,
} from "@/app/services/api";
import { MetricStrip, PageShell, StatusBadge } from "@/components/OperatorCompositions";
import { useOperator } from "@/context/OperatorContext";

export default function DashboardPage() {
  const { role } = useOperator();
  const [health, setHealth] = useState<ServiceHealth>({});
  const [tenants, setTenants] = useState<Awaited<ReturnType<typeof getTenants>>>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [analytics, setAnalytics] = useState<Awaited<ReturnType<typeof getAnalytics>> | null>(null);
  const [domainSummary, setDomainSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    const results = await Promise.allSettled([
      getServiceHealth(),
      getTenants(),
      getAuditLog(12),
      getAnalytics(),
      getAnalyticsSummary(),
    ]);
    if (results[0].status === "fulfilled") setHealth(results[0].value);
    if (results[1].status === "fulfilled") setTenants(results[1].value);
    if (results[2].status === "fulfilled") setAudit(results[2].value);
    if (results[3].status === "fulfilled") setAnalytics(results[3].value);
    if (results[4].status === "fulfilled") setDomainSummary(results[4].value);
    if (results.every((result) => result.status === "rejected"))
      setError("The console could not reach the platform APIs.");
    setRefreshedAt(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 30000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const serviceEntries = Object.entries(health);
  const issues = serviceEntries.filter(([, item]) => item?.status !== "healthy");
  const activeTenants = tenants.filter((tenant) => tenant.status === "active").length;
  const totals = useMemo(() => {
    const values = Object.values(analytics?.overall_metrics ?? {});
    return {
      events: values.reduce((sum, item) => sum + (item?.count ?? 0), 0),
      cost: values.reduce((sum, item) => sum + (item?.total_cost_usd ?? 0), 0),
    };
  }, [analytics]);
  const stale = refreshedAt ? Date.now() - refreshedAt.getTime() > 60000 : false;
  const roleIntro =
    role === "analyst"
      ? "Usage, performance, and recent platform activity."
      : role === "support"
        ? "Current service issues and the activity needed to investigate them."
        : role === "administrator"
          ? "Operational health, organizations, and configuration activity."
          : "What needs attention across the platform right now.";

  return (
    <PageShell>
      <PageHeader
        eyebrow={`${role[0].toUpperCase()}${role.slice(1)} view`}
        title="Platform overview"
        description={roleIntro}
        actions={
          <Button onClick={refresh} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh data"}
          </Button>
        }
        aside={
          <StatusBadge
            status={
              loading
                ? undefined
                : issues.length
                  ? "degraded"
                  : serviceEntries.length
                    ? "healthy"
                    : undefined
            }
            label={
              loading
                ? "Checking health"
                : issues.length
                  ? `${issues.length} service issue${issues.length === 1 ? "" : "s"}`
                  : serviceEntries.length
                    ? "Services healthy"
                    : "Health unknown"
            }
          />
        }
      />

      {error && (
        <Alert title="Platform data unavailable" tone="danger" className="mb-6">
          {error}
        </Alert>
      )}
      {stale && (
        <Alert title="This view may be stale" tone="warning" className="mb-6">
          The last successful refresh was more than a minute ago.
        </Alert>
      )}

      <MetricStrip
        items={[
          {
            label: "Service checks",
            value: loading ? "—" : serviceEntries.length,
            detail: serviceEntries.length
              ? `${serviceEntries.length - issues.length} healthy`
              : "No response",
          },
          {
            label: "Active organizations",
            value: loading ? "—" : activeTenants,
            detail: `${tenants.length} total`,
          },
          {
            label: "Telemetry events",
            value: loading ? "—" : totals.events.toLocaleString(),
            detail: "Reported by observability",
          },
          {
            label: "Estimated LLM cost",
            value: loading ? "—" : `$${totals.cost.toFixed(2)}`,
            detail: refreshedAt
              ? `Updated ${refreshedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
              : "Not refreshed",
          },
        ]}
      />

      <MetricStrip
        items={[
          {
            label: "Clients",
            value: loading
              ? "—"
              : (
                  domainSummary?.clients_count ??
                  domainSummary?.patients_count ??
                  0
                ).toLocaleString(),
            detail: "Across all organizations",
          },
          {
            label: "Showings",
            value: loading
              ? "—"
              : (
                  domainSummary?.showings_count ??
                  domainSummary?.appointments_count ??
                  0
                ).toLocaleString(),
            detail: "Scheduled or completed",
          },
          {
            label: "Listings",
            value: loading ? "—" : (domainSummary?.listings_count ?? 0).toLocaleString(),
            detail: "Active inventory records",
          },
          {
            label: "Leads",
            value: loading ? "—" : (domainSummary?.leads_count ?? 0).toLocaleString(),
            detail: "Pipeline prospects",
          },
        ]}
      />

      <div className="grid gap-7 xl:grid-cols-[minmax(0,1.4fr)_minmax(20rem,0.6fr)]">
        <section>
          <SectionHeader
            title="Needs attention"
            description="Only conditions reported by platform APIs appear here."
            action={
              <Link href="/services" className="button-secondary">
                Open services
              </Link>
            }
          />
          <WorkQueue
            items={issues.map(([name, item]) => ({
              id: name,
              title: name.replace(/-/g, " "),
              description: `Health check reports ${item?.status ?? "unknown"}${item?.latencyMs != null ? ` at ${item.latencyMs}ms` : ""}.`,
              leading: <StatusBadge status={item?.status} />,
              urgent: item?.status === "down",
              action: (
                <Link href="/services" className="button-secondary">
                  Inspect
                </Link>
              ),
            }))}
            empty={
              <EmptyState
                compact
                title={
                  loading
                    ? "Checking platform health"
                    : serviceEntries.length
                      ? "No service issues reported"
                      : "Health is unknown"
                }
                description={
                  loading
                    ? "Service checks are in progress."
                    : serviceEntries.length
                      ? "All returned checks are healthy."
                      : "No service health response has been received."
                }
              />
            }
          />
        </section>

        <section>
          <SectionHeader
            title="Recent recorded activity"
            description="Latest audit entries returned by the platform."
            action={
              <Link href="/audit" className="text-sm font-semibold text-teal-300">
                View audit
              </Link>
            }
          />
          {audit.length ? (
            <Timeline
              items={audit.slice(0, 6).map((item) => ({
                id: item.id,
                title: `${item.service} · ${item.action}`,
                description: item.details,
                time: item.timestamp,
                icon: item.severity === "error" ? "!" : item.severity === "warning" ? "△" : "•",
              }))}
            />
          ) : (
            <EmptyState
              compact
              title={loading ? "Loading activity" : "No audit entries returned"}
              description="The console does not generate placeholder events."
            />
          )}
        </section>
      </div>

      <section className="mt-9 border-t border-white/10 pt-7">
        <SectionHeader
          title="Next actions"
          description="Common operator paths based on available capabilities."
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <Link href="/audit" className="surface-card glass-hover">
            <strong className="block">Review activity</strong>
            <span className="mt-1 block text-sm text-white/55">
              Filter recorded changes and errors.
            </span>
          </Link>
          <Link href="/tenants" className="surface-card glass-hover">
            <strong className="block">Check organizations</strong>
            <span className="mt-1 block text-sm text-white/55">
              Review active, pending, or suspended tenants.
            </span>
          </Link>
          <Link href="/playground" className="surface-card glass-hover">
            <strong className="block">Test a pipeline</strong>
            <span className="mt-1 block text-sm text-white/55">
              Run existing test and execution APIs.
            </span>
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
