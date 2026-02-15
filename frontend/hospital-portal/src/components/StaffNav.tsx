"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const ICONS = {
  home: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  patients: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  calendar: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  schedule: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  chat: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  knowledge: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  status: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

const TABS = [
  { id: "dashboard", href: "/", label: "Dashboard", icon: "home" as const },
  { id: "patients", href: "/patients", label: "Patients", icon: "patients" as const },
  { id: "appointments", href: "/appointments", label: "Appointments", icon: "calendar" as const },
  { id: "schedule", href: "/schedule", label: "Schedule", icon: "schedule" as const },
  { id: "chat", href: "/chat", label: "AI Assistant", icon: "chat" as const },
  { id: "knowledge", href: "/knowledge", label: "Knowledge", icon: "knowledge" as const },
  { id: "status", href: "/status", label: "System Status", icon: "status" as const },
];

export function StaffNav() {
  const pathname = usePathname();
  const [role, setRole] = useState("reception");

  return (
    <header className="border-b border-white/5 py-6 mb-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-center text-gradient">AURIXA Hospital Portal</h1>
      <p className="text-center text-white/50 text-sm mt-2">Staff interface — patients, scheduling, AI assistant, and system status</p>
      <div className="flex justify-center gap-2 mt-4">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-surface-secondary/80 border border-white/10 text-white text-sm"
        >
          <option value="reception">Reception</option>
          <option value="nurse">Nurse</option>
          <option value="doctor">Doctor</option>
          <option value="scheduler">Appointment Scheduler</option>
          <option value="admin">Clinical Admin</option>
        </select>
      </div>
      <nav className="flex justify-center gap-2 mt-4 flex-wrap">
        {TABS.map((t) => {
          const isActive = pathname === t.href;
          const Icon = ICONS[t.icon];
          return (
            <Link
              key={t.id}
              href={t.href}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-hospital-600 text-white shadow-lg shadow-hospital-600/20"
                  : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon />
              {t.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
