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
  useToast,
} from "@aurixa/ui-kit";
import { createClient, getClients, type Client } from "../api";
import { useStaffContext } from "@/context/StaffContext";

export default function ClientsPage() {
  const { toast } = useToast();
  const { tenantId, roleCategory } = useStaffContext();
  const canCreateClient = roleCategory === "agent" || roleCategory === "coordination";
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", phoneNumber: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const tid = tenantId;

  useEffect(() => {
    setLoading(true);
    setLoadError(false);
    getClients(tid)
      .then(setClients)
      .catch(() => {
        setClients([]);
        setLoadError(true);
      })
      .finally(() => setLoading(false));
  }, [tid]);

  const filtered = clients.filter((client) => {
    const query = search.trim().toLowerCase();
    return (
      !query ||
      client.fullName.toLowerCase().includes(query) ||
      client.email?.toLowerCase().includes(query) ||
      client.phoneNumber?.includes(query)
    );
  });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.fullName.trim()) {
      setFormError("Enter the client’s full name.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const created = await createClient({
        full_name: form.fullName.trim(),
        email: form.email.trim() || undefined,
        phone_number: form.phoneNumber.trim() || undefined,
        tenant_id: tid,
      });
      setClients((current) => [...current, created]);
      setDialogOpen(false);
      setForm({ fullName: "", email: "", phoneNumber: "" });
      toast({
        title: "Client added",
        description: "The client is now in the client directory.",
        tone: "success",
      });
    } catch {
      setFormError("The client could not be added. Check the details and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageLoader label="Loading client directory" />;

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        eyebrow="Client directory"
        title="Clients"
        description="Find client context quickly. Identity remains visible before any showing or follow-up."
        actions={
          canCreateClient ? <Button onClick={() => setDialogOpen(true)}>Add client</Button> : undefined
        }
      />

      {loadError && (
        <Alert title="Client directory unavailable" tone="danger">
          No client records are shown. Check the API connection and reload this page.
        </Alert>
      )}

      <div>
        <SearchInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name, email, or phone"
          aria-label="Search clients"
        />
      </div>
      <p className="text-sm text-ui-muted">{filtered.length} client records</p>

      {filtered.length ? (
        <>
          <DataTable
            caption="Client directory"
            headers={["Client", "Contact", "Record", ""]}
            className="hidden md:block"
          >
            {filtered.map((client) => (
              <tr key={client.id} className="clinical-table-row">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={client.fullName} />
                    <span className="font-semibold text-ui-ink">{client.fullName}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-ui-muted">
                  {client.email || client.phoneNumber || "No contact on file"}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-ui-faint">#{client.id}</td>
                <td className="px-4 py-3 text-right">
                  <Button asChild variant="quiet">
                    <Link href={`/clients/${client.id}`}>Open record</Link>
                  </Button>
                </td>
              </tr>
            ))}
          </DataTable>
          <div className="grid gap-3 md:hidden">
            {filtered.map((client) => (
              <Card key={client.id} variant="compact" padding="md">
                <div className="flex items-start gap-3">
                  <Avatar name={client.fullName} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ui-ink">{client.fullName}</p>
                    <p className="mt-1 truncate text-sm text-ui-muted">
                      {client.email || client.phoneNumber || "No contact on file"}
                    </p>
                    <Button asChild variant="secondary" className="mt-3 w-full">
                      <Link href={`/clients/${client.id}`}>Open record</Link>
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          title={search ? "No matching clients" : "No clients in this view"}
          description={
            search
              ? "Try a name, email, or phone number."
              : "No client records were returned for this organization."
          }
          action={
            canCreateClient ? <Button onClick={() => setDialogOpen(true)}>Add client</Button> : undefined
          }
        />
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Add client"
        description="Add only the minimum information needed for the client directory."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="add-client-form" loading={submitting}>
              Add client
            </Button>
          </>
        }
      >
        <form id="add-client-form" onSubmit={submit} className="space-y-4">
          {formError && (
            <Alert title="Could not add client" tone="danger">
              {formError}
            </Alert>
          )}
          <FieldShell label="Full name" htmlFor="client-name" required>
            <Input
              id="client-name"
              autoFocus
              value={form.fullName}
              onChange={(event) =>
                setForm((current) => ({ ...current, fullName: event.target.value }))
              }
            />
          </FieldShell>
          <FieldShell label="Email" htmlFor="client-email" hint="Optional">
            <Input
              id="client-email"
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm((current) => ({ ...current, email: event.target.value }))
              }
            />
          </FieldShell>
          <FieldShell label="Phone" htmlFor="client-phone" hint="Optional">
            <Input
              id="client-phone"
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
