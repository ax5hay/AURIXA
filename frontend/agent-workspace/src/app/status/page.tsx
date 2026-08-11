"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Card,
  DiagnosticBundle,
  EmptyState,
  PageHeader,
  PageLoader,
  SectionHeader,
} from "@aurixa/ui-kit";
import { getAuditLog, getServiceHealth, type AuditEntry, type ServiceHealth } from "../api";

function formatName(name: string) {
  return name.replace(/-/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

export default function StatusPage() {
  const [health, setHealth] = useState<ServiceHealth>({});
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [freshAt, setFreshAt] = useState<Date | null>(null);

  useEffect(() => {
    Promise.all([getServiceHealth().then(setHealth), getAuditLog(20).then(setAudit)]).finally(
      () => {
        setFreshAt(new Date());
        setLoading(false);
      },
    );
  }, []);

  const services = Object.entries(health);
  const healthyCount = services.filter(([, info]) => info?.status === "healthy").length;
  const severityCounts = useMemo(
    () =>
      audit.reduce<Record<string, number>>((counts, entry) => {
        counts[entry.severity] = (counts[entry.severity] ?? 0) + 1;
        return counts;
      }, {}),
    [audit],
  );

  if (loading) return <PageLoader label="Loading operations status" />;

  return (
    <div className="space-y-7 pb-8">
      <PageHeader
        eyebrow="Administrative operations"
        title="Service status"
        description="Operational service signals and privacy-minimized audit activity, restricted to verified operations roles."
        aside={
          <p className="text-xs text-ui-muted">
            {freshAt
              ? `Checked at ${freshAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
              : "Not yet checked"}
          </p>
        }
      />
      <section>
        <SectionHeader
          title="Service semantics"
          description="Healthy means the latest health endpoint reported healthy; it does not guarantee every workflow."
          count={services.length}
        />
        {services.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {services.map(([name, info]) => {
              const healthy = info?.status === "healthy";
              return (
                <Card key={name} variant="compact" padding="md">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-ui-ink">{formatName(name)}</h3>
                      <p className="mt-1 text-xs text-ui-muted">
                        {info?.latencyMs != null
                          ? `Reported latency ${info.latencyMs} ms`
                          : "No latency reported"}
                      </p>
                    </div>
                    <Badge tone={healthy ? "success" : "warning"} dot>
                      {healthy ? "Healthy" : info?.status || "Unknown"}
                    </Badge>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <EmptyState
            compact
            title="No service status returned"
            description="The health endpoint did not return service-level information."
          />
        )}
        <p className="mt-3 text-sm font-semibold text-ui-muted">
          {healthyCount} of {services.length} reported healthy at the last check
        </p>
      </section>

      <section>
        <SectionHeader
          title="Recent audit activity"
          description="Details and user fields are intentionally omitted to reduce exposure of sensitive information."
          count={audit.length}
        />
        <Card variant="compact" padding="none">
          {audit.length ? (
            <ul className="divide-y divide-ui-border">
              {audit.map((entry) => (
                <li
                  key={entry.id}
                  className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center"
                >
                  <time className="font-mono text-xs text-ui-faint">
                    {new Date(entry.timestamp).toLocaleString()}
                  </time>
                  <p className="min-w-0 flex-1 text-sm font-semibold text-ui-ink">
                    {entry.service} · {entry.action}
                  </p>
                  <Badge
                    tone={
                      entry.severity === "error"
                        ? "danger"
                        : entry.severity === "warning"
                          ? "warning"
                          : "neutral"
                    }
                  >
                    {entry.severity}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-5">
              <EmptyState compact title="No audit activity returned" />
            </div>
          )}
        </Card>
      </section>

      <DiagnosticBundle
        title="Privacy-safe support bundle"
        description="Copies service health and aggregate audit counts only. Client, user, and audit detail fields are excluded."
        data={{ health, auditSummary: severityCounts, auditEntryCount: audit.length }}
        context={{ checkedAt: freshAt?.toISOString(), application: "AURIXA Agent Workspace" }}
      />
    </div>
  );
}
