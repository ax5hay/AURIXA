import type { Appointment } from "@/app/api";

export function findSchedulingConflict(
  appointments: Appointment[],
  providerName: string | undefined,
  date: string,
  time: string,
): Appointment | null {
  if (!providerName || !date || !time) return null;
  const requested = new Date(`${date}T${time}:00`).getTime();
  if (Number.isNaN(requested)) return null;
  return (
    appointments.find(
      (appointment) =>
        appointment.status.toLowerCase() !== "cancelled" &&
        appointment.providerName === providerName &&
        Math.abs(new Date(appointment.startTime).getTime() - requested) < 30 * 60 * 1000,
    ) ?? null
  );
}
