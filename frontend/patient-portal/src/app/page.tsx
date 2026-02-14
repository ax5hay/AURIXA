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

type Tab = "dashboard" | "appointments" | "chat" | "help";

interface Message {
  id: number;
  text: string;
  sender: "user" | "bot";
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

  const tabs: { id: Tab; label: string }[] = [
    { id: "dashboard", label: "Dashboard" },
    { id: "appointments", label: "Appointments" },
    { id: "chat", label: "Chat" },
    { id: "help", label: "Help & FAQ" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-white/5 py-4 mb-4">
        <h1 className="text-2xl font-bold text-center text-gradient">AURIXA Patient Portal</h1>
        <p className="text-center text-white/50 text-sm mt-1">Your healthcare assistant</p>
        <nav className="flex justify-center gap-2 mt-4 flex-wrap">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === t.id ? "bg-aurixa-600 text-white" : "bg-white/5 text-white/70 hover:bg-white/10"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <div className="flex-1 max-w-5xl mx-auto w-full px-4 pb-8">
        {loading ? (
          <div className="text-center text-white/50 py-12">Loading...</div>
        ) : (
          <>
            {activeTab === "dashboard" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass rounded-xl p-6">
                  <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">My Profile</h2>
                  {patient ? (
                    <div className="space-y-2">
                      <p className="text-white font-medium">{patient.fullName}</p>
                      {patient.email && <p className="text-white/60 text-sm">{patient.email}</p>}
                      {patient.phoneNumber && <p className="text-white/60 text-sm">{patient.phoneNumber}</p>}
                    </div>
                  ) : (
                    <p className="text-white/50 text-sm">Could not load profile.</p>
                  )}
                </div>

                <div className="glass rounded-xl p-6">
                  <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">Quick Stats</h2>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-surface-secondary/40 rounded-lg p-3">
                      <p className="text-2xl font-bold text-aurixa-400">{upcomingAppointments.length}</p>
                      <p className="text-white/50 text-xs">Upcoming</p>
                    </div>
                    <div className="bg-surface-secondary/40 rounded-lg p-3">
                      <p className="text-2xl font-bold text-white/70">{articles.length}</p>
                      <p className="text-white/50 text-xs">Help Articles</p>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2 glass rounded-xl p-6">
                  <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">Upcoming Appointments</h2>
                  {upcomingAppointments.length === 0 ? (
                    <p className="text-white/50 text-sm">No upcoming appointments.</p>
                  ) : (
                    <div className="space-y-3">
                      {upcomingAppointments.map((a) => (
                        <div key={a.id} className="flex justify-between items-center border border-white/5 rounded-lg p-3 bg-surface-secondary/40">
                          <div>
                            <p className="text-white font-medium">{a.providerName}</p>
                            <p className="text-white/50 text-xs">{formatDate(a.startTime)}</p>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-xs bg-aurixa-600/20 text-aurixa-400 capitalize">
                            {a.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "appointments" && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-lg font-semibold text-white/80 mb-4">Upcoming</h2>
                  {upcomingAppointments.length === 0 ? (
                    <p className="text-white/50">No upcoming appointments.</p>
                  ) : (
                    <div className="space-y-3">
                      {upcomingAppointments.map((a) => (
                        <div key={a.id} className="glass rounded-xl p-4 flex justify-between items-start">
                          <div>
                            <p className="font-medium text-white">{a.providerName}</p>
                            <p className="text-white/60 text-sm mt-1">{formatDate(a.startTime)}</p>
                            <p className="text-white/40 text-xs mt-0.5">Duration: ~1 hour</p>
                          </div>
                          <span className="px-2 py-1 rounded-lg text-xs font-medium bg-aurixa-600/20 text-aurixa-400">
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
                    <p className="text-white/50">No past appointments.</p>
                  ) : (
                    <div className="space-y-3">
                      {pastAppointments.map((a) => (
                        <div key={a.id} className="glass rounded-xl p-4 flex justify-between items-start opacity-80">
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
              <div className="glass rounded-xl flex flex-col min-h-[450px]">
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
                      placeholder="Ask about appointments, billing, or health..."
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
                </form>
              </div>
            )}

            {activeTab === "help" && (
              <div className="space-y-6">
                <p className="text-white/60 text-sm">Frequently asked questions and helpful information from your care provider.</p>
                {articles.length === 0 ? (
                  <p className="text-white/50">No help articles available.</p>
                ) : (
                  <div className="space-y-4">
                    {articles.map((a) => (
                      <div key={a.id} className="glass rounded-xl p-6 glass-hover">
                        <h3 className="font-semibold text-white mb-2">{a.title}</h3>
                        <p className="text-white/70 text-sm leading-relaxed">{a.content}</p>
                      </div>
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
