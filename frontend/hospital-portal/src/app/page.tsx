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
  getAppointments,
  getPatients,
  updateAppointmentStatus,
  type Appointment,
  type Patient,
} from "./api";
import { useStaffContext } from "@/context/StaffContext";

function parseTenantId(value: string): number | undefined {
  const parsed = parseInt(value.replace(/^t-0*/, ""), 10);
  return value && !isNaN(parsed) ? parsed : undefined;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

const QUEUE_ORDER = ["confirmed", "checked_in", "in_room", "completed", "cancelled"] as const;

export default function TodayPage() {
  return (
    <AsyncBoundary loadingLabel="Loading today’s clinical work" resetKeys={["today"]}>
      <TodayContent />
    </AsyncBoundary>
  );
}

function TodayContent() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { tenantFilter, tenantId, staff, roleCategory } = useStaffContext();
  const canCoordinate = roleCategory === "clinical" || roleCategory === "coordination";
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
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
      getPatients(tid),
      getAppointments({ tenantId: tid, dateFrom: today, dateTo: tomorrow, limit: 200 }),
    ])
      .then(([patientRecords, visitRecords]) => {
        setPatients(patientRecords);
        setAppointments(visitRecords);
        setFreshAt(new Date());
      })
      .catch(() => {
        setPatients([]);
        setAppointments([]);
        setLoadError(true);
      })
      .finally(() => setLoading(false));
  }, [tid]);

  useEffect(() => {
    load();
  }, [load]);

  const patientNames = useMemo(
    () => Object.fromEntries(patients.map((patient) => [patient.id, patient.fullName])),
    [patients],
  );

  const ranked = [...appointments].sort((a, b) => {
    const statusRank = (status: string) => {
      const index = QUEUE_ORDER.indexOf(status as (typeof QUEUE_ORDER)[number]);
      return index === -1 ? QUEUE_ORDER.length : index;
    };
    return (
      statusRank(a.status) - statusRank(b.status) || +new Date(a.startTime) - +new Date(b.startTime)
    );
  });

  const waiting = appointments.filter((appointment) => appointment.status === "confirmed");
  const checkedIn = appointments.filter((appointment) => appointment.status === "checked_in");
  const inRoom = appointments.filter((appointment) => appointment.status === "in_room");
  const completed = appointments.filter((appointment) => appointment.status === "completed");

  async function transition(appointment: Appointment, status: string) {
    setUpdatingId(appointment.id);
    try {
      await updateAppointmentStatus(appointment.id, status);
      setAppointments((current) =>
        current.map((item) => (item.id === appointment.id ? { ...item, status } : item)),
      );
      toast({
        title: "Visit status updated",
        description: `${humanizeStatus(status)} recorded for this visit.`,
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

  if (loading) return <PageLoader label="Loading today’s clinical work" />;

  return (
    <div className="space-y-7 pb-8">
      <PageHeader
        eyebrow="Today’s work"
        title={staff ? `Good day, ${staff.fullName.split(" ")[0]}` : "Clinical work overview"}
        description="Operational queue with inline check-in, rooming, and completion. Status always includes a text label."
        actions={
          <>
            <Button variant="secondary" onClick={load}>
              Refresh
            </Button>
            {canCoordinate && (
              <Button asChild>
                <Link href="/schedule">Schedule care</Link>
              </Button>
            )}
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

      {loadError && (
        <Alert title="Today’s queue is unavailable" tone="danger">
          <p>No visits are shown because current appointment or patient data could not be verified.</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={load}>
            Try again
          </Button>
        </Alert>
      )}
      {searchParams.get("access") === "denied" && (
        <Alert title="Page not available for this role" tone="warning">
          Your verified staff role does not include access to the requested workspace.
        </Alert>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card variant="compact" padding="md">
          <p className="text-xs font-semibold text-ui-muted">Awaiting check-in</p>
          <p className="mt-2 text-3xl font-semibold text-ui-ink">{waiting.length}</p>
          <p className="mt-1 text-xs text-ui-faint">Confirmed visits</p>
        </Card>
        <Card variant="compact" padding="md">
          <p className="text-xs font-semibold text-ui-muted">Checked in</p>
          <p className="mt-2 text-3xl font-semibold text-ui-ink">{checkedIn.length}</p>
          <p className="mt-1 text-xs text-ui-faint">Waiting for room</p>
        </Card>
        <Card variant="compact" padding="md">
          <p className="text-xs font-semibold text-ui-muted">In room</p>
          <p className="mt-2 text-3xl font-semibold text-ui-ink">{inRoom.length}</p>
          <p className="mt-1 text-xs text-ui-faint">Active encounters</p>
        </Card>
        <Card variant="compact" padding="md">
          <p className="text-xs font-semibold text-ui-muted">Completed</p>
          <p className="mt-2 text-3xl font-semibold text-ui-ink">{completed.length}</p>
          <p className="mt-1 text-xs text-ui-faint">Finished today</p>
        </Card>
      </div>

      <section>
        <SectionHeader
          title="Prioritized visit queue"
          description="Move patients through check-in → in room → complete without leaving the queue."
          count={ranked.length}
          action={
            <Button asChild variant="quiet">
              <Link href="/appointments">Full schedule</Link>
            </Button>
          }
        />
        <WorkQueue
          items={ranked.map((appointment) => {
            const overdue =
              appointment.status === "confirmed" && new Date(appointment.startTime) < new Date();
            return {
              id: appointment.id,
              title:
                patientNames[appointment.patientId ?? 0] ??
                `Patient record ${appointment.patientId ?? "unlinked"}`,
              description: `${appointment.providerName} · ${formatTime(appointment.startTime)}${
                overdue ? " · Overdue for check-in" : ""
              }`,
              meta: <StatusBadge status={appointment.status} />,
              urgent: overdue,
              action: (
                <div className="flex flex-wrap gap-2">
                  {canCoordinate && appointment.status === "confirmed" && (
                    <Button
                      size="sm"
                      loading={updatingId === appointment.id}
                      onClick={() => void transition(appointment, "checked_in")}
                    >
                      Check in
                    </Button>
                  )}
                  {canCoordinate && appointment.status === "checked_in" && (
                    <Button
                      size="sm"
                      loading={updatingId === appointment.id}
                      onClick={() => void transition(appointment, "in_room")}
                    >
                      Move to room
                    </Button>
                  )}
                  {canCoordinate &&
                    (appointment.status === "in_room" || appointment.status === "checked_in") && (
                      <Button
                        size="sm"
                        variant="secondary"
                        loading={updatingId === appointment.id}
                        onClick={() => void transition(appointment, "completed")}
                      >
                        Complete
                      </Button>
                    )}
                  {appointment.patientId && (
                    <Button asChild variant="quiet" size="sm">
                      <Link href={`/patients/${appointment.patientId}`}>Open chart</Link>
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
                title="No visits in today’s queue"
                description="No appointment records were returned for this organization and date."
                action={
                  canCoordinate ? (
                    <Button asChild>
                      <Link href="/schedule">Schedule a visit</Link>
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
