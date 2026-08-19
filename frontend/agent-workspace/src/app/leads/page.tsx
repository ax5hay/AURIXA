"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
  useToast,
} from "@aurixa/ui-kit";
import { getLeads, getStaleLeads, updateLeadStage, type Lead } from "../api";
import { useStaffContext } from "@/context/StaffContext";
import { DraftCopyButton } from "@/components/DraftCopyButton";
import { StaleBadge } from "@/components/MiniClientBrief";

export default function LeadsPage() {
  const searchParams = useSearchParams();
  const { tenantId } = useStaffContext();
  const { toast } = useToast();
  const staleOnly = searchParams.get("filter") === "stale";
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setLoadError(false);
    const fetcher = staleOnly ? getStaleLeads(tenantId) : getLeads(tenantId);
    fetcher
      .then(setLeads)
      .catch(() => {
        setLeads([]);
        setLoadError(true);
      })
      .finally(() => setLoading(false));
  }, [tenantId, staleOnly]);

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

  async function bumpStage(lead: Lead) {
    const next =
      lead.stage === "new"
        ? "contacted"
        : lead.stage === "contacted"
          ? "qualified"
          : "contacted";
    try {
      await updateLeadStage(lead.id, next);
      setLeads((current) =>
        current.map((item) => (item.id === lead.id ? { ...item, stage: next } : item)),
      );
      toast({ title: `Stage → ${next}`, tone: "success" });
    } catch {
      toast({ title: "Stage update failed", tone: "error" });
    }
  }

  if (loading) return <PageLoader label="Loading leads" />;

  return (
    <div className="space-y-7 pb-8">
      <PageHeader
        eyebrow="Pipeline"
        title={staleOnly ? "Stale leads" : "Leads"}
        description={
          staleOnly
            ? "Leads with no contact in 7+ days."
            : "Prospects and inquiry stages for your organization."
        }
        actions={
          <>
            <Button asChild variant={staleOnly ? "primary" : "secondary"}>
              <Link href={staleOnly ? "/leads" : "/leads?filter=stale"}>
                {staleOnly ? "All leads" : "Stale only"}
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/chat">Ask the assistant</Link>
            </Button>
          </>
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
          <DataTable
            caption="Lead pipeline"
            headers={["Name", "Stage", "Stale", "Email", "Actions"]}
          >
            {filtered.map((lead) => (
              <tr key={lead.id} className="clinical-table-row">
                <td className="px-4 py-3 font-semibold text-ui-ink">{lead.fullName}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={lead.stage ?? "new"} />
                </td>
                <td className="px-4 py-3">
                  {lead.daysStale != null ? (
                    <StaleBadge days={lead.daysStale} />
                  ) : (
                    <span className="text-ui-muted">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-ui-muted">{lead.email ?? "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={() => void bumpStage(lead)}>
                      Advance stage
                    </Button>
                    {lead.clientId && (
                      <DraftCopyButton
                        clientId={lead.clientId}
                        draftType="follow_up"
                        label="Draft SMS"
                        context={`Lead stage: ${lead.stage}`}
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </DataTable>
        </Card>
      )}
    </div>
  );
}
