"use client";

import { useState, useEffect } from "react";
import { getPatients, executeAction } from "../api";
import type { Patient } from "../api";

export default function SchedulePage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState("");
  const [date, setDate] = useState(() => new Date(Date.now() + 864e5).toISOString().slice(0, 10));
  const [provider, setProvider] = useState("Dr. Adams");
  const [reason, setReason] = useState("General visit");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    getPatients().then(setPatients).catch(() => []);
  }, []);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) {
      setResult("Please select a patient.");
      return;
    }
    setSubmitting(true);
    setResult(null);
    try {
      const res = await executeAction("create_appointment", {
        patient_id: parseInt(patientId, 10),
        reason,
        date,
        provider_name: provider,
        start_time: "09:00",
      });
      setResult(res.result?.message ?? "Appointment booked.");
    } catch (err) {
      setResult("Error: " + (err instanceof Error ? err.message : "Failed to book"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 -mt-6 pb-8 max-w-xl">
      <div className="glass rounded-2xl p-6 glow-sm">
        <h2 className="text-lg font-semibold text-white mb-1">Book Appointment</h2>
        <p className="text-white/60 text-sm">Schedule a new appointment via the execution engine.</p>
      </div>
      <form onSubmit={handleBook} className="glass rounded-xl p-6 space-y-4">
        <div>
          <label className="block text-xs text-white/50 mb-1.5">Patient</label>
          <select value={patientId} onChange={(e) => setPatientId(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl bg-surface-secondary/80 border border-white/10 text-white">
            <option value="">Select patient</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>{p.fullName}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-white/50 mb-1.5">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-surface-secondary/80 border border-white/10 text-white" />
        </div>
        <div>
          <label className="block text-xs text-white/50 mb-1.5">Provider</label>
          <input type="text" value={provider} onChange={(e) => setProvider(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-surface-secondary/80 border border-white/10 text-white" />
        </div>
        <div>
          <label className="block text-xs text-white/50 mb-1.5">Reason</label>
          <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-surface-secondary/80 border border-white/10 text-white" />
        </div>
        <button type="submit" disabled={submitting} className="w-full py-3 rounded-xl bg-hospital-500 hover:bg-hospital-600 text-white font-medium disabled:opacity-50">
          {submitting ? "Booking..." : "Book Appointment"}
        </button>
        {result && (
          <div className="p-3 rounded-xl bg-surface-secondary/80 border border-white/10 text-white/80 text-sm">{result}</div>
        )}
      </form>
    </div>
  );
}
