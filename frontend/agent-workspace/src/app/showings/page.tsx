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
  getAppointments,
  getPatients,
  updateAppointmentStatus,
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

export default function AppointmentsPage() {
  const { toast } = useToast();
  const { tenantId, roleCategory } = useStaffContext();
  const canCoordinate = roleCategory === "clinical" || roleCategory === "coordination";
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patientMap, setPatientMap] = useState<Record<number, string>>({});
  const [dateFrom, setDateFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(() =>
    new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10),
  );
  const [view, setView] = useState<"list" | "calendar">("list");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [pending, setPending] = useState<{
    appointment: Appointment;
    status: "cancelled" | "completed" | "checked_in" | "in_room";
  } | null>(null);
  const [updating, setUpdating] = useState(false);
  const [freshAt, setFreshAt] = useState<Date | null>(null);
  const tid = tenantId;

  useEffect(() => {
    getPatients(tid)
      .then((patients) =>
        setPatientMap(
          Object.fromEntries(patients.map((patient) => [patient.id, patient.fullName])),
        ),
      )
      .catch(() => setPatientMap({}));
  }, [tid]);

  useEffect(() => {
    setLoading(true);
    setLoadError(false);
    getAppointments({ tenantId: tid, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined })
      .then(setAppointments)
      .catch(() => {
        setAppointments([]);
        setLoadError(true);
      })
      .finally(() => {
        setFreshAt(new Date());
        setLoading(false);
      });
  }, [tid, dateFrom, dateTo]);

  const byDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const appointment of [...appointments].sort(
      (a, b) => +new Date(a.startTime) - +new Date(b.startTime),
    )) {
      const key = dayKey(appointment.startTime);
      const bucket = map.get(key) ?? [];
      bucket.push(appointment);
      map.set(key, bucket);
    }
    return [...map.entries()];
  }, [appointments]);

  const confirmUpdate = async () => {
    if (!pending) return;
    setUpdating(true);
    try {
      await updateAppointmentStatus(pending.appointment.id, pending.status);
      setAppointments((current) =>
        current.map((item) =>
          item.id === pending.appointment.id ? { ...item, status: pending.status } : item,
        ),
      );
      toast({
        title: "Appointment updated",
        description: `Status is now ${pending.status.replace(/_/g, " ")}.`,
        tone: "success",
      });
      setPending(null);
    } catch {
      toast({
        title: "Status update failed",
        description: "The appointment was not changed. Please try again.",
        tone: "error",
      });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <PageLoader label="Loading appointments" />;

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        eyebrow="Care coordination"
        title="Appointments"
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
                <Link href="/schedule">Schedule appointment</Link>
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
        <Alert title="Appointments unavailable" tone="danger">
          No appointments are shown because the service could not be reached.
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

      {!appointments.length ? (
        <EmptyState
          title="No appointments in this range"
          description="No appointment records were returned for the selected dates and organization."
          action={
            <Button asChild>
              <Link href="/schedule">Schedule a visit</Link>
            </Button>
          }
        />
      ) : view === "list" ? (
        <div className="space-y-3">
          {appointments.map((appointment) => {
            const patientName =
              patientMap[appointment.patientId ?? 0] ??
              `Patient record ${appointment.patientId ?? "unlinked"}`;
            return (
              <AppointmentCard
                key={appointment.id}
                provider={patientName}
                date={formatDate(appointment.startTime)}
                detail={`Clinician: ${appointment.providerName}`}
                status={appointment.status}
                action={
                  <div className="flex flex-wrap gap-2">
                    {canCoordinate && appointment.status === "confirmed" && (
                      <>
                        <Button
                          variant="secondary"
                          onClick={() => setPending({ appointment, status: "checked_in" })}
                        >
                          Check in
                        </Button>
                        <Button
                          variant="quiet"
                          onClick={() => setPending({ appointment, status: "cancelled" })}
                        >
                          Cancel
                        </Button>
                      </>
                    )}
                    {canCoordinate && appointment.status === "checked_in" && (
                      <Button
                        variant="secondary"
                        onClick={() => setPending({ appointment, status: "in_room" })}
                      >
                        Move to room
                      </Button>
                    )}
                    {canCoordinate &&
                      (appointment.status === "in_room" || appointment.status === "checked_in") && (
                        <Button
                          variant="secondary"
                          onClick={() => setPending({ appointment, status: "completed" })}
                        >
                          Complete
                        </Button>
                      )}
                    {appointment.patientId && (
                      <Button asChild variant="quiet">
                        <Link href={`/patients/${appointment.patientId}`}>Patient</Link>
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
          {byDay.map(([day, dayAppointments]) => (
            <Card key={day}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="font-display text-xl font-medium text-ui-ink">
                  {new Date(`${day}T12:00:00`).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  })}
                </h2>
                <StatusBadge status="pending" label={`${dayAppointments.length} visits`} />
              </div>
              <ul className="space-y-3">
                {dayAppointments.map((appointment) => (
                  <li
                    key={appointment.id}
                    className="rounded-ui-md border border-ui-border bg-ui-surface-inset px-3 py-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-ui-ink">
                          {formatHour(appointment.startTime)} ·{" "}
                          {patientMap[appointment.patientId ?? 0] ??
                            `Patient ${appointment.patientId ?? "?"}`}
                        </p>
                        <p className="text-sm text-ui-muted">{appointment.providerName}</p>
                      </div>
                      <StatusBadge status={appointment.status} />
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
        title="Confirm appointment status change?"
        description="This updates the appointment record immediately after confirmation."
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
              {patientMap[pending.appointment.patientId ?? 0] ??
                `Patient record ${pending.appointment.patientId ?? "unlinked"}`}
            </p>
            <p className="mt-1 text-ui-muted">
              {formatDate(pending.appointment.startTime)} · {pending.appointment.providerName}
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
