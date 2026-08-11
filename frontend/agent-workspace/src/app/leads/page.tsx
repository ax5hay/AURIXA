"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Alert,
  Button,
  Card,
  DataTable,
  EmptyState,
  PageHeader,
  PageLoader,
  SearchInput,
  StatusBadge,
} from "@aurixa/ui-kit";
import { getLeads, type Lead } from "../api";
import { useStaffContext } from "@/context/StaffContext";

export default function LeadsPage() {
  const { tenantId } = useStaffContext();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setLoadError(false);
    getLeads(tenantId)
      .then(setLeads)
      .catch(() => {
        setLeads([]);
        setLoadError(true);
      })
      .finally(() => setLoading(false));
  }, [tenantId]);

  const filtered = leads.filter((lead) => {
    const query = search.trim().toLowerCase();
    return (
      !query ||
      lead.fullName.toLowerCase().includes(query) ||
      lead.email?.toLowerCase().includes(query) ||
      lead.phoneNumber?.includes(query) ||
      lead.stage?.toLowerCase().includes(query)
    );
  });

  if (loading) return <PageLoader label="Loading leads" />;

  return (
    <div className="space-y-7 pb-8">
      <PageHeader
        eyebrow="Pipeline"
        title="Leads"
        description="Prospects and inquiry stages for your organization."
        actions={
          <Button asChild variant="secondary">
            <Link href="/chat">Ask the assistant</Link>
          </Button>
        }
      />

      {loadError && (
        <Alert title="Leads unavailable" tone="danger">
          Lead data could not be loaded for this organization.
        </Alert>
      )}

      <SearchInput
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search by name, email, or stage"
        aria-label="Search leads"
      />

      {filtered.length === 0 ? (
        <EmptyState
          title="No leads found"
          description={loadError ? "Try again later." : "No lead records match your search."}
        />
      ) : (
        <Card padding="none">
          <DataTable caption="Lead pipeline" headers={["Name", "Stage", "Status", "Email", "Source"]}>
            {filtered.map((lead) => (
              <tr key={lead.id} className="clinical-table-row">
                <td className="px-4 py-3 font-semibold text-ui-ink">{lead.fullName}</td>
                <td className="px-4 py-3 text-ui-muted">{lead.stage ?? "—"}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={lead.stage ?? "new"} />
                </td>
                <td className="px-4 py-3 text-ui-muted">{lead.email ?? "—"}</td>
                <td className="px-4 py-3 text-ui-muted">{lead.source ?? "—"}</td>
              </tr>
            ))}
          </DataTable>
        </Card>
      )}
    </div>
  );
}
