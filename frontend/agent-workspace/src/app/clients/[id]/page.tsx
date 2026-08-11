"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Alert,
  Avatar,
  Button,
  Card,
  EmptyState,
  HealthcareDisclaimer,
  PageLoader,
  SectionHeader,
  StatusBadge,
  Tabs,
  Timeline,
} from "@aurixa/ui-kit";
import { getPatient, getPatientAppointments, type Appointment, type Patient } from "../../api";
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

export default function PatientDetailPage() {
  const params = useParams();
  const { tenantId, roleCategory } = useStaffContext();
  const canCoordinate = roleCategory === "clinical" || roleCategory === "coordination";
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
    Promise.all([
      getPatient(id, tenantId).then(setPatient),
      getPatientAppointments(id).then(setAppointments),
    ])
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [id, tenantId]);

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
  const upcoming = ordered.filter(
    (appointment) =>
      ["confirmed", "checked_in", "in_room"].includes(appointment.status) &&
      new Date(appointment.startTime) >= new Date(),
  );
  const past = ordered.filter((appointment) => !upcoming.includes(appointment));

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
              <p className="mt-2 text-xs text-ui-faint">
                Organization scope {patient.tenantId ?? "unspecified"} · Keep this banner visible
                while coordinating care.
              </p>
            </div>
          </div>
          {canCoordinate && (
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="secondary">
                <Link href={`/chat?patientId=${patient.id}`}>Open assistant</Link>
              </Button>
              <Button asChild>
                <Link href={`/schedule?patientId=${patient.id}`}>Schedule visit</Link>
              </Button>
            </div>
          )}
        </div>
      </Card>

      {failed && (
        <Alert title="Some patient activity may be unavailable" tone="warning">
          The appointment history could not be fully loaded.
        </Alert>
      )}

      <Tabs
        ariaLabel="Patient chart sections"
        defaultValue="overview"
        items={[
          {
            value: "overview",
            label: "Overview",
            content: (
              <section className="grid gap-4 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                  <SectionHeader
                    title="Care snapshot"
                    description="Verified identity and the next operational action for this patient."
                  />
                  <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-ui-faint">
                        Full name
                      </dt>
                      <dd className="mt-1 text-sm font-semibold text-ui-ink">{patient.fullName}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-ui-faint">
                        Record ID
                      </dt>
                      <dd className="mt-1 font-mono text-sm text-ui-ink">{patient.id}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-ui-faint">
                        Email
                      </dt>
                      <dd className="mt-1 text-sm text-ui-ink">{patient.email || "Not on file"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-ui-faint">
                        Phone
                      </dt>
                      <dd className="mt-1 text-sm text-ui-ink">
                        {patient.phoneNumber || "Not on file"}
                      </dd>
                    </div>
                  </dl>
                </Card>
                <Card>
                  <SectionHeader title="Next visit" description="Upcoming confirmed activity." />
                  {upcoming[0] ? (
                    <div className="mt-4 space-y-3">
                      <StatusBadge status={upcoming[0].status} />
                      <p className="font-semibold text-ui-ink">{upcoming[0].providerName}</p>
                      <p className="text-sm text-ui-muted">{formatDate(upcoming[0].startTime)}</p>
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-ui-muted">No upcoming visits on file.</p>
                  )}
                </Card>
              </section>
            ),
          },
          {
            value: "visits",
            label: "Visits",
            content: (
              <section>
                <SectionHeader
                  title="Encounter history"
                  description="Newest activity first. Status includes a text label."
                  count={ordered.length}
                />
                {ordered.length ? (
                  <Card variant="compact" padding="lg">
                    <Timeline
                      items={ordered.map((appointment) => ({
                        id: appointment.id,
                        title: appointment.providerName,
                        time: formatDate(appointment.startTime),
                        description: <StatusBadge status={appointment.status} />,
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
                {past.length > 0 && (
                  <p className="mt-3 text-xs text-ui-faint">
                    {past.length} past or closed encounter{past.length === 1 ? "" : "s"} included
                    above.
                  </p>
                )}
              </section>
            ),
          },
          {
            value: "clinical",
            label: "Clinical",
            content: (
              <section>
                <SectionHeader
                  title="Clinical domains"
                  description="Only information supplied by connected clinical systems is shown. Empty cards are not negative findings."
                />
                <div className="grid gap-3 md:grid-cols-2">
                  {[
                    [
                      "Allergies",
                      "No allergy feed is connected. Do not interpret this as no known allergies.",
                    ],
                    [
                      "Medications",
                      "Medication reconciliation data is unavailable in this workspace.",
                    ],
                    ["Problems", "No diagnosis or problem-list integration is available."],
                    ["Results", "Laboratory and imaging results are not connected."],
                    ["Documents", "Clinical document repositories are not connected."],
                    ["Care team", "Assigned care-team roster is not connected."],
                  ].map(([title, description]) => (
                    <Card key={title} variant="compact" padding="md">
                      <div className="flex items-center justify-between gap-3">
                        <h2 className="font-semibold text-ui-ink">{title}</h2>
                        <StatusBadge status="offline" label="Unavailable" />
                      </div>
                      <p className="mt-2 text-sm leading-6 text-ui-muted">{description}</p>
                    </Card>
                  ))}
                </div>
                <div className="mt-4">
                  <HealthcareDisclaimer variant="not-diagnosis" />
                </div>
              </section>
            ),
          },
          {
            value: "activity",
            label: "Activity",
            content: (
              <section>
                <SectionHeader
                  title="Audit-friendly activity"
                  description="Portal actions that touch this record should remain reviewable."
                />
                <Card>
                  <ul className="space-y-3 text-sm text-ui-muted">
                    <li>Record opened in hospital portal for coordination.</li>
                    <li>
                      Appointment history count: {ordered.length}. Clinical domain feeds remain
                      disconnected.
                    </li>
                    <li>
                      Assistant access is available with patient context disclosure when opened from
                      this chart.
                    </li>
                  </ul>
                </Card>
              </section>
            ),
          },
        ]}
      />
    </div>
  );
}
