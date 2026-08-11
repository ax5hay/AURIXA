"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Alert,
  AppointmentCard,
  Button,
  Card,
  Dialog,
  EmptyState,
  FieldShell,
  Input,
  PageHeader,
  PageLoader,
  StatusBadge,
  useToast,
} from "@aurixa/ui-kit";
import {
  getShowings,
  getClients,
  updateShowingStatus,
  type Appointment,
} from "../api";
import { useStaffContext } from "@/context/StaffContext";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatHour(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function dayKey(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

export default function ShowingsPage() {
  const { toast } = useToast();
  const { tenantId, roleCategory } = useStaffContext();
  const canCoordinate = roleCategory === "agent" || roleCategory === "coordination";
  const [showings, setShowings] = useState<Appointment[]>([]);
  const [clientMap, setClientMap] = useState<Record<number, string>>({});
  const [dateFrom, setDateFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(() =>
    new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10),
  );
  const [view, setView] = useState<"list" | "calendar">("list");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [pending, setPending] = useState<{
    showing: Appointment;
    status: "cancelled" | "completed" | "checked_in" | "in_room";
  } | null>(null);
  const [updating, setUpdating] = useState(false);
  const [freshAt, setFreshAt] = useState<Date | null>(null);
  const tid = tenantId;

  useEffect(() => {
    getClients(tid)
      .then((clients) =>
        setClientMap(Object.fromEntries(clients.map((client) => [client.id, client.fullName]))),
      )
      .catch(() => setClientMap({}));
  }, [tid]);

  useEffect(() => {
    setLoading(true);
    setLoadError(false);
    getShowings({ tenantId: tid, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined })
      .then(setShowings)
      .catch(() => {
        setShowings([]);
        setLoadError(true);
      })
      .finally(() => {
        setFreshAt(new Date());
        setLoading(false);
      });
  }, [tid, dateFrom, dateTo]);

  const byDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const showing of [...showings].sort(
      (a, b) => +new Date(a.startTime) - +new Date(b.startTime),
    )) {
      const key = dayKey(showing.startTime);
      const bucket = map.get(key) ?? [];
      bucket.push(showing);
      map.set(key, bucket);
    }
    return [...map.entries()];
  }, [showings]);

  const confirmUpdate = async () => {
    if (!pending) return;
    setUpdating(true);
    try {
      await updateShowingStatus(pending.showing.id, pending.status);
      setShowings((current) =>
        current.map((item) =>
          item.id === pending.showing.id ? { ...item, status: pending.status } : item,
        ),
      );
      toast({
        title: "Showing updated",
        description: `Status is now ${pending.status.replace(/_/g, " ")}.`,
        tone: "success",
      });
      setPending(null);
    } catch {
      toast({
        title: "Status update failed",
        description: "The showing was not changed. Please try again.",
        tone: "error",
      });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <PageLoader label="Loading showings" />;

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        eyebrow="Coordination"
        title="Showings"
        description="List and day-board views for the selected range. Confirm consequential status changes."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant={view === "list" ? "primary" : "secondary"}
              onClick={() => setView("list")}
            >
              List
            </Button>
            <Button
              variant={view === "calendar" ? "primary" : "secondary"}
              onClick={() => setView("calendar")}
            >
              Day board
            </Button>
            {canCoordinate && (
              <Button asChild>
                <Link href="/schedule">Schedule showing</Link>
              </Button>
            )}
          </div>
        }
        aside={
          <p className="text-xs text-ui-muted">
            {freshAt
              ? `Updated at ${freshAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
              : "Not yet updated"}
          </p>
        }
      />

      {loadError && (
        <Alert title="Showings unavailable" tone="danger">
          No showings are shown because the service could not be reached.
        </Alert>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <FieldShell label="From" htmlFor="date-from">
          <Input
            id="date-from"
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
          />
        </FieldShell>
        <FieldShell label="To" htmlFor="date-to">
          <Input
            id="date-to"
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
          />
        </FieldShell>
      </div>

      {!showings.length ? (
        <EmptyState
          title="No showings in this range"
          description="No showing records were returned for the selected dates and organization."
          action={
            <Button asChild>
              <Link href="/schedule">Schedule a showing</Link>
            </Button>
          }
        />
      ) : view === "list" ? (
        <div className="space-y-3">
          {showings.map((showing) => {
            const clientName =
              clientMap[showing.clientId ?? 0] ??
              `Client record ${showing.clientId ?? "unlinked"}`;
            const agentName = showing.agentName ?? showing.providerName ?? "Unassigned";
            return (
              <AppointmentCard
                key={showing.id}
                provider={clientName}
                date={formatDate(showing.startTime)}
                detail={`Agent: ${agentName}`}
                status={showing.status}
                action={
                  <div className="flex flex-wrap gap-2">
                    {canCoordinate && showing.status === "confirmed" && (
                      <>
                        <Button
                          variant="secondary"
                          onClick={() => setPending({ showing, status: "checked_in" })}
                        >
                          Client arrived
                        </Button>
                        <Button
                          variant="quiet"
                          onClick={() => setPending({ showing, status: "cancelled" })}
                        >
                          Cancel
                        </Button>
                      </>
                    )}
                    {canCoordinate && showing.status === "checked_in" && (
                      <Button
                        variant="secondary"
                        onClick={() => setPending({ showing, status: "in_room" })}
                      >
                        On site
                      </Button>
                    )}
                    {canCoordinate &&
                      (showing.status === "in_room" || showing.status === "checked_in") && (
                        <Button
                          variant="secondary"
                          onClick={() => setPending({ showing, status: "completed" })}
                        >
                          Complete
                        </Button>
                      )}
                    {showing.clientId && (
                      <Button asChild variant="quiet">
                        <Link href={`/clients/${showing.clientId}`}>Client</Link>
                      </Button>
                    )}
                  </div>
                }
              />
            );
          })}
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {byDay.map(([day, dayShowings]) => (
            <Card key={day}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="font-display text-xl font-medium text-ui-ink">
                  {new Date(`${day}T12:00:00`).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  })}
                </h2>
                <StatusBadge status="pending" label={`${dayShowings.length} showings`} />
              </div>
              <ul className="space-y-3">
                {dayShowings.map((showing) => (
                  <li
                    key={showing.id}
                    className="rounded-ui-md border border-ui-border bg-ui-surface-inset px-3 py-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-ui-ink">
                          {formatHour(showing.startTime)} ·{" "}
                          {clientMap[showing.clientId ?? 0] ??
                            `Client ${showing.clientId ?? "?"}`}
                        </p>
                        <p className="text-sm text-ui-muted">
                          {showing.agentName ?? showing.providerName ?? "Unassigned"}
                        </p>
                      </div>
                      <StatusBadge status={showing.status} />
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={Boolean(pending)}
        onOpenChange={(open) => !open && setPending(null)}
        title="Confirm showing status change?"
        description="This updates the showing record immediately after confirmation."
        footer={
          <>
            <Button variant="secondary" onClick={() => setPending(null)}>
              Keep unchanged
            </Button>
            <Button
              variant={pending?.status === "cancelled" ? "danger" : "primary"}
              loading={updating}
              onClick={confirmUpdate}
            >
              Confirm update
            </Button>
          </>
        }
      >
        {pending && (
          <div className="rounded-ui-md bg-ui-surface-inset p-4 text-sm">
            <p className="font-semibold text-ui-ink">
              {clientMap[pending.showing.clientId ?? 0] ??
                `Client record ${pending.showing.clientId ?? "unlinked"}`}
            </p>
            <p className="mt-1 text-ui-muted">
              {formatDate(pending.showing.startTime)} ·{" "}
              {pending.showing.agentName ?? pending.showing.providerName ?? "Unassigned"}
            </p>
            <p className="mt-3 text-ui-ink">
              New status: <StatusBadge status={pending.status} />
            </p>
          </div>
        )}
      </Dialog>
    </div>
  );
}
