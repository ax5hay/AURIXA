"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getAppointments, getTenants, getPatients, updateAppointmentStatus, type Appointment } from "../api";
import { useStaffContext } from "@/context/StaffContext";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

function parseTenantId(s: string): number | undefined {
  if (!s) return undefined;
  const n = parseInt(s.replace(/^t-0*/, ""), 10);
  return isNaN(n) ? undefined : n;
}

export default function AppointmentsPage() {
  const { tenantFilter, setTenantFilter, tenantId } = useStaffContext();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [tenants, setTenants] = useState<{ id: string; name: string }[]>([]);
  const [patientMap, setPatientMap] = useState<Record<number, string>>({});
  const [dateFrom, setDateFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(() => new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const tid = tenantId ?? parseTenantId(tenantFilter);

  useEffect(() => {
    getTenants().then(setTenants).catch(() => []);
  }, []);

  useEffect(() => {
    setLoading(true);
    getAppointments({
      tenantId: tid,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    })
      .then(setAppointments)
      .catch(() => [])
      .finally(() => setLoading(false));
  }, [tid, dateFrom, dateTo]);

  useEffect(() => {
    getPatients().then((ps) => {
      const m: Record<number, string> = {};
      ps.forEach((p) => { m[p.id] = p.fullName; });
      setPatientMap(m);
    }).catch(() => ({}));
  }, []);

  const handleCancel = async (id: number) => {
    setCancellingId(id);
    try {
      await updateAppointmentStatus(id, "cancelled");
      setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status: "cancelled" } : a)));
    } catch {
      // ignore
    } finally {
      setCancellingId(null);
    }
  };

  const handleComplete = async (id: number) => {
    setCancellingId(id);
    try {
      await updateAppointmentStatus(id, "completed");
      setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status: "completed" } : a)));
    } catch {
      // ignore
    } finally {
      setCancellingId(null);
    }
  };

  const confirmed = appointments.filter((a) => a.status === "confirmed");
  const others = appointments.filter((a) => a.status !== "confirmed");

  return (
    <div className="space-y-6 -mt-6 pb-8">
      <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
        <div>
          <label className="text-xs text-white/40 block mb-1">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-4 py-2 rounded-xl bg-surface-secondary/80 border border-white/10 text-white"
          />
        </div>
        <div>
          <label className="text-xs text-white/40 block mb-1">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-4 py-2 rounded-xl bg-surface-secondary/80 border border-white/10 text-white"
          />
        </div>
        <div>
          <label className="text-xs text-white/40 block mb-1">Tenant</label>
          <select
            value={tenantFilter}
            onChange={(e) => setTenantFilter(e.target.value)}
            className="px-4 py-2 rounded-xl bg-surface-secondary/80 border border-white/10 text-white"
          >
            <option value="">All</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-white/50">Loading...</div>
      ) : (
        <>
          <h2 className="text-lg font-semibold text-white/80">Confirmed ({confirmed.length})</h2>
          <div className="space-y-3">
            {confirmed.map((a) => (
              <div key={a.id} className="glass rounded-xl p-4 flex justify-between items-center glass-hover">
                <div>
                  <p className="text-white font-medium">{patientMap[a.patientId ?? 0] ?? `Patient #${a.patientId}`}</p>
                  <p className="text-white/50 text-sm">{a.providerName} · {formatDate(a.startTime ?? "")}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-lg text-xs bg-hospital-600/20 text-hospital-400">{a.status}</span>
                  <button
                    onClick={() => handleComplete(a.id)}
                    disabled={cancellingId === a.id}
                    className="px-2 py-1 rounded text-xs bg-green-600/20 text-green-400 hover:bg-green-600/30 disabled:opacity-50"
                  >
                    Complete
                  </button>
                  <button
                    onClick={() => handleCancel(a.id)}
                    disabled={cancellingId === a.id}
                    className="px-2 py-1 rounded text-xs bg-red-600/20 text-red-400 hover:bg-red-600/30 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  {a.patientId && (
                    <Link href={`/patients/${a.patientId}`} className="text-hospital-400 text-sm hover:underline">View patient</Link>
                  )}
                </div>
              </div>
            ))}
            {confirmed.length === 0 && <p className="text-white/50 text-sm">No confirmed appointments in range.</p>}
          </div>

          {others.length > 0 && (
            <>
              <h2 className="text-lg font-semibold text-white/80 mt-8">Other ({others.length})</h2>
              <div className="space-y-2">
                {others.map((a) => (
                  <div key={a.id} className="glass rounded-xl p-3 flex justify-between items-center opacity-80">
                    <p className="text-white/80">{patientMap[a.patientId ?? 0] ?? `#${a.patientId}`} · {a.providerName} · {formatDate(a.startTime ?? "")}</p>
                    <span className="text-white/40 text-xs">{a.status}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          <Link href="/schedule" className="inline-flex mt-4 px-4 py-2 rounded-xl bg-hospital-500/80 hover:bg-hospital-600 text-white text-sm font-medium">
            Book new appointment
          </Link>
        </>
      )}
    </div>
  );
}
