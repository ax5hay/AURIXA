"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Alert,
  AppointmentCard,
  Button,
  Dialog,
  EmptyState,
  FieldShell,
  Input,
  PageHeader,
  PageLoader,
  Select,
  useToast,
} from "@aurixa/ui-kit";
import {
  getAppointments,
  getPatients,
  getTenants,
  updateAppointmentStatus,
  type Appointment,
} from "../api";
import { useStaffContext } from "@/context/StaffContext";

function parseTenantId(value: string): number | undefined {
  const parsed = parseInt(value.replace(/^t-0*/, ""), 10);
  return value && !isNaN(parsed) ? parsed : undefined;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function tone(status: string): "success" | "danger" | "warning" | "info" | "neutral" {
  if (status === "confirmed") return "info";
  if (status === "completed") return "success";
  if (status === "cancelled") return "danger";
  return "neutral";
}

export default function AppointmentsPage() {
  const { toast } = useToast();
  const { tenantFilter, setTenantFilter, tenantId } = useStaffContext();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [tenants, setTenants] = useState<{ id: string; name: string }[]>([]);
  const [patientMap, setPatientMap] = useState<Record<number, string>>({});
  const [dateFrom, setDateFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(() =>
    new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10),
  );
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [pending, setPending] = useState<{
    appointment: Appointment;
    status: "cancelled" | "completed";
  } | null>(null);
  const [updating, setUpdating] = useState(false);
  const [freshAt, setFreshAt] = useState<Date | null>(null);
  const tid = tenantId ?? parseTenantId(tenantFilter);

  useEffect(() => {
    getTenants()
      .then(setTenants)
      .catch(() => setTenants([]));
    getPatients()
      .then((patients) =>
        setPatientMap(
          Object.fromEntries(patients.map((patient) => [patient.id, patient.fullName])),
        ),
      )
      .catch(() => setPatientMap({}));
  }, []);

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
        title: pending.status === "completed" ? "Appointment completed" : "Appointment cancelled",
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
        description="Review visits and confirm status changes before they are sent."
        actions={
          <Button asChild>
            <Link href="/schedule">Schedule appointment</Link>
          </Button>
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

      <div className="grid gap-3 sm:grid-cols-3">
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
        <FieldShell label="Organization" htmlFor="appointment-tenant">
          <Select
            id="appointment-tenant"
            value={tenantFilter}
            onChange={(event) => setTenantFilter(event.target.value)}
          >
            <option value="">All organizations</option>
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name}
              </option>
            ))}
          </Select>
        </FieldShell>
      </div>

      {appointments.length ? (
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
                tone={tone(appointment.status)}
                action={
                  <div className="flex flex-wrap gap-2">
                    {appointment.status === "confirmed" && (
                      <>
                        <Button
                          variant="secondary"
                          onClick={() => setPending({ appointment, status: "completed" })}
                        >
                          Complete
                        </Button>
                        <Button
                          variant="quiet"
                          onClick={() => setPending({ appointment, status: "cancelled" })}
                        >
                          Cancel
                        </Button>
                      </>
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
        <EmptyState
          title="No appointments in this range"
          description="No appointment records were returned for the selected dates and organization."
          action={
            <Button asChild>
              <Link href="/schedule">Schedule a visit</Link>
            </Button>
          }
        />
      )}

      <Dialog
        open={Boolean(pending)}
        onOpenChange={(open) => !open && setPending(null)}
        title={
          pending?.status === "completed" ? "Mark appointment complete?" : "Cancel appointment?"
        }
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
              {pending?.status === "completed" ? "Confirm complete" : "Confirm cancellation"}
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
          </div>
        )}
      </Dialog>
    </div>
  );
}
