"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Alert,
  Button,
  Card,
  EmptyState,
  PageHeader,
  PageLoader,
  SectionHeader,
} from "@aurixa/ui-kit";
import { getAppointments, type Appointment } from "../api";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

export default function RecordsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    getAppointments()
      .then(setAppointments)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader label="Loading your records overview" />;

  const completedVisits = appointments
    .filter(
      (appointment) =>
        appointment.status === "completed" || new Date(appointment.startTime) < new Date(),
    )
    .sort((a, b) => Date.parse(b.startTime) - Date.parse(a.startTime));

  return (
    <div className="space-y-9 py-8 sm:py-10">
      <PageHeader
        eyebrow="Your health information"
        title="Records"
        description="Review the visit history currently connected to this portal and find safe paths to other record types."
      />

      <Alert title="What this record includes" tone="info">
        Only appointment history is available from the current patient API. This is not a complete
        medical record and does not include diagnoses, notes, allergies, test results, or documents.
      </Alert>

      <section aria-label="Record categories">
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            {
              href: "/results",
              title: "Test results",
              body: "Laboratory and imaging results are not connected. See safe next steps.",
            },
            {
              href: "/documents",
              title: "Documents",
              body: "Clinical documents and downloads are not connected. Learn how to request them.",
            },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="group block rounded-ui-lg">
              <Card variant="interactive" className="h-full">
                <h2 className="font-display text-2xl font-medium text-ui-ink">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-ui-muted">{item.body}</p>
                <span className="mt-4 inline-block text-sm font-semibold text-ui-accent">
                  Open guidance <span aria-hidden="true">→</span>
                </span>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="visit-history-heading">
        <SectionHeader
          title="Visit history"
          count={completedVisits.length}
          description="Past and completed appointments returned for your patient session."
        />
        {error ? (
          <Alert title="Visit history is unavailable" tone="warning">
            We could not load the connected appointment data. Try again from the Appointments page.
          </Alert>
        ) : completedVisits.length === 0 ? (
          <EmptyState
            title="No visit history is available"
            description="This means no past appointments were returned. It does not mean your medical record is empty."
            compact
          />
        ) : (
          <Card padding="none">
            <ul className="divide-y divide-ui-border">
              {completedVisits.map((appointment) => (
                <li
                  key={appointment.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
                >
                  <div>
                    <p className="font-semibold text-ui-ink">{appointment.providerName}</p>
                    <p className="mt-1 text-sm text-ui-muted">
                      {formatDate(appointment.startTime)} · {appointment.status}
                    </p>
                  </div>
                  <Button asChild variant="quiet" size="sm">
                    <Link href={`/appointments/${appointment.id}`}>Visit details</Link>
                  </Button>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </div>
  );
}
