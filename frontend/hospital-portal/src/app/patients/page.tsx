"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Alert,
  Avatar,
  Button,
  Card,
  DataTable,
  Dialog,
  EmptyState,
  FieldShell,
  Input,
  PageHeader,
  PageLoader,
  SearchInput,
  Select,
  useToast,
} from "@aurixa/ui-kit";
import { createPatient, getPatients, getTenants, type Patient } from "../api";
import { useStaffContext } from "@/context/StaffContext";

function parseTenantId(value: string): number | undefined {
  const parsed = parseInt(value.replace(/^t-0*/, ""), 10);
  return value && !isNaN(parsed) ? parsed : undefined;
}

export default function PatientsPage() {
  const { toast } = useToast();
  const { tenantFilter, setTenantFilter, tenantId } = useStaffContext();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [tenants, setTenants] = useState<{ id: string; name: string }[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", phoneNumber: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const tid = tenantId ?? parseTenantId(tenantFilter);

  useEffect(() => {
    setLoading(true);
    setLoadError(false);
    getPatients(tid)
      .then(setPatients)
      .catch(() => {
        setPatients([]);
        setLoadError(true);
      })
      .finally(() => setLoading(false));
  }, [tid]);

  useEffect(() => {
    getTenants()
      .then(setTenants)
      .catch(() => setTenants([]));
  }, []);

  const filtered = patients.filter((patient) => {
    const query = search.trim().toLowerCase();
    return (
      !query ||
      patient.fullName.toLowerCase().includes(query) ||
      patient.email?.toLowerCase().includes(query) ||
      patient.phoneNumber?.includes(query)
    );
  });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.fullName.trim()) {
      setFormError("Enter the patient’s full name.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const created = await createPatient({
        full_name: form.fullName.trim(),
        email: form.email.trim() || undefined,
        phone_number: form.phoneNumber.trim() || undefined,
        tenant_id: tid,
      });
      setPatients((current) => [...current, created]);
      setDialogOpen(false);
      setForm({ fullName: "", email: "", phoneNumber: "" });
      toast({
        title: "Patient added",
        description: "The patient is now in the care directory.",
        tone: "success",
      });
    } catch {
      setFormError("The patient could not be added. Check the details and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageLoader label="Loading patient directory" />;

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        eyebrow="Care directory"
        title="Patients"
        description="Find patient context quickly. Identity remains visible before any care action."
        actions={<Button onClick={() => setDialogOpen(true)}>Add patient</Button>}
      />

      {loadError && (
        <Alert title="Patient directory unavailable" tone="danger">
          No patient records are shown. Check the API connection and reload this page.
        </Alert>
      )}

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_16rem]">
        <SearchInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name, email, or phone"
          aria-label="Search patients"
        />
        <Select
          value={tenantFilter}
          onChange={(event) => setTenantFilter(event.target.value)}
          aria-label="Filter patients by organization"
        >
          <option value="">All organizations</option>
          {tenants.map((tenant) => (
            <option key={tenant.id} value={tenant.id}>
              {tenant.name}
            </option>
          ))}
        </Select>
      </div>
      <p className="text-sm text-ui-muted">{filtered.length} patient records</p>

      {filtered.length ? (
        <>
          <DataTable
            caption="Patient directory"
            headers={["Patient", "Contact", "Record", ""]}
            className="hidden md:block"
          >
            {filtered.map((patient) => (
              <tr key={patient.id} className="clinical-table-row">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={patient.fullName} />
                    <span className="font-semibold text-ui-ink">{patient.fullName}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-ui-muted">
                  {patient.email || patient.phoneNumber || "No contact on file"}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-ui-faint">#{patient.id}</td>
                <td className="px-4 py-3 text-right">
                  <Button asChild variant="quiet">
                    <Link href={`/patients/${patient.id}`}>Open record</Link>
                  </Button>
                </td>
              </tr>
            ))}
          </DataTable>
          <div className="grid gap-3 md:hidden">
            {filtered.map((patient) => (
              <Card key={patient.id} variant="compact" padding="md">
                <div className="flex items-start gap-3">
                  <Avatar name={patient.fullName} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ui-ink">{patient.fullName}</p>
                    <p className="mt-1 truncate text-sm text-ui-muted">
                      {patient.email || patient.phoneNumber || "No contact on file"}
                    </p>
                    <Button asChild variant="secondary" className="mt-3 w-full">
                      <Link href={`/patients/${patient.id}`}>Open record</Link>
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          title={search ? "No matching patients" : "No patients in this view"}
          description={
            search
              ? "Try a name, email, or phone number."
              : "No patient records were returned for this organization."
          }
          action={<Button onClick={() => setDialogOpen(true)}>Add patient</Button>}
        />
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Add patient"
        description="Add only the minimum information needed for the care directory."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="add-patient-form" loading={submitting}>
              Add patient
            </Button>
          </>
        }
      >
        <form id="add-patient-form" onSubmit={submit} className="space-y-4">
          {formError && (
            <Alert title="Could not add patient" tone="danger">
              {formError}
            </Alert>
          )}
          <FieldShell label="Full name" htmlFor="patient-name" required>
            <Input
              id="patient-name"
              autoFocus
              value={form.fullName}
              onChange={(event) =>
                setForm((current) => ({ ...current, fullName: event.target.value }))
              }
            />
          </FieldShell>
          <FieldShell label="Email" htmlFor="patient-email" hint="Optional">
            <Input
              id="patient-email"
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm((current) => ({ ...current, email: event.target.value }))
              }
            />
          </FieldShell>
          <FieldShell label="Phone" htmlFor="patient-phone" hint="Optional">
            <Input
              id="patient-phone"
              type="tel"
              value={form.phoneNumber}
              onChange={(event) =>
                setForm((current) => ({ ...current, phoneNumber: event.target.value }))
              }
            />
          </FieldShell>
        </form>
      </Dialog>
    </div>
  );
}
