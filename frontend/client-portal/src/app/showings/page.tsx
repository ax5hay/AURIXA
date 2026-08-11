"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Alert,
  AppointmentCard,
  Button,
  Card,
  EmptyState,
  PageHeader,
  PageLoader,
  SectionHeader,
} from "@aurixa/ui-kit";
import { getShowings, type Showing } from "../api";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export default function ShowingsPage() {
  const [showings, setShowings] = useState<Showing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getShowings()
      .then(setShowings)
      .catch(() => setError("Your showings could not be loaded."))
      .finally(() => setLoading(false));
  }, [reloadKey]);

  const upcoming = showings.filter(
    (s) => s.status === "confirmed" && new Date(s.startTime) > new Date(),
  );
  const past = showings.filter(
    (s) => s.status === "completed" || new Date(s.startTime) < new Date(),
  );

  if (loading) {
    return <PageLoader label="Loading your showings" />;
  }

  return (
    <div className="space-y-10 py-8 sm:py-10">
      <PageHeader
        eyebrow="Your property schedule"
        title="Showings"
        description="See upcoming tours and review past property visits."
      />

      {error && (
        <Alert title="Showings are unavailable" tone="danger">
          <p>{error} Check your connection and try again.</p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={() => setReloadKey((key) => key + 1)}
          >
            Try again
          </Button>
        </Alert>
      )}

      <Alert title="Before your tour">
        Confirm the property address, parking instructions, and ID requirements with your agent.
        Arrive a few minutes early and note any questions about condition, HOA fees, or timing.
      </Alert>

      <section aria-label="Upcoming showings">
        <SectionHeader
          title="Coming up"
          count={upcoming.length}
          description="Confirmed property tours on your schedule."
        />
        {error ? null : upcoming.length === 0 ? (
          <EmptyState
            title="No upcoming showings"
            description="Browse listings or message your agent to schedule a tour."
            action={
              <Button asChild>
                <Link href="/listings">Browse listings</Link>
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {upcoming.map((s) => (
              <AppointmentCard
                key={s.id}
                provider={s.agentName || s.providerName || "Agent"}
                date={formatDate(s.startTime)}
                detail={s.notes || "Confirm tour details with your agent."}
                status={s.status}
                tone="success"
                action={
                  <Button asChild variant="secondary" size="sm">
                    <Link href={`/showings/${s.id}`}>Details</Link>
                  </Button>
                }
              />
            ))}
          </div>
        )}
      </section>

      <section aria-label="Past showings">
        <SectionHeader
          title="Past tours"
          count={past.length}
          description="Showings that are complete or in the past."
        />
        {error ? null : past.length === 0 ? (
          <EmptyState
            title="No past showings on record"
            description="Completed tours will appear here when available."
            compact
          />
        ) : (
          <Card padding="none">
            <div className="divide-y divide-ui-border">
              {past.map((s) => (
                <div key={s.id} className="p-3">
                  <AppointmentCard
                    provider={s.agentName || s.providerName || "Agent"}
                    date={formatDate(s.startTime)}
                    status={s.status}
                    compact
                    action={
                      <Button asChild variant="quiet" size="sm">
                        <Link href={`/showings/${s.id}`}>Details</Link>
                      </Button>
                    }
                  />
                </div>
              ))}
            </div>
          </Card>
        )}
      </section>
    </div>
  );
}
