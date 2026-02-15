"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getPatients, getTenants, createPatient } from "../api";
import { useStaffContext } from "@/context/StaffContext";
import type { Patient } from "../api";

function parseTenantId(s: string): number | undefined {
  if (!s) return undefined;
  const n = parseInt(s.replace(/^t-0*/, ""), 10);
  return isNaN(n) ? undefined : n;
}

export default function PatientsPage() {
  const { tenantFilter, setTenantFilter, tenantId } = useStaffContext();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [tenants, setTenants] = useState<{ id: string; name: string }[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ fullName: "", email: "", phoneNumber: "" });
  const [submitting, setSubmitting] = useState(false);

  const tid = tenantId ?? parseTenantId(tenantFilter);

  useEffect(() => {
    getPatients(tid)
      .then(setPatients)
      .catch((e) => { setError(e instanceof Error ? e.message : "Failed"); setPatients([]); })
      .finally(() => setLoading(false));
  }, [tid]);

  useEffect(() => {
    getTenants().then(setTenants).catch(() => []);
  }, []);

  const filtered = patients.filter(
    (p) =>
      !search.trim() ||
      p.fullName.toLowerCase().includes(search.toLowerCase()) ||
      (p.email?.toLowerCase().includes(search.toLowerCase())) ||
      (p.phoneNumber?.includes(search))
  );

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const created = await createPatient({
        full_name: addForm.fullName.trim(),
        email: addForm.email.trim() || undefined,
        phone_number: addForm.phoneNumber.trim() || undefined,
        tenant_id: tid ?? 1,
      });
      setPatients((prev) => [...prev, created]);
      setShowAdd(false);
      setAddForm({ fullName: "", email: "", phoneNumber: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create patient");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <span className="inline-flex gap-1 mb-4">
          <span className="h-3 w-3 bg-hospital-400 rounded-full animate-pulse" />
          <span className="h-3 w-3 bg-hospital-400 rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
          <span className="h-3 w-3 bg-hospital-400 rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
        </span>
        <p className="text-white/50 text-sm">Loading patients...</p>
      </div>
    );
  }

  if (error && !showAdd) {
    return <div className="glass rounded-xl p-6 text-red-400">{error}</div>;
  }

  return (
    <div className="space-y-6 -mt-6 pb-8">
      <div className="flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          placeholder="Search by name, email, phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-xl bg-surface-secondary/80 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-hospital-500/50"
        />
        <select
          value={tenantFilter}
          onChange={(e) => setTenantFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-surface-secondary/80 border border-white/10 text-white"
        >
          <option value="">All tenants</option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2.5 rounded-xl bg-hospital-500 hover:bg-hospital-600 text-white font-medium whitespace-nowrap"
        >
          Add Patient
        </button>
      </div>

      {showAdd && (
        <div className="glass rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Add New Patient</h3>
          <form onSubmit={handleAddPatient} className="space-y-4">
            <input
              type="text"
              placeholder="Full name *"
              value={addForm.fullName}
              onChange={(e) => setAddForm((f) => ({ ...f, fullName: e.target.value }))}
              required
              className="w-full px-4 py-2.5 rounded-xl bg-surface-secondary/80 border border-white/10 text-white"
            />
            <input
              type="email"
              placeholder="Email"
              value={addForm.email}
              onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl bg-surface-secondary/80 border border-white/10 text-white"
            />
            <input
              type="tel"
              placeholder="Phone"
              value={addForm.phoneNumber}
              onChange={(e) => setAddForm((f) => ({ ...f, phoneNumber: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl bg-surface-secondary/80 border border-white/10 text-white"
            />
            <div className="flex gap-2">
              <button type="submit" disabled={submitting} className="px-4 py-2 rounded-xl bg-hospital-500 hover:bg-hospital-600 text-white disabled:opacity-50">
                {submitting ? "Creating..." : "Create"}
              </button>
              <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <p className="text-white/50 text-sm">{filtered.length} patients</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((p) => (
          <Link
            key={p.id}
            href={`/patients/${p.id}`}
            className="glass rounded-xl p-5 glass-hover block"
          >
            <p className="font-medium text-white text-lg">{p.fullName}</p>
            {p.email && <p className="text-white/60 text-sm mt-1">{p.email}</p>}
            {p.phoneNumber && <p className="text-white/50 text-sm">{p.phoneNumber}</p>}
            <p className="text-hospital-400 text-xs mt-2">View details →</p>
          </Link>
        ))}
      </div>
      {filtered.length === 0 && !showAdd && (
        <div className="glass rounded-xl p-12 text-center">
          <p className="text-white/50">No patients found.</p>
          <button onClick={() => setShowAdd(true)} className="mt-2 text-hospital-400 hover:underline">Add first patient</button>
        </div>
      )}
    </div>
  );
}
