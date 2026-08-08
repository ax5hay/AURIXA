"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Button,
  DataTable,
  Dialog,
  EmptyState,
  FieldShell,
  Input,
  PageHeader,
  Select,
  useToast,
} from "@aurixa/ui-kit";
import { createTenant, getTenants, updateTenant, type Tenant } from "@/app/services/api";
import { PageShell, StatusBadge } from "@/components/OperatorCompositions";

const initialForm = { name: "", plan: "starter", status: "active" };

export default function TenantsPage() {
  const { toast } = useToast();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<Tenant | null>(null);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setTenants(await getTenants());
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Organizations could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = async () => {
    if (!form.name.trim()) {
      setFormError("Organization name is required.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await createTenant({
        name: form.name.trim(),
        plan: form.plan as "starter" | "professional" | "enterprise",
      });
      setCreateOpen(false);
      setForm(initialForm);
      await refresh();
      toast({ title: "Organization created", tone: "success" });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Creation failed.");
    } finally {
      setSaving(false);
    }
  };

  const openManage = (tenant: Tenant) => {
    setSelected(tenant);
    setForm({ name: tenant.name, plan: tenant.plan, status: tenant.status });
    setFormError(null);
  };

  const update = async () => {
    if (!selected || !form.name.trim()) return;
    setSaving(true);
    setFormError(null);
    try {
      await updateTenant(selected.id, {
        name: form.name.trim(),
        plan: form.plan,
        status: form.status,
      });
      setSelected(null);
      setForm(initialForm);
      await refresh();
      toast({ title: "Organization updated", tone: "success" });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Update failed.");
    } finally {
      setSaving(false);
    }
  };

  const fields = (
    <div className="space-y-4">
      {formError && (
        <Alert title="Unable to save" tone="danger">
          {formError}
        </Alert>
      )}
      <FieldShell label="Organization name" htmlFor="tenant-name" required>
        <Input
          id="tenant-name"
          value={form.name}
          onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))}
          autoFocus
        />
      </FieldShell>
      <FieldShell label="Plan" htmlFor="tenant-plan">
        <Select
          id="tenant-plan"
          value={form.plan}
          onChange={(event) => setForm((value) => ({ ...value, plan: event.target.value }))}
        >
          <option value="starter">Starter</option>
          <option value="professional">Professional</option>
          <option value="enterprise">Enterprise</option>
        </Select>
      </FieldShell>
      {selected && (
        <FieldShell label="Status" htmlFor="tenant-status">
          <Select
            id="tenant-status"
            value={form.status}
            onChange={(event) => setForm((value) => ({ ...value, status: event.target.value }))}
          >
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspended</option>
          </Select>
        </FieldShell>
      )}
    </div>
  );

  return (
    <PageShell>
      <PageHeader
        eyebrow="Manage"
        title="Organizations"
        description="Tenant organizations, plans, and lifecycle state returned by the admin API."
        actions={
          <Button
            onClick={() => {
              setForm(initialForm);
              setFormError(null);
              setCreateOpen(true);
            }}
          >
            Add organization
          </Button>
        }
      />
      {loadError && (
        <Alert title="Organizations unavailable" tone="danger" className="mb-5">
          {loadError}
        </Alert>
      )}

      <Dialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Add organization"
        description="Creates a tenant through the existing admin API."
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={create} disabled={saving}>
              {saving ? "Creating…" : "Create organization"}
            </Button>
          </>
        }
      >
        {fields}
      </Dialog>
      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelected(null)}
        title="Manage organization"
        description={selected ? `Tenant ID: ${selected.id}` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setSelected(null)}>
              Cancel
            </Button>
            <Button onClick={update} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </>
        }
      >
        {fields}
      </Dialog>

      {!loading && !tenants.length ? (
        <EmptyState
          title="No organizations returned"
          description="Create an organization when the admin API is available."
          action={<Button onClick={() => setCreateOpen(true)}>Add organization</Button>}
        />
      ) : (
        <DataTable
          caption="Tenant organizations"
          headers={["Organization", "Plan", "Status", "API keys", "Created", ""]}
        >
          {loading ? (
            <tr>
              <td colSpan={6} className="table-cell py-10 text-center">
                Loading organizations…
              </td>
            </tr>
          ) : (
            tenants.map((tenant) => (
              <tr key={tenant.id}>
                <td className="table-cell">
                  <strong className="block text-white">{tenant.name}</strong>
                  <span className="font-mono text-xs text-white/40">{tenant.id}</span>
                </td>
                <td className="table-cell capitalize">{tenant.plan}</td>
                <td className="table-cell">
                  <StatusBadge status={tenant.status} />
                </td>
                <td className="table-cell font-mono">{tenant.apiKeys ?? 0}</td>
                <td className="table-cell">{tenant.created}</td>
                <td className="table-cell text-right">
                  <Button variant="quiet" onClick={() => openManage(tenant)}>
                    Manage
                  </Button>
                </td>
              </tr>
            ))
          )}
        </DataTable>
      )}
    </PageShell>
  );
}
