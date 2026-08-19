"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Alert,
  AsyncBoundary,
  Button,
  Card,
  EmptyState,
  PageHeader,
  PageLoader,
  SectionHeader,
  StatusBadge,
  WorkQueue,
  humanizeStatus,
  useToast,
} from "@aurixa/ui-kit";
import {
  getShowings,
  getClients,
  getOvernightActivity,
  getStaleActivity,
  getEscalations,
  reviewEscalation,
  updateShowingStatus,
  getKnowledgeArticles,
  type Showing,
  type Client,
  type OvernightActivityItem,
  type SafetyEscalation,
  type StaleActivity,
  type KnowledgeArticle,
} from "./api";
import { useStaffContext } from "@/context/StaffContext";
import { MiniClientBrief, StaleBadge } from "@/components/MiniClientBrief";
import { DraftCopyButton } from "@/components/DraftCopyButton";
import { PostShowingNoteModal } from "@/components/PostShowingNoteModal";

function parseTenantId(value: string): number | undefined {
  const parsed = parseInt(value.replace(/^t-0*/, ""), 10);
  return value && !isNaN(parsed) ? parsed : undefined;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

const QUEUE_ORDER = ["confirmed", "completed", "cancelled", "no_show"] as const;

export default function TodayPage() {
  return (
    <AsyncBoundary loadingLabel="Loading today’s pipeline" resetKeys={["today"]}>
      <TodayContent />
    </AsyncBoundary>
  );
}

function TodayContent() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { tenantFilter, tenantId, staff, roleCategory } = useStaffContext();
  const canCoordinate = roleCategory === "agent" || roleCategory === "coordination";
  const [clients, setClients] = useState<Client[]>([]);
  const [showings, setShowings] = useState<Showing[]>([]);
  const [overnight, setOvernight] = useState<OvernightActivityItem[]>([]);
  const [stale, setStale] = useState<StaleActivity | null>(null);
  const [escalations, setEscalations] = useState<SafetyEscalation[]>([]);
  const [pinnedFaqs, setPinnedFaqs] = useState<KnowledgeArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [freshAt, setFreshAt] = useState<Date | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [noteModal, setNoteModal] = useState<{
    showingId: number;
    clientId: number;
    clientName: string;
  } | null>(null);

  const tid = tenantId ?? parseTenantId(tenantFilter);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
    Promise.all([
      getClients(tid),
      getShowings({ tenantId: tid, dateFrom: today, dateTo: tomorrow, limit: 200 }),
      getOvernightActivity(tid).catch(() => ({ since: "", items: [] })),
      getStaleActivity(tid).catch(() => ({ staleLeads: [], coldClients: [] })),
      getEscalations(tid).catch(() => []),
      getKnowledgeArticles(tid).catch(() => []),
    ])
      .then(([clientRecords, showingRecords, overnightData, staleData, escData, faqs]) => {
        setClients(clientRecords);
        setShowings(showingRecords);
        setOvernight(overnightData.items);
        setStale(staleData);
        setEscalations(escData);
        setPinnedFaqs(faqs.slice(0, 8));
        setFreshAt(new Date());
      })
      .catch(() => {
        setClients([]);
        setShowings([]);
        setLoadError(true);
      })
      .finally(() => setLoading(false));
  }, [tid]);

  useEffect(() => {
    load();
  }, [load]);

  const clientMap = useMemo(
    () => Object.fromEntries(clients.map((client) => [client.id, client])),
    [clients],
  );

  const clientUpcoming = useMemo(() => {
    const map: Record<number, Showing> = {};
    for (const showing of showings) {
      const cid = showing.clientId ?? showing.patientId;
      if (!cid || showing.status !== "confirmed") continue;
      if (!map[cid] || new Date(showing.startTime) < new Date(map[cid].startTime)) {
        map[cid] = showing;
      }
    }
    return map;
  }, [showings]);

  const ranked = [...showings].sort((a, b) => {
    const statusRank = (status: string) => {
      const index = QUEUE_ORDER.indexOf(status as (typeof QUEUE_ORDER)[number]);
      return index === -1 ? QUEUE_ORDER.length : index;
    };
    return (
      statusRank(a.status) - statusRank(b.status) || +new Date(a.startTime) - +new Date(b.startTime)
    );
  });

  const upcoming = showings.filter((s) => s.status === "confirmed");
  const completed = showings.filter((s) => s.status === "completed");
  const cancelled = showings.filter((s) => s.status === "cancelled");

  async function transition(showing: Showing, status: string) {
    const cid = showing.clientId ?? showing.patientId;
    if (status === "completed" && cid) {
      setNoteModal({
        showingId: showing.id,
        clientId: cid,
        clientName: clientMap[cid]?.fullName ?? `Client #${cid}`,
      });
      return;
    }
    setUpdatingId(showing.id);
    try {
      await updateShowingStatus(showing.id, status);
      setShowings((current) =>
        current.map((item) => (item.id === showing.id ? { ...item, status } : item)),
      );
      toast({
        title: "Showing status updated",
        description: `${humanizeStatus(status)} recorded.`,
        tone: "success",
      });
    } catch (reason) {
      toast({
        title: "Status update failed",
        description: reason instanceof Error ? reason.message : "Try again.",
        tone: "error",
      });
    } finally {
      setUpdatingId(null);
    }
  }

  async function markEscalationReviewed(id: number) {
    try {
      await reviewEscalation(id);
      setEscalations((current) => current.filter((item) => item.id !== id));
      toast({ title: "Marked reviewed", tone: "success" });
    } catch {
      toast({ title: "Could not update escalation", tone: "error" });
    }
  }

  if (loading) return <PageLoader label="Loading today’s pipeline" />;

  return (
    <div className="space-y-7 pb-8">
      <PageHeader
        eyebrow="Today’s pipeline"
        title={staff ? `Good day, ${staff.fullName.split(" ")[0]}` : "Agent overview"}
        description="Showings, overnight activity, stale follow-ups, and flagged messages."
        actions={
          <>
            <Button variant="secondary" onClick={load}>
              Refresh
            </Button>
            {canCoordinate && (
              <Button asChild>
                <Link href="/schedule">Schedule showing</Link>
              </Button>
            )}
            <Button asChild variant="secondary">
              <Link href="/clients">Find client</Link>
            </Button>
          </>
        }
        aside={
          <div className="text-right text-xs text-ui-muted">
            <p className="font-semibold text-ui-ink">{showings.length} showings in view</p>
            <p>
              {freshAt
                ? `Updated at ${freshAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
                : "Not yet updated"}
            </p>
          </div>
        }
      />

      {loadError && (
        <Alert title="Today’s queue is unavailable" tone="danger">
          <p>Showings or client data could not be verified for this organization.</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={load}>
            Try again
          </Button>
        </Alert>
      )}
      {searchParams.get("access") === "denied" && (
        <Alert title="Page not available for this role" tone="warning">
          Your verified role does not include access to the requested workspace area.
        </Alert>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card variant="compact" padding="md">
          <p className="text-xs font-semibold text-ui-muted">Upcoming</p>
          <p className="mt-2 text-3xl font-semibold text-ui-ink">{upcoming.length}</p>
        </Card>
        <Card variant="compact" padding="md">
          <p className="text-xs font-semibold text-ui-muted">Overnight activity</p>
          <p className="mt-2 text-3xl font-semibold text-ui-ink">{overnight.length}</p>
        </Card>
        <Card variant="compact" padding="md">
          <p className="text-xs font-semibold text-ui-muted">Needs follow-up</p>
          <p className="mt-2 text-3xl font-semibold text-ui-ink">
            {(stale?.staleLeads.length ?? 0) + (stale?.coldClients.length ?? 0)}
          </p>
        </Card>
        <Card variant="compact" padding="md">
          <p className="text-xs font-semibold text-ui-muted">Flagged messages</p>
          <p className="mt-2 text-3xl font-semibold text-ui-ink">{escalations.length}</p>
        </Card>
      </div>

      {pinnedFaqs.length > 0 && (
        <section>
          <SectionHeader
            title="Brokerage quick reference"
            description="Top policy FAQs — search Knowledge for more."
            action={
              <Button asChild variant="quiet">
                <Link href="/knowledge">All articles</Link>
              </Button>
            }
          />
          <div className="flex flex-wrap gap-2">
            {pinnedFaqs.map((article) => (
              <Button key={article.id} asChild variant="secondary" size="sm">
                <Link href={`/knowledge?q=${encodeURIComponent(article.title)}`}>
                  {article.title}
                </Link>
              </Button>
            ))}
          </div>
        </section>
      )}

      {overnight.length > 0 && (
        <section>
          <SectionHeader
            title="Overnight client activity"
            description="Messages and requests while you were away."
            count={overnight.length}
          />
          <WorkQueue
            items={overnight.map((item) => ({
              id: `${item.type}-${item.id}`,
              title: item.summary,
              description: item.at ? new Date(item.at).toLocaleString() : "",
              meta: <StatusBadge status={item.type} label={item.type} />,
              action: item.clientId ? (
                <Button asChild variant="quiet" size="sm">
                  <Link href={`/clients/${item.clientId}`}>Open client</Link>
                </Button>
              ) : undefined,
            }))}
          />
        </section>
      )}

      {escalations.length > 0 && (
        <section>
          <SectionHeader
            title="Flagged for review"
            description="Fair housing, fraud, or policy escalations."
            count={escalations.length}
          />
          <WorkQueue
            items={escalations.map((esc) => ({
              id: esc.id,
              title: esc.clientName ?? "Unknown client",
              description: esc.sourceText.slice(0, 120),
              meta: (
                <StatusBadge
                  status={esc.escalationType ?? "review"}
                  label={esc.escalationType ?? "review"}
                />
              ),
              urgent: true,
              action: (
                <div className="flex flex-wrap gap-2">
                  {esc.clientId && (
                    <Button asChild variant="quiet" size="sm">
                      <Link href={`/clients/${esc.clientId}`}>Open client</Link>
                    </Button>
                  )}
                  <Button size="sm" onClick={() => void markEscalationReviewed(esc.id)}>
                    Mark reviewed
                  </Button>
                </div>
              ),
            }))}
          />
        </section>
      )}

      {stale && (stale.staleLeads.length > 0 || stale.coldClients.length > 0) && (
        <section>
          <SectionHeader
            title="Stale leads & cold clients"
            description="No contact in 7+ days — prioritize outreach."
            count={stale.staleLeads.length + stale.coldClients.length}
            action={
              <Button asChild variant="quiet">
                <Link href="/leads?filter=stale">All leads</Link>
              </Button>
            }
          />
          <div className="grid gap-3 lg:grid-cols-2">
            {stale.staleLeads.slice(0, 5).map((lead) => (
              <Card key={`lead-${lead.id}`} variant="compact" padding="md">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ui-ink">{lead.fullName}</p>
                    <p className="text-xs text-ui-muted">{lead.stage} · {lead.source}</p>
                  </div>
                  {lead.daysStale != null && <StaleBadge days={lead.daysStale} />}
                </div>
                {lead.clientId && (
                  <div className="mt-3">
                    <DraftCopyButton
                      clientId={lead.clientId}
                      draftType="follow_up"
                      label="Draft follow-up SMS"
                      context={`Stale lead in stage ${lead.stage}`}
                    />
                  </div>
                )}
              </Card>
            ))}
            {stale.coldClients.slice(0, 5).map((client) => (
              <Card key={`cold-${client.id}`} variant="compact" padding="md">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ui-ink">{client.fullName}</p>
                    <p className="text-xs text-ui-muted">
                      Last showing {client.lastShowingStatus ?? "—"}
                    </p>
                  </div>
                  <StaleBadge days={client.daysCold} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button asChild variant="quiet" size="sm">
                    <Link href={`/clients/${client.id}`}>Open client</Link>
                  </Button>
                  <DraftCopyButton
                    clientId={client.id}
                    draftType="follow_up"
                    label="Draft check-in"
                  />
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionHeader
          title="Showing queue"
          description="Manage today’s property tours with client briefs."
          count={ranked.length}
          action={
            <Button asChild variant="quiet">
              <Link href="/showings">Full schedule</Link>
            </Button>
          }
        />
        <WorkQueue
          items={ranked.map((showing) => {
            const cid = showing.clientId ?? showing.patientId;
            const client = cid ? clientMap[cid] : undefined;
            const overdue = showing.status === "confirmed" && new Date(showing.startTime) < new Date();
            const agent = showing.agentName || showing.providerName || "Agent";
            return {
              id: showing.id,
              title: client?.fullName ?? `Client #${cid ?? "unlinked"}`,
              description: `${agent} · ${formatTime(showing.startTime)}${
                overdue ? " · Overdue" : ""
              }`,
              meta: <StatusBadge status={showing.status} />,
              urgent: overdue,
              body: client ? (
                <MiniClientBrief client={client} upcoming={clientUpcoming[cid!]} />
              ) : undefined,
              action: (
                <div className="flex flex-wrap gap-2">
                  {canCoordinate && showing.status === "confirmed" && cid && (
                    <>
                      <Button
                        size="sm"
                        loading={updatingId === showing.id}
                        onClick={() => void transition(showing, "completed")}
                      >
                        Mark complete
                      </Button>
                      <DraftCopyButton
                        clientId={cid}
                        showingId={showing.id}
                        draftType="reminder"
                        label="Copy reminder"
                        variant="quiet"
                      />
                    </>
                  )}
                  {canCoordinate && showing.status === "confirmed" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={updatingId === showing.id}
                      onClick={() => void transition(showing, "cancelled")}
                    >
                      Cancel
                    </Button>
                  )}
                  {canCoordinate && showing.status === "confirmed" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={updatingId === showing.id}
                      onClick={() => void transition(showing, "no_show")}
                    >
                      No-show
                    </Button>
                  )}
                  {cid && (
                    <Button asChild variant="quiet" size="sm">
                      <Link href={`/clients/${cid}`}>Open client</Link>
                    </Button>
                  )}
                </div>
              ),
            };
          })}
          empty={
            loadError ? undefined : (
              <EmptyState
                compact
                title="No showings today"
                description="No property tours were returned for this organization and date."
                action={
                  canCoordinate ? (
                    <Button asChild>
                      <Link href="/schedule">Schedule a showing</Link>
                    </Button>
                  ) : undefined
                }
              />
            )
          }
        />
      </section>

      {noteModal && (
        <PostShowingNoteModal
          showingId={noteModal.showingId}
          clientId={noteModal.clientId}
          clientName={noteModal.clientName}
          open
          onClose={() => setNoteModal(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
