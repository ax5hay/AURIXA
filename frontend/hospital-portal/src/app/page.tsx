"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  getPatients,
  getAppointments,
  getKnowledgeArticles,
  getServiceHealth,
  getTenants,
  type Patient,
  type Appointment,
} from "./api";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export default function DashboardPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [articles, setArticles] = useState<{ id: number; title: string }[]>([]);
  const [health, setHealth] = useState<Record<string, { status: string }>>({});
  const [tenants, setTenants] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
    Promise.all([
      getPatients().then(setPatients).catch(() => []),
      getAppointments({ dateFrom: today, dateTo: tomorrow }).then(setAppointments).catch(() => []),
      getKnowledgeArticles().then((a) => a.map((x) => ({ id: x.id, title: x.title }))).catch(() => []),
      getServiceHealth().then(setHealth).catch(() => ({})),
      getTenants().then(setTenants).catch(() => []),
    ]).finally(() => setLoading(false));
  }, []);

  const todayAppts = appointments.filter((a) => a.status === "confirmed");
  const healthyCount = Object.values(health).filter((h) => h?.status === "healthy").length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <span className="inline-flex gap-1 mb-4">
          <span className="h-3 w-3 bg-hospital-400 rounded-full animate-pulse" />
          <span className="h-3 w-3 bg-hospital-400 rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
          <span className="h-3 w-3 bg-hospital-400 rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
        </span>
        <p className="text-white/50 text-sm">Loading staff dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background via-background to-surface-primary/80 -mt-6">
      <div className="space-y-6">
        <div className="glass rounded-2xl p-6 glow-sm">
          <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-1">Staff Dashboard</h2>
          <p className="text-white/60 text-sm">Overview of patients, appointments, and platform status</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass rounded-xl p-4">
            <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Patients</p>
            <p className="text-2xl font-bold text-hospital-400">{patients.length}</p>
            <Link href="/patients" className="text-xs text-hospital-400 hover:underline mt-1 block">View all →</Link>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Today&apos;s Appointments</p>
            <p className="text-2xl font-bold text-white">{todayAppts.length}</p>
            <Link href="/appointments" className="text-xs text-hospital-400 hover:underline mt-1 block">View schedule →</Link>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Knowledge Articles</p>
            <p className="text-2xl font-bold text-white">{articles.length}</p>
            <Link href="/knowledge" className="text-xs text-hospital-400 hover:underline mt-1 block">Browse →</Link>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Services Healthy</p>
            <p className="text-2xl font-bold text-white">{healthyCount}/{Object.keys(health).length || 1}</p>
            <Link href="/status" className="text-xs text-hospital-400 hover:underline mt-1 block">Details →</Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass rounded-xl p-6">
            <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">Today&apos;s Appointments</h2>
            {todayAppts.length === 0 ? (
              <div className="text-center py-8 rounded-xl bg-surface-secondary/30 border border-dashed border-white/10">
                <p className="text-white/50 text-sm">No appointments today.</p>
                <Link href="/schedule" className="mt-2 inline-block text-hospital-400 text-sm hover:underline">Book a slot →</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {todayAppts.slice(0, 5).map((a) => (
                  <div key={a.id} className="flex justify-between items-center border border-white/5 rounded-xl p-3 bg-surface-secondary/40">
                    <div>
                      <p className="text-white font-medium">Patient #{a.patientId ?? "—"}</p>
                      <p className="text-white/50 text-sm">{a.providerName} · {formatDate(a.startTime ?? "")}</p>
                    </div>
                    <span className="px-2 py-1 rounded-lg text-xs bg-hospital-600/20 text-hospital-400 capitalize">{a.status}</span>
                  </div>
                ))}
                {todayAppts.length > 5 && (
                  <Link href="/appointments" className="text-sm text-hospital-400 hover:underline">View all {todayAppts.length} →</Link>
                )}
              </div>
            )}
          </div>

          <div className="glass rounded-xl p-6">
            <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">Recent Patients</h2>
            {patients.length === 0 ? (
              <p className="text-white/50 text-sm">No patients on file.</p>
            ) : (
              <div className="space-y-2">
                {patients.slice(0, 5).map((p) => (
                  <Link key={p.id} href={`/patients/${p.id}`} className="block p-3 rounded-xl bg-surface-secondary/40 hover:bg-surface-secondary/60 transition-colors">
                    <p className="text-white font-medium">{p.fullName}</p>
                    <p className="text-white/50 text-xs">{p.email || p.phoneNumber || "—"}</p>
                  </Link>
                ))}
                <Link href="/patients" className="text-sm text-hospital-400 hover:underline">View all {patients.length} →</Link>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-center gap-4 pb-8">
          <Link href="/chat" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-hospital-500 hover:bg-hospital-600 text-white font-medium transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            AI Assistant
          </Link>
          <Link href="/schedule" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-hospital-500/50 text-hospital-400 hover:bg-hospital-500/10 font-medium transition-colors">
            Schedule Appointment
          </Link>
        </div>
      </div>
    </div>
  );
}
