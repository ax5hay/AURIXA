"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

function IconMic() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v7m0-4a3 3 0 01-3-3V8a3 3 0 013-3h6a3 3 0 013 3v4a3 3 0 01-3 3z" />
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

const TABS = [
  { id: "dashboard", href: "/", label: "Dashboard", icon: IconHome },
  { id: "appointments", href: "/appointments", label: "Appointments", icon: IconCalendar },
  { id: "chat", href: "/chat", label: "Chat", icon: IconChat },
  { id: "voice", href: "/voice", label: "Voice", icon: IconMic },
  { id: "help", href: "/help", label: "Help & FAQ", icon: IconHelp },
] as const;

export function PatientNav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-white/5 py-6 mb-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-center text-gradient">AURIXA Patient Portal</h1>
      <p className="text-center text-white/50 text-sm mt-2">Your healthcare assistant — appointments, billing, and support</p>
      <nav className="flex justify-center gap-2 mt-5 flex-wrap">
        {TABS.map((t) => {
          const isActive = pathname === t.href;
          return (
            <Link
              key={t.id}
              href={t.href}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-aurixa-600 text-white shadow-lg shadow-aurixa-600/20"
                  : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <t.icon />
              {t.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
