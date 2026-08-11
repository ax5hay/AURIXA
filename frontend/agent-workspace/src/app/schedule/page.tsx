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
  getShowings,
  getClients,
  getStaff,
  type Appointment,
  type Client,
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
  const [clients, setClients] = useState<Client[]>([]);
  const [agents, setAgents] = useState<{ id: number; fullName: string }[]>([]);
  const [clientId, setClientId] = useState(searchParams.get("clientId") ?? "");
  const [date, setDate] = useState(() => new Date(Date.now() + 864e5).toISOString().slice(0, 10));
  const [time, setTime] = useState("09:00");
  const [providerId, setProviderId] = useState("");
  const [reason, setReason] = useState("");
  const [step, setStep] = useState<"details" | "review" | "success">("details");
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [existingShowings, setExistingShowings] = useState<Appointment[]>([]);
  const [directoryError, setDirectoryError] = useState(false);
  const tid = tenantId ?? parseTenantId(tenantFilter);

  useEffect(() => {
    getClients(tid)
      .then((records) => {
        setClients(records);
        setDirectoryError(false);
      })
      .catch(() => {
        setClients([]);
        setDirectoryError(true);
      });
    getStaff({ role: "agent", tenantId: tid })
      .then((staff) => setAgents(staff.map((item) => ({ id: item.id, fullName: item.fullName }))))
      .catch(() => setAgents([]));
  }, [tid]);

  useEffect(() => {
    if (!date) return;
    getShowings({ tenantId: tid, dateFrom: date, dateTo: date, limit: 200 })
      .then(setExistingShowings)
      .catch(() => setExistingShowings([]));
  }, [date, tid]);

  useEffect(() => {
    if (agents.length && !agents.some((agent) => String(agent.id) === providerId)) {
      setProviderId(String(agents[0].id));
    }
  }, [agents, providerId]);

  const selectedClient = useMemo(
    () => clients.find((client) => String(client.id) === clientId),
    [clientId, clients],
  );
  const selectedAgent = useMemo(
    () => agents.find((agent) => String(agent.id) === providerId),
    [agents, providerId],
  );
  const conflict = useMemo(
    () =>
      findSchedulingConflict(existingShowings, selectedAgent?.fullName, date, time),
    [date, existingShowings, selectedAgent, time],
  );

  const validate = () => {
    const next: string[] = [];
    if (!clientId) next.push("Select a client.");
    if (!providerId || !selectedAgent) next.push("Select an available agent.");
    if (!date) next.push("Choose a showing date.");
    if (!time) next.push("Choose a showing time.");
    if (!reason.trim()) next.push("Enter a reason for the showing.");
    if (conflict) next.push("Choose another time; this agent has an overlapping showing.");
    setErrors(next);
    return next.length === 0;
  };

  const review = (event: React.FormEvent) => {
    event.preventDefault();
    if (validate()) setStep("review");
  };

  const book = async () => {
    if (!validate() || !selectedAgent) {
      setStep("details");
      return;
    }
    setSubmitting(true);
    try {
      await createAppointment({
        patient_id: parseInt(clientId, 10),
        tenant_id: tid,
        provider_name: selectedAgent.fullName,
        reason: reason.trim(),
        date,
        start_time: time,
      });
      setStep("success");
      toast({
        title: "Showing booked",
        description: `${date} at ${time} has been reserved.`,
        tone: "success",
      });
    } catch {
      setErrors([
        "The showing could not be booked. No reservation was created; please try again.",
      ]);
      setStep("details");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-8">
      <PageHeader
        eyebrow="Coordination"
        title="Schedule a showing"
        description="Complete the showing details, review the client and agent, then confirm."
      />
      <ol className="grid grid-cols-3 gap-2" aria-label="Scheduling progress">
        {["Showing details", "Review", "Confirmation"].map((label, index) => {
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
          {!agents.length && (
            <Alert title="No agents available" tone="warning">
              The staff directory did not return any agents for this organization. Booking cannot
              continue until an agent is available.
            </Alert>
          )}
          {directoryError && (
            <Alert title="Client directory unavailable" tone="danger">
              Booking is disabled because client identity cannot be verified.
            </Alert>
          )}
          <Card variant="standard" padding="lg">
            <div className="space-y-5">
              <SearchSelect
                label="Client"
                required
                value={clientId}
                onChange={(value) => setClientId(value ?? "")}
                options={clients.map((client) => ({
                  value: String(client.id),
                  label: client.fullName,
                  description: `Record #${client.id}${client.phoneNumber ? ` · ${client.phoneNumber}` : ""}`,
                }))}
                placeholder="Find client"
                searchPlaceholder="Search name, record, or phone"
                emptyMessage="No matching client in this organization"
                disabled={directoryError}
              />
              <FieldShell label="Agent" htmlFor="schedule-provider" required>
                <Select
                  id="schedule-provider"
                  value={providerId}
                  onChange={(event) => setProviderId(event.target.value)}
                >
                  <option value="">Select agent</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.fullName}
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
                  {selectedAgent?.fullName} has another non-cancelled showing within 30 minutes of
                  this time. Choose another slot. The scheduling API does not enforce conflict
                  prevention, so this check is advisory and required before submission.
                </Alert>
              )}
              <FieldShell
                label="Reason for showing"
                htmlFor="schedule-reason"
                required
                hint="Use a concise operational reason; avoid unnecessary client detail."
              >
                <Input
                  id="schedule-reason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="e.g. Second walkthrough"
                />
              </FieldShell>
            </div>
          </Card>
          <Button type="submit" className="w-full">
            Review showing
          </Button>
        </form>
      )}

      {step === "review" && (
        <Card variant="feature" padding="lg">
          <p className="eyebrow">Confirm client identity</p>
          <h2 className="text-2xl font-semibold text-ui-ink">{selectedClient?.fullName}</h2>
          <dl className="mt-5 grid gap-4 rounded-ui-md bg-ui-surface p-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold text-ui-muted">Agent</dt>
              <dd className="mt-1 text-sm font-semibold">{selectedAgent?.fullName}</dd>
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
              Confirm showing
            </Button>
          </div>
        </Card>
      )}

      {step === "success" && (
        <Card variant="feature" padding="lg">
          <Alert title="Showing confirmed" tone="success">
            The showing service accepted the reservation for {selectedClient?.fullName} on {date} at{" "}
            {time}.
          </Alert>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/showings">View showings</Link>
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
