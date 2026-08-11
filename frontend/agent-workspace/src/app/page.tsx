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
  updateShowingStatus,
  type Showing,
  type Client,
} from "./api";
import { useStaffContext } from "@/context/StaffContext";

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
  const [loading, setLoading] = useState(true);
  const [freshAt, setFreshAt] = useState<Date | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const tid = tenantId ?? parseTenantId(tenantFilter);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
    Promise.all([
      getClients(tid),
      getShowings({ tenantId: tid, dateFrom: today, dateTo: tomorrow, limit: 200 }),
    ])
      .then(([clientRecords, showingRecords]) => {
        setClients(clientRecords);
        setShowings(showingRecords);
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

  const clientNames = useMemo(
    () => Object.fromEntries(clients.map((client) => [client.id, client.fullName])),
    [clients],
  );

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

  if (loading) return <PageLoader label="Loading today’s pipeline" />;

  return (
    <div className="space-y-7 pb-8">
      <PageHeader
        eyebrow="Today’s pipeline"
        title={staff ? `Good day, ${staff.fullName.split(" ")[0]}` : "Agent overview"}
        description="Showings and client activity for your organization today."
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

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Card variant="compact" padding="md">
          <p className="text-xs font-semibold text-ui-muted">Upcoming</p>
          <p className="mt-2 text-3xl font-semibold text-ui-ink">{upcoming.length}</p>
          <p className="mt-1 text-xs text-ui-faint">Confirmed showings</p>
        </Card>
        <Card variant="compact" padding="md">
          <p className="text-xs font-semibold text-ui-muted">Completed</p>
          <p className="mt-2 text-3xl font-semibold text-ui-ink">{completed.length}</p>
          <p className="mt-1 text-xs text-ui-faint">Tours finished</p>
        </Card>
        <Card variant="compact" padding="md">
          <p className="text-xs font-semibold text-ui-muted">Cancelled</p>
          <p className="mt-2 text-3xl font-semibold text-ui-ink">{cancelled.length}</p>
          <p className="mt-1 text-xs text-ui-faint">Did not occur</p>
        </Card>
      </div>

      <section>
        <SectionHeader
          title="Showing queue"
          description="Manage today’s property tours."
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
            const overdue = showing.status === "confirmed" && new Date(showing.startTime) < new Date();
            const agent = showing.agentName || showing.providerName || "Agent";
            return {
              id: showing.id,
              title: clientNames[cid ?? 0] ?? `Client #${cid ?? "unlinked"}`,
              description: `${agent} · ${formatTime(showing.startTime)}${
                overdue ? " · Overdue" : ""
              }`,
              meta: <StatusBadge status={showing.status} />,
              urgent: overdue,
              action: (
                <div className="flex flex-wrap gap-2">
                  {canCoordinate && showing.status === "confirmed" && (
                    <Button
                      size="sm"
                      loading={updatingId === showing.id}
                      onClick={() => void transition(showing, "completed")}
                    >
                      Mark complete
                    </Button>
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
    </div>
  );
}
