"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  PageLoader,
  SectionHeader,
  useToast,
} from "@aurixa/ui-kit";
import { cancelShowing, getShowings, type Showing } from "../../api";

function downloadCalendarEntry(showing: Showing) {
  const stamp = (value: string) =>
    new Date(value)
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  const escape = (value: string) => value.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
  const agent = showing.agentName || showing.providerName || "Agent";
  const calendar = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AURIXA//Client Portal//EN",
    "BEGIN:VEVENT",
    `UID:showing-${showing.id}@aurixa`,
    `DTSTART:${stamp(showing.startTime)}`,
    `DTEND:${stamp(showing.endTime)}`,
    `SUMMARY:${escape(`Property showing with ${agent}`)}`,
    "DESCRIPTION:Confirm property address and tour instructions with your agent.",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([calendar], { type: "text/calendar;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `aurixa-showing-${showing.id}.ics`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function ShowingDetailPage() {
  const params = useParams<{ id: string }>();
  const { toast } = useToast();
  const showingId = Number(params.id);
  const [showing, setShowing] = useState<Showing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!Number.isSafeInteger(showingId)) {
      setLoading(false);
      return;
    }
    getShowings()
      .then((items) => setShowing(items.find((item) => item.id === showingId) ?? null))
      .catch(() => setError("We couldn’t load this showing."))
      .finally(() => setLoading(false));
  }, [showingId]);

  if (loading) return <PageLoader label="Loading showing details" />;

  if (error) {
    return (
      <Alert title="Showing unavailable" tone="danger">
        <p>{error}</p>
        <Button asChild variant="secondary" className="mt-3">
          <Link href="/showings">Back to showings</Link>
        </Button>
      </Alert>
    );
  }

  if (!showing) {
    return (
      <EmptyState
        title="Showing not found"
        description="This tour is not in your client schedule."
        action={
          <Button asChild>
            <Link href="/showings">Back to showings</Link>
          </Button>
        }
      />
    );
  }

  const start = new Date(showing.startTime);
  const end = new Date(showing.endTime);
  const agent = showing.agentName || showing.providerName || "your agent";
  const canCancel = showing.status === "confirmed" && start.getTime() > Date.now();

  async function confirmCancellation() {
    if (!window.confirm("Cancel this showing? This updates your tour schedule.")) return;
    setCancelling(true);
    try {
      await cancelShowing(showing!.id);
      setShowing((current) => (current ? { ...current, status: "cancelled" } : current));
      toast({ title: "Showing cancelled", tone: "success" });
    } catch {
      toast({
        title: "Cancellation was not completed",
        description: "Your schedule has not been changed. Try again or contact your agent.",
        tone: "error",
      });
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="space-y-9 py-4 sm:py-8">
      <Link
        href="/showings"
        className="inline-flex min-h-11 items-center text-sm font-semibold text-ui-accent"
      >
        ← All showings
      </Link>
      <PageHeader
        eyebrow="Showing details"
        title={`Tour with ${agent}`}
        description={start.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })}
        aside={
          <Badge tone={showing.status === "confirmed" ? "success" : "neutral"}>
            {showing.status}
          </Badge>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <Card variant="feature" padding="lg">
          <p className="text-sm font-semibold text-ui-muted">Time</p>
          <p className="mt-2 font-display text-3xl text-ui-ink">
            {start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}–
            {end.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
          </p>
          {showing.notes && (
            <p className="mt-4 text-sm leading-6 text-ui-muted">{showing.notes}</p>
          )}
          <p className="mt-4 text-sm leading-6 text-ui-muted">
            Property address and access instructions are confirmed by your agent before the tour.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => downloadCalendarEntry(showing)}>
              Add to calendar
            </Button>
            {canCancel && (
              <Button variant="danger" loading={cancelling} onClick={confirmCancellation}>
                Cancel showing
              </Button>
            )}
          </div>
        </Card>

        <Card>
          <SectionHeader title="Need a change?" />
          <p className="text-sm leading-6 text-ui-muted">
            Online rescheduling is not supported yet. Contact your agent before cancelling if you
            need another time.
          </p>
          <Button asChild variant="secondary" className="mt-5">
            <Link href="/chat">Ask for guidance</Link>
          </Button>
        </Card>
      </div>

      <Card>
        <SectionHeader title="Prepare for your tour" />
        <ul className="grid gap-3 text-sm leading-6 text-ui-ink sm:grid-cols-2">
          <li className="rounded-ui-md bg-ui-surface-inset p-4">
            Note questions about condition, HOA fees, and timing.
          </li>
          <li className="rounded-ui-md bg-ui-surface-inset p-4">
            Bring photo ID if required by the listing agent.
          </li>
          <li className="rounded-ui-md bg-ui-surface-inset p-4">
            Confirm parking and meeting location beforehand.
          </li>
          <li className="rounded-ui-md bg-ui-surface-inset p-4">
            Review fair-housing guidelines when comparing neighborhoods.
          </li>
        </ul>
      </Card>
    </div>
  );
}
