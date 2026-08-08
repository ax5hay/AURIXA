"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  PageLoader,
  SectionHeader,
  WorkQueue,
} from "@aurixa/ui-kit";
import { getAppointments, getPatients, type Appointment, type Patient } from "./api";
import { useStaffContext } from "@/context/StaffContext";

function parseTenantId(value: string): number | undefined {
  const parsed = parseInt(value.replace(/^t-0*/, ""), 10);
  return value && !isNaN(parsed) ? parsed : undefined;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function statusTone(status: string): "success" | "warning" | "neutral" {
  if (status === "confirmed") return "success";
  if (status === "cancelled") return "warning";
  return "neutral";
}

export default function TodayPage() {
  const { tenantFilter, tenantId, staff, roleCategory } = useStaffContext();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [freshAt, setFreshAt] = useState<Date | null>(null);

  const tid = tenantId ?? parseTenantId(tenantFilter);

  useEffect(() => {
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
    Promise.all([
      getPatients(tid)
        .then(setPatients)
        .catch(() => setPatients([])),
      getAppointments({ tenantId: tid, dateFrom: today, dateTo: tomorrow })
        .then(setAppointments)
        .catch(() => setAppointments([])),
    ]).finally(() => {
      setFreshAt(new Date());
      setLoading(false);
    });
  }, [tid]);

  const patientNames = useMemo(
    () => Object.fromEntries(patients.map((patient) => [patient.id, patient.fullName])),
    [patients],
  );
  const ranked = [...appointments].sort((a, b) => {
    const statusRank = (status: string) =>
      status === "confirmed" ? 0 : status === "completed" ? 2 : 1;
    return (
      statusRank(a.status) - statusRank(b.status) || +new Date(a.startTime) - +new Date(b.startTime)
    );
  });
  const waiting = appointments.filter((appointment) => appointment.status === "confirmed");
  const completed = appointments.filter((appointment) => appointment.status === "completed");

  if (loading) return <PageLoader label="Loading today’s clinical work" />;

  return (
    <div className="space-y-7 pb-8">
      <PageHeader
        eyebrow="Today’s work"
        title={staff ? `Good day, ${staff.fullName.split(" ")[0]}` : "Clinical work overview"}
        description={
          <>
            Ranked from live appointment data. Select your staff profile above to tailor navigation
            for {roleCategory === "unassigned" ? "your role" : `${roleCategory} work`}.
          </>
        }
        actions={
          <>
            <Button asChild>
              <Link href="/schedule">Schedule care</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/patients">Find patient</Link>
            </Button>
          </>
        }
        aside={
          <div className="text-right text-xs text-ui-muted">
            <p className="font-semibold text-ui-ink">{appointments.length} visits in view</p>
            <p>
              {freshAt
                ? `Updated at ${freshAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
                : "Not yet updated"}
            </p>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card variant="compact" padding="md">
          <p className="text-xs font-semibold text-ui-muted">Needs coordination</p>
          <p className="mt-2 text-3xl font-semibold text-ui-ink">{waiting.length}</p>
          <p className="mt-1 text-xs text-ui-faint">Confirmed visits today</p>
        </Card>
        <Card variant="compact" padding="md">
          <p className="text-xs font-semibold text-ui-muted">Completed</p>
          <p className="mt-2 text-3xl font-semibold text-ui-ink">{completed.length}</p>
          <p className="mt-1 text-xs text-ui-faint">Recorded by the appointment service</p>
        </Card>
        <Card variant="compact" padding="md">
          <p className="text-xs font-semibold text-ui-muted">Patient directory</p>
          <p className="mt-2 text-3xl font-semibold text-ui-ink">{patients.length}</p>
          <Link
            href="/patients"
            className="mt-1 inline-flex min-h-11 items-center text-xs font-semibold text-ui-accent"
          >
            Open directory →
          </Link>
        </Card>
      </div>

      <section>
        <SectionHeader
          title="Prioritized visit queue"
          description="Confirmed visits first, then remaining appointment activity in chronological order."
          count={ranked.length}
          action={
            <Button asChild variant="quiet">
              <Link href="/appointments">Full schedule</Link>
            </Button>
          }
        />
        <WorkQueue
          items={ranked.map((appointment) => ({
            id: appointment.id,
            title:
              patientNames[appointment.patientId ?? 0] ??
              `Patient record ${appointment.patientId ?? "unlinked"}`,
            description: `${appointment.providerName} · ${formatTime(appointment.startTime)}`,
            meta: <Badge tone={statusTone(appointment.status)}>{appointment.status}</Badge>,
            urgent:
              appointment.status === "confirmed" && new Date(appointment.startTime) < new Date(),
            action: appointment.patientId ? (
              <Button asChild variant="quiet">
                <Link href={`/patients/${appointment.patientId}`}>Open</Link>
              </Button>
            ) : undefined,
          }))}
          empty={
            <EmptyState
              compact
              title="No visits in today’s queue"
              description="No appointment records were returned for this organization and date."
              action={
                <Button asChild>
                  <Link href="/schedule">Schedule a visit</Link>
                </Button>
              }
            />
          }
        />
      </section>
    </div>
  );
}
