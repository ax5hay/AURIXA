"use client";

import { useState, useEffect } from "react";
import {
  Alert,
  AppointmentCard,
  Card,
  EmptyState,
  PageHeader,
  PageLoader,
  SectionHeader,
} from "@aurixa/ui-kit";
import { getAppointments, type Appointment } from "../api";

const DEMO_PATIENT_ID = 1;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAppointments(DEMO_PATIENT_ID)
      .then(setAppointments)
      .catch(() => [])
      .finally(() => setLoading(false));
  }, []);

  const upcoming = appointments.filter(
    (a) => a.status === "confirmed" && new Date(a.startTime) > new Date(),
  );
  const past = appointments.filter(
    (a) => a.status === "completed" || new Date(a.startTime) < new Date(),
  );

  if (loading) {
    return <PageLoader label="Loading your appointments" />;
  }

  return (
    <div className="space-y-10 py-8 sm:py-10">
      <PageHeader
        eyebrow="Your care schedule"
        title="Appointments"
        description="See what’s coming next and review the visits already in your record."
      />

      <Alert title="A little preparation can help">
        Before a visit, write down your questions, current medicines, and any symptoms that have
        changed. Contact your care team if you need directions, accessibility support, or visit
        instructions.
      </Alert>

      <section aria-label="Upcoming visits">
        <SectionHeader
          title="Coming up"
          count={upcoming.length}
          description="Confirmed visits on your current schedule."
        />
        {upcoming.length === 0 ? (
          <EmptyState
            title="No upcoming visits"
            description="If you need to arrange care, contact your care team through their usual channel."
          />
        ) : (
          <div className="space-y-3">
            {upcoming.map((a) => (
              <AppointmentCard
                key={a.id}
                provider={a.providerName}
                date={formatDate(a.startTime)}
                detail="Confirm any visit-specific instructions with your care team."
                status={a.status}
                tone="success"
              />
            ))}
          </div>
        )}
      </section>

      <section aria-label="Care history">
        <SectionHeader
          title="Care history"
          count={past.length}
          description="Appointments that are complete or in the past."
        />
        {past.length === 0 ? (
          <EmptyState
            title="No past visits on record"
            description="Completed visits will appear here when they are available."
            compact
          />
        ) : (
          <Card padding="none">
            <div className="divide-y divide-ui-border">
              {past.map((a) => (
                <div key={a.id} className="p-3">
                  <AppointmentCard
                    provider={a.providerName}
                    date={formatDate(a.startTime)}
                    status={a.status}
                    compact
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
