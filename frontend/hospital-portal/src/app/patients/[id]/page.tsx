"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getPatient, getPatientAppointments } from "../../api";
import type { Patient, Appointment } from "../../api";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export default function PatientDetailPage() {
  const params = useParams();
  const id = parseInt(String(params?.id ?? ""), 10);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isNaN(id)) return;
    Promise.all([
      getPatient(id).then(setPatient).catch(() => null),
      getPatientAppointments(id).then(setAppointments).catch(() => []),
    ]).finally(() => setLoading(false));
  }, [id]);

  if (isNaN(id)) return <div className="text-red-400">Invalid patient ID</div>;
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <span className="inline-flex gap-1 mb-4">
          <span className="h-3 w-3 bg-hospital-400 rounded-full animate-pulse" />
          <span className="h-3 w-3 bg-hospital-400 rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
          <span className="h-3 w-3 bg-hospital-400 rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
        </span>
        <p className="text-white/50 text-sm">Loading patient...</p>
      </div>
    );
  }
  if (!patient) {
    return (
      <div className="glass rounded-xl p-6">
        <p className="text-red-400">Patient not found.</p>
        <Link href="/patients" className="text-hospital-400 hover:underline mt-2 inline-block">Back to patients</Link>
      </div>
    );
  }

  const upcoming = appointments.filter((a) => a.status === "confirmed" && new Date(a.startTime) > new Date());
  const past = appointments.filter((a) => a.status === "completed" || new Date(a.startTime) < new Date());

  return (
    <div className="space-y-6 -mt-6 pb-8">
      <Link href="/patients" className="text-hospital-400 hover:underline text-sm">Back to patients</Link>
      <div className="glass rounded-2xl p-6 glow-sm">
        <h2 className="text-xl font-semibold text-white">{patient.fullName}</h2>
        <div className="mt-3 flex flex-wrap gap-4">
          {patient.email && <p className="text-white/60 text-sm">Email: {patient.email}</p>}
          {patient.phoneNumber && <p className="text-white/60 text-sm">Phone: {patient.phoneNumber}</p>}
        </div>
      </div>
      <div className="glass rounded-xl p-6">
        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">Appointments</h3>
        {upcoming.length > 0 && (
          <div className="mb-4">
            <p className="text-white/50 text-xs mb-2">Upcoming</p>
            {upcoming.map((a) => (
              <div key={a.id} className="flex justify-between items-center border border-white/5 rounded-xl p-3 mb-2 bg-surface-secondary/40">
                <p className="text-white">{a.providerName} - {formatDate(a.startTime)}</p>
                <span className="px-2 py-1 rounded-lg text-xs bg-hospital-600/20 text-hospital-400">{a.status}</span>
              </div>
            ))}
          </div>
        )}
        {past.length > 0 && (
          <div>
            <p className="text-white/50 text-xs mb-2">Past</p>
            {past.slice(0, 5).map((a) => (
              <div key={a.id} className="flex justify-between items-center border border-white/5 rounded-xl p-2 mb-2 opacity-80">
                <p className="text-white/80 text-sm">{a.providerName} - {formatDate(a.startTime)}</p>
                <span className="text-white/40 text-xs">{a.status}</span>
              </div>
            ))}
          </div>
        )}
        {appointments.length === 0 && <p className="text-white/50 text-sm">No appointments on record.</p>}
      </div>
      <Link href={`/chat?patientId=${id}`} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-hospital-500/80 hover:bg-hospital-600 text-white text-sm font-medium">
        Ask AI about this patient
      </Link>
    </div>
  );
}
