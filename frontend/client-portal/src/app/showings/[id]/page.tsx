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
import { cancelAppointment, getAppointments, type Appointment } from "../../api";

function downloadCalendarEntry(appointment: Appointment) {
  const stamp = (value: string) =>
    new Date(value)
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  const escape = (value: string) => value.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
  const calendar = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AURIXA//Patient Portal//EN",
    "BEGIN:VEVENT",
    `UID:appointment-${appointment.id}@aurixa`,
    `DTSTART:${stamp(appointment.startTime)}`,
    `DTEND:${stamp(appointment.endTime)}`,
    `SUMMARY:${escape(`Appointment with ${appointment.providerName}`)}`,
    "DESCRIPTION:Confirm visit location and instructions with your care team.",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([calendar], { type: "text/calendar;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `aurixa-appointment-${appointment.id}.ics`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function AppointmentDetailPage() {
  const params = useParams<{ id: string }>();
  const { toast } = useToast();
  const appointmentId = Number(params.id);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!Number.isSafeInteger(appointmentId)) {
      setLoading(false);
      return;
    }
    getAppointments()
      .then((appointments) =>
        setAppointment(appointments.find((item) => item.id === appointmentId) ?? null),
      )
      .catch(() => setError("We couldn’t load this appointment."))
      .finally(() => setLoading(false));
  }, [appointmentId]);

  if (loading) return <PageLoader label="Loading appointment details" />;

  if (error) {
    return (
      <Alert title="Appointment unavailable" tone="danger">
        <p>{error}</p>
        <Button asChild variant="secondary" className="mt-3">
          <Link href="/appointments">Back to appointments</Link>
        </Button>
      </Alert>
    );
  }

  if (!appointment) {
    return (
      <EmptyState
        title="Appointment not found"
        description="This visit is not in your patient-scoped schedule."
        action={
          <Button asChild>
            <Link href="/appointments">Back to appointments</Link>
          </Button>
        }
      />
    );
  }

  const start = new Date(appointment.startTime);
  const end = new Date(appointment.endTime);
  const canCancel = appointment.status === "confirmed" && start.getTime() > Date.now();

  async function confirmCancellation() {
    if (!window.confirm("Cancel this appointment? This action updates your care schedule.")) return;
    setCancelling(true);
    try {
      await cancelAppointment(appointment!.id);
      setAppointment((current) => (current ? { ...current, status: "cancelled" } : current));
      toast({ title: "Appointment cancelled", tone: "success" });
    } catch {
      toast({
        title: "Cancellation was not completed",
        description: "Your schedule has not been changed. Try again or contact your care team.",
        tone: "error",
      });
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="space-y-9 py-4 sm:py-8">
      <Link
        href="/appointments"
        className="inline-flex min-h-11 items-center text-sm font-semibold text-ui-accent"
      >
        ← All appointments
      </Link>
      <PageHeader
        eyebrow="Appointment details"
        title={`Visit with ${appointment.providerName}`}
        description={start.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })}
        aside={
          <Badge tone={appointment.status === "confirmed" ? "success" : "neutral"}>
            {appointment.status}
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
          <p className="mt-4 text-sm leading-6 text-ui-muted">
            Location and telehealth details are not available from the scheduling service yet.
            Confirm those instructions with your care team before the visit.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => downloadCalendarEntry(appointment)}>
              Add to calendar
            </Button>
            {canCancel && (
              <Button variant="danger" loading={cancelling} onClick={confirmCancellation}>
                Cancel appointment
              </Button>
            )}
          </div>
        </Card>

        <Card>
          <SectionHeader title="Need a change?" />
          <p className="text-sm leading-6 text-ui-muted">
            Online rescheduling is not supported by the current scheduling API. Contact your care
            team through their usual verified channel before cancelling if you need another time.
          </p>
          <Button asChild variant="secondary" className="mt-5">
            <Link href="/chat">Ask for guidance</Link>
          </Button>
        </Card>
      </div>

      <Card>
        <SectionHeader title="Prepare for your visit" />
        <ul className="grid gap-3 text-sm leading-6 text-ui-ink sm:grid-cols-2">
          <li className="rounded-ui-md bg-ui-surface-inset p-4">
            Write down questions and recent symptoms.
          </li>
          <li className="rounded-ui-md bg-ui-surface-inset p-4">
            Review medicines and any recent changes.
          </li>
          <li className="rounded-ui-md bg-ui-surface-inset p-4">
            Confirm location, arrival time, or video link.
          </li>
          <li className="rounded-ui-md bg-ui-surface-inset p-4">
            Bring identification and insurance details if requested.
          </li>
        </ul>
      </Card>
    </div>
  );
}
