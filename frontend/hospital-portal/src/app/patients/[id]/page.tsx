"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  PageLoader,
  SectionHeader,
  Timeline,
} from "@aurixa/ui-kit";
import { getPatient, getPatientAppointments, type Appointment, type Patient } from "../../api";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function PatientDetailPage() {
  const params = useParams();
  const id = parseInt(String(params?.id ?? ""), 10);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (isNaN(id)) {
      setLoading(false);
      return;
    }
    Promise.all([getPatient(id).then(setPatient), getPatientAppointments(id).then(setAppointments)])
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <PageLoader label="Loading patient record" />;
  if (isNaN(id) || !patient) {
    return (
      <EmptyState
        title="Patient record unavailable"
        description="The record could not be found or loaded. No patient information is displayed."
        action={
          <Button asChild>
            <Link href="/patients">Back to patients</Link>
          </Button>
        }
      />
    );
  }

  const ordered = [...appointments].sort((a, b) => +new Date(b.startTime) - +new Date(a.startTime));

  return (
    <div className="space-y-6 pb-8">
      <Link
        href="/patients"
        className="inline-flex min-h-11 items-center text-sm font-semibold text-ui-accent"
      >
        ← Patient directory
      </Link>

      <Card variant="feature" padding="lg" className="sticky top-2 z-20">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar name={patient.fullName} size="lg" />
            <div className="min-w-0">
              <p className="eyebrow">Active patient context · Record #{patient.id}</p>
              <h1 className="truncate text-2xl font-semibold text-ui-ink sm:text-3xl">
                {patient.fullName}
              </h1>
              <p className="mt-1 text-sm text-ui-muted">
                {[patient.email, patient.phoneNumber].filter(Boolean).join(" · ") ||
                  "No contact information on file"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <Link href={`/chat?patientId=${patient.id}`}>Open assistant</Link>
            </Button>
            <Button asChild>
              <Link href={`/schedule?patientId=${patient.id}`}>Schedule visit</Link>
            </Button>
          </div>
        </div>
      </Card>

      {failed && (
        <Alert title="Some patient activity may be unavailable" tone="warning">
          The appointment history could not be fully loaded.
        </Alert>
      )}

      <section>
        <SectionHeader
          title="Appointment history"
          description="Newest activity first. Status is shown with text as well as color."
          count={ordered.length}
        />
        {ordered.length ? (
          <Card variant="compact" padding="lg">
            <Timeline
              items={ordered.map((appointment) => ({
                id: appointment.id,
                title: `${appointment.providerName} · ${appointment.status}`,
                time: formatDate(appointment.startTime),
                icon:
                  appointment.status === "completed"
                    ? "✓"
                    : appointment.status === "cancelled"
                      ? "×"
                      : "•",
                description: (
                  <Badge
                    tone={
                      appointment.status === "completed"
                        ? "success"
                        : appointment.status === "cancelled"
                          ? "danger"
                          : "info"
                    }
                  >
                    {appointment.status}
                  </Badge>
                ),
              }))}
            />
          </Card>
        ) : (
          <EmptyState
            compact
            title="No appointment history"
            description="No appointment records were returned for this patient."
          />
        )}
      </section>
    </div>
  );
}
