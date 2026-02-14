"use client";

import { useState, useEffect } from "react";
import { getAppointments, type Appointment } from "../api";

const DEMO_PATIENT_ID = 1;

function IconCalendar() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAppointments(DEMO_PATIENT_ID)
      .then(setAppointments)
      .catch(() => [])
      .finally(() => setLoading(false));
  }, []);

  const upcoming = appointments.filter(
    (a) => a.status === "confirmed" && new Date(a.startTime) > new Date()
  );
  const past = appointments.filter(
    (a) => a.status === "completed" || new Date(a.startTime) < new Date()
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <span className="inline-flex gap-1 mb-4">
          <span className="h-3 w-3 bg-aurixa-400 rounded-full animate-pulse" />
          <span className="h-3 w-3 bg-aurixa-400 rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
          <span className="h-3 w-3 bg-aurixa-400 rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
        </span>
        <p className="text-white/50 text-sm">Loading appointments...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 -mt-6 pb-8">
      <div>
        <h2 className="text-lg font-semibold text-white/80 mb-4">Upcoming</h2>
        {upcoming.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center">
            <div className="inline-flex p-3 rounded-xl bg-aurixa-500/20 mb-3">
              <IconCalendar />
            </div>
            <p className="text-white/50">No upcoming appointments.</p>
            <p className="text-white/30 text-sm mt-1">Book one through our office or ask the assistant.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((a) => (
              <div key={a.id} className="glass rounded-xl p-5 flex justify-between items-start glass-hover">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-aurixa-500/20 shrink-0">
                    <IconCalendar />
                  </div>
                  <div>
                    <p className="font-medium text-white">{a.providerName}</p>
                    <p className="text-white/60 text-sm mt-1">{formatDate(a.startTime)}</p>
                    <p className="text-white/40 text-xs mt-0.5">Duration: ~1 hour</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-lg text-xs font-medium bg-aurixa-600/20 text-aurixa-400 shrink-0">
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        <h2 className="text-lg font-semibold text-white/80 mb-4">Past Appointments</h2>
        {past.length === 0 ? (
          <p className="text-white/50 text-sm">No past appointments on record.</p>
        ) : (
          <div className="space-y-3">
            {past.map((a) => (
              <div key={a.id} className="glass rounded-xl p-4 flex justify-between items-start opacity-80 glass-hover">
                <div>
                  <p className="font-medium text-white">{a.providerName}</p>
                  <p className="text-white/60 text-sm mt-1">{formatDate(a.startTime)}</p>
                </div>
                <span className="px-2 py-1 rounded-lg text-xs bg-white/10 text-white/70">
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
