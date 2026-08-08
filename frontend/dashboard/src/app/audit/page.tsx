"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, DataTable, DiagnosticBundle, EmptyState, PageHeader, Select } from "@aurixa/ui-kit";
import { getAuditLog, type AuditEntry } from "@/app/services/api";
import { FilterBar, PageShell, StatusBadge } from "@/components/OperatorCompositions";

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [service, setService] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);

  useEffect(() => {
    getAuditLog()
      .then((items) => {
        setLogs(items);
        setRefreshedAt(new Date());
      })
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : "Audit events could not be loaded."),
      )
      .finally(() => setLoading(false));
  }, []);

  const services = useMemo(
    () => Array.from(new Set(logs.map((log) => log.service))).sort(),
    [logs],
  );
  const filtered = logs.filter(
    (log) =>
      (service === "all" || log.service === service) &&
      (severity === "all" || log.severity === severity),
  );

  return (
    <PageShell>
      <PageHeader
        eyebrow="Investigate"
        title="Audit activity"
        description="Recorded platform actions. Entries shown here come directly from the audit API."
        aside={
          <DiagnosticBundle
            title="Audit snapshot"
            description="Copy the currently filtered entries."
            data={() => filtered}
            context={{ service, severity, refreshedAt }}
            className="min-w-72 border-0 bg-transparent p-0"
          />
        }
      />
      {error && (
        <Alert title="Audit activity unavailable" tone="danger" className="mb-5">
          {error}
        </Alert>
      )}
      <FilterBar
        result={`${filtered.length} ${filtered.length === 1 ? "entry" : "entries"}${refreshedAt ? ` · refreshed ${refreshedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}`}
      >
        <Select
          aria-label="Filter by service"
          value={service}
          onChange={(event) => setService(event.target.value)}
          className="sm:max-w-60"
        >
          <option value="all">All services</option>
          {services.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filter by severity"
          value={severity}
          onChange={(event) => setSeverity(event.target.value)}
          className="sm:max-w-52"
        >
          <option value="all">All severities</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="error">Error</option>
        </Select>
      </FilterBar>
      {!loading && !filtered.length ? (
        <EmptyState
          title="No matching audit entries"
          description={
            logs.length
              ? "Adjust the filters to broaden the result."
              : "The API returned no recorded activity."
          }
        />
      ) : (
        <DataTable
          caption="Filtered platform audit activity"
          headers={["Severity", "Timestamp", "Service", "Action", "User", "Details"]}
        >
          {loading ? (
            <tr>
              <td colSpan={6} className="table-cell py-10 text-center">
                Loading audit activity…
              </td>
            </tr>
          ) : (
            filtered.map((log) => (
              <tr key={log.id}>
                <td className="table-cell">
                  <StatusBadge status={log.severity} />
                </td>
                <td className="table-cell whitespace-nowrap font-mono text-xs">{log.timestamp}</td>
                <td className="table-cell">{log.service}</td>
                <td className="table-cell font-semibold text-white">{log.action}</td>
                <td className="table-cell font-mono text-xs">{log.user}</td>
                <td className="table-cell min-w-64">{log.details}</td>
              </tr>
            ))
          )}
        </DataTable>
      )}
    </PageShell>
  );
}
