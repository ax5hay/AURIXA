"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Alert,
  Button,
  Card,
  ErrorSummary,
  FieldShell,
  Input,
  PageHeader,
  SearchSelect,
  Select,
  useToast,
} from "@aurixa/ui-kit";
import {
  createAppointment,
  getAppointments,
  getPatients,
  getStaff,
  type Appointment,
  type Patient,
} from "../api";
import { useStaffContext } from "@/context/StaffContext";
import { findSchedulingConflict } from "@/lib/scheduling";

function parseTenantId(value: string): number | undefined {
  const parsed = parseInt(value.replace(/^t-0*/, ""), 10);
  return value && !isNaN(parsed) ? parsed : undefined;
}

export default function SchedulePage() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const { tenantFilter, tenantId } = useStaffContext();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<{ id: number; fullName: string }[]>([]);
  const [patientId, setPatientId] = useState(searchParams.get("patientId") ?? "");
  const [date, setDate] = useState(() => new Date(Date.now() + 864e5).toISOString().slice(0, 10));
  const [time, setTime] = useState("09:00");
  const [providerId, setProviderId] = useState("");
  const [reason, setReason] = useState("");
  const [step, setStep] = useState<"details" | "review" | "success">("details");
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [existingAppointments, setExistingAppointments] = useState<Appointment[]>([]);
  const [directoryError, setDirectoryError] = useState(false);
  const tid = tenantId ?? parseTenantId(tenantFilter);

  useEffect(() => {
    getPatients(tid)
      .then((records) => {
        setPatients(records);
        setDirectoryError(false);
      })
      .catch(() => {
        setPatients([]);
        setDirectoryError(true);
      });
    getStaff({ role: "doctor", tenantId: tid })
      .then((staff) => setDoctors(staff.map((item) => ({ id: item.id, fullName: item.fullName }))))
      .catch(() => setDoctors([]));
  }, [tid]);

  useEffect(() => {
    if (!date) return;
    getAppointments({ tenantId: tid, dateFrom: date, dateTo: date, limit: 200 })
      .then(setExistingAppointments)
      .catch(() => setExistingAppointments([]));
  }, [date, tid]);

  useEffect(() => {
    if (doctors.length && !doctors.some((doctor) => String(doctor.id) === providerId)) {
      setProviderId(String(doctors[0].id));
    }
  }, [doctors, providerId]);

  const selectedPatient = useMemo(
    () => patients.find((patient) => String(patient.id) === patientId),
    [patientId, patients],
  );
  const selectedDoctor = useMemo(
    () => doctors.find((doctor) => String(doctor.id) === providerId),
    [doctors, providerId],
  );
  const conflict = useMemo(
    () =>
      findSchedulingConflict(existingAppointments, selectedDoctor?.fullName, date, time),
    [date, existingAppointments, selectedDoctor, time],
  );

  const validate = () => {
    const next: string[] = [];
    if (!patientId) next.push("Select a patient.");
    if (!providerId || !selectedDoctor) next.push("Select an available clinician.");
    if (!date) next.push("Choose a visit date.");
    if (!time) next.push("Choose a visit time.");
    if (!reason.trim()) next.push("Enter a reason for the visit.");
    if (conflict) next.push("Choose another time; this clinician has an overlapping appointment.");
    setErrors(next);
    return next.length === 0;
  };

  const review = (event: React.FormEvent) => {
    event.preventDefault();
    if (validate()) setStep("review");
  };

  const book = async () => {
    if (!validate() || !selectedDoctor) {
      setStep("details");
      return;
    }
    setSubmitting(true);
    try {
      await createAppointment({
        patient_id: parseInt(patientId, 10),
        tenant_id: tid,
        provider_name: selectedDoctor.fullName,
        reason: reason.trim(),
        date,
        start_time: time,
      });
      setStep("success");
      toast({
        title: "Appointment booked",
        description: `${date} at ${time} has been reserved.`,
        tone: "success",
      });
    } catch {
      setErrors([
        "The appointment could not be booked. No reservation was created; please try again.",
      ]);
      setStep("details");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-8">
      <PageHeader
        eyebrow="Care coordination"
        title="Schedule an appointment"
        description="Complete the visit details, review the patient and clinician, then confirm."
      />
      <ol className="grid grid-cols-3 gap-2" aria-label="Scheduling progress">
        {["Visit details", "Review", "Confirmation"].map((label, index) => {
          const activeIndex = step === "details" ? 0 : step === "review" ? 1 : 2;
          return (
            <li
              key={label}
              aria-current={index === activeIndex ? "step" : undefined}
              className={`rounded-ui-md border px-3 py-3 text-center text-xs font-semibold ${index === activeIndex ? "border-ui-accent bg-ui-tint text-ui-accent" : "border-ui-border bg-ui-surface text-ui-muted"}`}
            >
              {index + 1}. {label}
            </li>
          );
        })}
      </ol>

      {step === "details" && (
        <form onSubmit={review} className="space-y-5">
          <ErrorSummary errors={errors} />
          {!doctors.length && (
            <Alert title="No clinicians available" tone="warning">
              The staff directory did not return any doctors for this organization. Booking cannot
              continue until a clinician is available.
            </Alert>
          )}
          {directoryError && (
            <Alert title="Patient directory unavailable" tone="danger">
              Booking is disabled because patient identity cannot be verified.
            </Alert>
          )}
          <Card variant="standard" padding="lg">
            <div className="space-y-5">
              <SearchSelect
                label="Patient"
                required
                value={patientId}
                onChange={(value) => setPatientId(value ?? "")}
                options={patients.map((patient) => ({
                  value: String(patient.id),
                  label: patient.fullName,
                  description: `Record #${patient.id}${patient.phoneNumber ? ` · ${patient.phoneNumber}` : ""}`,
                }))}
                placeholder="Find patient"
                searchPlaceholder="Search name, record, or phone"
                emptyMessage="No matching patient in this organization"
                disabled={directoryError}
              />
              <FieldShell label="Clinician" htmlFor="schedule-provider" required>
                <Select
                  id="schedule-provider"
                  value={providerId}
                  onChange={(event) => setProviderId(event.target.value)}
                >
                  <option value="">Select clinician</option>
                  {doctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.fullName}
                    </option>
                  ))}
                </Select>
              </FieldShell>
              <div className="grid gap-4 sm:grid-cols-2">
                <FieldShell label="Date" htmlFor="schedule-date" required>
                  <Input
                    id="schedule-date"
                    type="date"
                    min={new Date().toISOString().slice(0, 10)}
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                  />
                </FieldShell>
                <FieldShell label="Time" htmlFor="schedule-time" required>
                  <Input
                    id="schedule-time"
                    type="time"
                    value={time}
                    onChange={(event) => setTime(event.target.value)}
                  />
                </FieldShell>
              </div>
              {conflict && (
                <Alert title="Potential scheduling conflict" tone="warning">
                  {selectedDoctor?.fullName} has another non-cancelled appointment within 30 minutes
                  of this time. Choose another slot. The scheduling API does not enforce conflict
                  prevention, so this check is advisory and required before submission.
                </Alert>
              )}
              <FieldShell
                label="Reason for visit"
                htmlFor="schedule-reason"
                required
                hint="Use a concise operational reason; avoid unnecessary clinical detail."
              >
                <Input
                  id="schedule-reason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="e.g. Follow-up visit"
                />
              </FieldShell>
            </div>
          </Card>
          <Button type="submit" className="w-full">
            Review appointment
          </Button>
        </form>
      )}

      {step === "review" && (
        <Card variant="feature" padding="lg">
          <p className="eyebrow">Confirm patient identity</p>
          <h2 className="text-2xl font-semibold text-ui-ink">{selectedPatient?.fullName}</h2>
          <dl className="mt-5 grid gap-4 rounded-ui-md bg-ui-surface p-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold text-ui-muted">Clinician</dt>
              <dd className="mt-1 text-sm font-semibold">{selectedDoctor?.fullName}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-ui-muted">Date and time</dt>
              <dd className="mt-1 text-sm font-semibold">
                {date} at {time}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold text-ui-muted">Reason</dt>
              <dd className="mt-1 text-sm font-semibold">{reason}</dd>
            </div>
          </dl>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setStep("details")}>
              Edit details
            </Button>
            <Button loading={submitting} onClick={book}>
              Confirm appointment
            </Button>
          </div>
        </Card>
      )}

      {step === "success" && (
        <Card variant="feature" padding="lg">
          <Alert title="Appointment confirmed" tone="success">
            The appointment service accepted the reservation for {selectedPatient?.fullName} on{" "}
            {date} at {time}.
          </Alert>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/appointments">View appointments</Link>
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setStep("details");
                setReason("");
              }}
            >
              Schedule another
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
