"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  getPatient,
  getAppointments,
  getKnowledgeArticles,
  getConversations,
  type Patient,
  type Appointment,
  type KnowledgeArticle,
  type ConversationSummary,
} from "./api";

const DEMO_PATIENT_ID = 1;

function IconCalendar() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function IconChat() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
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

export default function DashboardPage() {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getPatient(DEMO_PATIENT_ID).then(setPatient).catch(() => null),
      getAppointments(DEMO_PATIENT_ID).then(setAppointments).catch(() => []),
      getKnowledgeArticles(1).then(setArticles).catch(() => []),
      getConversations(DEMO_PATIENT_ID).then(setConversations).catch(() => []),
    ]).finally(() => setLoading(false));
  }, []);

  const upcomingAppointments = appointments
    .filter((a) => a.status === "confirmed" && new Date(a.startTime) > new Date())
    .slice(0, 5);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <span className="inline-flex gap-1 mb-4">
          <span className="h-3 w-3 bg-aurixa-400 rounded-full animate-pulse" />
          <span className="h-3 w-3 bg-aurixa-400 rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
          <span className="h-3 w-3 bg-aurixa-400 rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
        </span>
        <p className="text-white/50 text-sm">Loading your portal...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background via-background to-surface-primary/80 -mt-6">
      <div className="space-y-6">
        <div className="glass rounded-2xl p-6 glow-sm">
          <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-1">
            Welcome back{patient?.fullName ? `, ${patient.fullName.split(" ")[0] || patient.fullName}` : ""}
          </h2>
          <p className="text-white/60 text-sm">Here&apos;s your care overview</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass rounded-xl p-6 glass-hover">
            <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">My Profile</h2>
            {patient ? (
              <div className="space-y-3">
                <p className="text-white font-medium text-lg">{patient.fullName}</p>
                {patient.email && (
                  <p className="text-white/60 text-sm flex items-center gap-2">
                    <span className="text-aurixa-400">Email</span> {patient.email}
                  </p>
                )}
                {patient.phoneNumber && (
                  <p className="text-white/60 text-sm flex items-center gap-2">
                    <span className="text-aurixa-400">Phone</span> {patient.phoneNumber}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-white/50 text-sm">Could not load profile.</p>
            )}
          </div>

          <div className="glass rounded-xl p-6">
            <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">Quick Stats</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-surface-secondary/40 rounded-xl p-4 border border-white/5">
                <p className="text-3xl font-bold text-aurixa-400">{upcomingAppointments.length}</p>
                <p className="text-white/50 text-xs mt-1">Upcoming appointments</p>
              </div>
              <div className="bg-surface-secondary/40 rounded-xl p-4 border border-white/5">
                <p className="text-3xl font-bold text-white/70">{articles.length}</p>
                <p className="text-white/50 text-xs mt-1">Help articles</p>
              </div>
            </div>
          </div>
        </div>

        <div className="glass rounded-xl p-6">
          <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">Upcoming Appointments</h2>
          {upcomingAppointments.length === 0 ? (
            <div className="text-center py-8 rounded-xl bg-surface-secondary/30 border border-dashed border-white/10">
              <p className="text-white/50 text-sm">No upcoming appointments.</p>
              <p className="text-white/30 text-xs mt-1">Book one through our office or ask the assistant.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingAppointments.map((a) => (
                <div key={a.id} className="flex justify-between items-center border border-white/5 rounded-xl p-4 bg-surface-secondary/40 glass-hover">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-aurixa-500/20">
                      <IconCalendar />
                    </div>
                    <div>
                      <p className="text-white font-medium">{a.providerName}</p>
                      <p className="text-white/50 text-sm">{formatDate(a.startTime)}</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-aurixa-600/20 text-aurixa-400 capitalize">
                    {a.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {conversations.length > 0 && (
          <div className="glass rounded-xl p-6">
            <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">Recent conversations</h2>
            <p className="text-white/50 text-xs mb-3">Calls and chat — synced to your profile</p>
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {conversations.slice(0, 5).map((c) => (
                <div key={c.id} className="border border-white/5 rounded-xl p-3 bg-surface-secondary/40 text-sm">
                  <p className="text-white/90 font-medium truncate">{c.prompt || "—"}</p>
                  <p className="text-white/60 text-xs mt-1 line-clamp-2">{c.response || "—"}</p>
                  {c.createdAt && (
                    <p className="text-white/40 text-xs mt-1">
                      {new Date(c.createdAt).toLocaleString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-center pb-8">
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-aurixa-500 hover:bg-aurixa-600 text-white font-medium transition-colors"
          >
            <IconChat />
            Ask the assistant
          </Link>
        </div>
      </div>
    </div>
  );
}
