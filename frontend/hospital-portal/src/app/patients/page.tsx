"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getPatients, getTenants, type Patient } from "../api";

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [tenants, setTenants] = useState<{ id: string; name: string }[]>([]);
  const [tenantFilter, setTenantFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tid = tenantFilter ? parseInt(tenantFilter.replace(/^t-/, ""), 10) : undefined;
    if (isNaN(tid as number) && tenantFilter) return;
    getPatients(tid)
      .then(setPatients)
      .catch((e) => { setError(e instanceof Error ? e.message : "Failed"); setPatients([]); })
      .finally(() => setLoading(false));
  }, [tenantFilter]);

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

  if (error) {
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
      </div>
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
      {filtered.length === 0 && (
        <div className="glass rounded-xl p-12 text-center">
          <p className="text-white/50">No patients found.</p>
        </div>
      )}
    </div>
  );
}
