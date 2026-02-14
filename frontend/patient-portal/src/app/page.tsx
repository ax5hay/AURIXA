"use client";

import { useState, useEffect } from "react";
import {
  getPatient,
  getAppointments,
  getKnowledgeArticles,
  sendMessage,
  type Patient,
  type Appointment,
  type KnowledgeArticle,
} from "./api";

const DEMO_PATIENT_ID = 1;

const SAMPLE_PROMPTS = [
  "When is my next appointment?",
  "How do I request a prescription refill?",
  "What are your billing options?",
  "I need help with lab results.",
];

type Tab = "dashboard" | "appointments" | "chat" | "help";

interface Message {
  id: number;
  text: string;
  sender: "user" | "bot";
}

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

function IconHelp() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function IconHome() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

export default function PatientPortalPage() {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "Hello! I'm your AURIXA assistant. Ask about appointments, billing, lab results, or any healthcare questions.",
      sender: "bot",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      getPatient(DEMO_PATIENT_ID).then(setPatient).catch(() => null),
      getAppointments(DEMO_PATIENT_ID).then(setAppointments).catch(() => []),
      getKnowledgeArticles(1).then(setArticles).catch(() => []),
    ]).finally(() => setLoading(false));
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMsg: Message = { id: Date.now(), text: inputText, sender: "user" };
    setMessages((prev) => [...prev, newMsg]);
    setInputText("");
    setChatLoading(true);

    try {
      const res = await sendMessage(inputText);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          text: res.final_response || "I couldn't process that. Please try again.",
          sender: "bot",
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          text: `Sorry: ${err instanceof Error ? err.message : "Connection error"}. Ensure the API gateway and backend are running.`,
          sender: "bot",
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  const upcomingAppointments = appointments
    .filter((a) => a.status === "confirmed" && new Date(a.startTime) > new Date())
    .slice(0, 5);

  const pastAppointments = appointments
    .filter((a) => a.status === "completed" || new Date(a.startTime) < new Date())
    .slice(0, 5);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "dashboard", label: "Dashboard", icon: <IconHome /> },
    { id: "appointments", label: "Appointments", icon: <IconCalendar /> },
    { id: "chat", label: "Chat", icon: <IconChat /> },
    { id: "help", label: "Help & FAQ", icon: <IconHelp /> },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background via-background to-surface-primary/80">
      <header className="border-b border-white/5 py-6 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-center text-gradient">AURIXA Patient Portal</h1>
        <p className="text-center text-white/50 text-sm mt-2">Your healthcare assistant — appointments, billing, and support</p>
        <nav className="flex justify-center gap-2 mt-5 flex-wrap">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === t.id
                  ? "bg-aurixa-600 text-white shadow-lg shadow-aurixa-600/20"
                  : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <div className="flex-1 max-w-5xl mx-auto w-full px-4 pb-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <span className="inline-flex gap-1 mb-4">
              <span className="h-3 w-3 bg-aurixa-400 rounded-full animate-pulse" />
              <span className="h-3 w-3 bg-aurixa-400 rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
              <span className="h-3 w-3 bg-aurixa-400 rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
            </span>
            <p className="text-white/50 text-sm">Loading your portal...</p>
          </div>
        ) : (
          <>
            {activeTab === "dashboard" && (
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

                <div className="flex justify-center">
                  <button
                    onClick={() => setActiveTab("chat")}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-aurixa-500 hover:bg-aurixa-600 text-white font-medium transition-colors"
                  >
                    <IconChat />
                    Ask the assistant
                  </button>
                </div>
              </div>
            )}

            {activeTab === "appointments" && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-lg font-semibold text-white/80 mb-4">Upcoming</h2>
                  {upcomingAppointments.length === 0 ? (
                    <div className="glass rounded-xl p-8 text-center">
                      <div className="inline-flex p-3 rounded-xl bg-aurixa-500/20 mb-3">
                        <IconCalendar />
                      </div>
                      <p className="text-white/50">No upcoming appointments.</p>
                      <p className="text-white/30 text-sm mt-1">Book one through our office or ask the assistant.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {upcomingAppointments.map((a) => (
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
                  {pastAppointments.length === 0 ? (
                    <p className="text-white/50 text-sm">No past appointments on record.</p>
                  ) : (
                    <div className="space-y-3">
                      {pastAppointments.map((a) => (
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
            )}

            {activeTab === "chat" && (
              <div className="glass rounded-xl flex flex-col min-h-[500px] overflow-hidden">
                <div className="px-4 py-3 border-b border-white/5 bg-surface-secondary/30">
                  <p className="text-white/60 text-sm">AI assistant — powered by your provider&apos;s knowledge base</p>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] px-4 py-2.5 rounded-2xl ${
                          msg.sender === "user"
                            ? "bg-aurixa-500 text-white"
                            : "bg-surface-secondary/80 text-white/90 border border-white/5"
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="px-4 py-2.5 rounded-2xl bg-surface-secondary/80 border border-white/5">
                        <span className="inline-flex gap-1">
                          <span className="h-2 w-2 bg-aurixa-400 rounded-full animate-pulse" />
                          <span className="h-2 w-2 bg-aurixa-400 rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
                          <span className="h-2 w-2 bg-aurixa-400 rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <form onSubmit={handleSendMessage} className="p-4 border-t border-white/5">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Ask about appointments, billing, prescriptions, or health..."
                      className="flex-grow bg-surface-secondary/60 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/40 focus:outline-none focus:border-aurixa-500/50"
                      disabled={chatLoading}
                    />
                    <button
                      type="submit"
                      disabled={chatLoading}
                      className="p-2.5 rounded-xl bg-aurixa-500 hover:bg-aurixa-600 text-white disabled:opacity-50 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M3.105 2.288a.75.75 0 0 1 1.054-.057l16.5 9a.75.75 0 0 1 0 1.338l-16.5 9a.75.75 0 0 1-1.106-.996l1.5-1.75a.75.75 0 0 1 1.053.058L13 10l-8.396-4.73 1.5-1.75Z" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {SAMPLE_PROMPTS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setInputText(s)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </form>
              </div>
            )}

            {activeTab === "help" && (
              <div className="space-y-6">
                <div className="glass rounded-2xl p-6 glow-sm">
                  <h2 className="text-lg font-semibold text-white mb-1">Help & FAQ</h2>
                  <p className="text-white/60 text-sm">Frequently asked questions and helpful information from your care provider.</p>
                </div>
                {articles.length === 0 ? (
                  <div className="glass rounded-xl p-12 text-center">
                    <p className="text-white/50">No help articles available.</p>
                    <p className="text-white/30 text-sm mt-2">Ask the AI assistant for general healthcare questions.</p>
                    <button
                      onClick={() => setActiveTab("chat")}
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-aurixa-500/80 hover:bg-aurixa-600 text-white text-sm font-medium"
                    >
                      <IconChat />
                      Open chat
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {articles.map((a) => (
                      <details
                        key={a.id}
                        className="group glass rounded-xl overflow-hidden glass-hover"
                      >
                        <summary className="cursor-pointer p-5 font-semibold text-white flex items-center justify-between list-none">
                          {a.title}
                          <span className="text-aurixa-400 group-open:rotate-180 transition-transform">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </span>
                        </summary>
                        <div className="px-5 pb-5 pt-0">
                          <p className="text-white/70 text-sm leading-relaxed">{a.content}</p>
                        </div>
                      </details>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
