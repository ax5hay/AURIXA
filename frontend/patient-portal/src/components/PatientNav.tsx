"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function IconCalendar() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

function IconChat() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  );
}

function IconHelp() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function IconMic() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v7m0-4a3 3 0 01-3-3V8a3 3 0 013-3h6a3 3 0 013 3v4a3 3 0 01-3 3z"
      />
    </svg>
  );
}

function IconHome() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
      />
    </svg>
  );
}

const TABS = [
  { id: "home", href: "/", label: "Home", icon: IconHome },
  { id: "appointments", href: "/appointments", label: "Visits", icon: IconCalendar },
  { id: "chat", href: "/chat", label: "Messages", icon: IconChat },
  { id: "voice", href: "/voice", label: "Speak", icon: IconMic },
  { id: "help", href: "/help", label: "Help", icon: IconHelp },
] as const;

export function PatientNav() {
  const pathname = usePathname();

  return (
    <>
      <header className="relative z-40 border-b border-ui-border bg-ui-surface">
        <div className="mx-auto flex min-h-[72px] w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" className="flex min-h-11 items-center gap-3 rounded-ui-md">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-ui-border-strong bg-ui-tint">
              <span className="font-display text-lg font-semibold text-ui-accent">A</span>
            </span>
            <span className="hidden sm:block">
              <span className="block text-sm font-semibold tracking-[0.08em] text-ui-ink">
                AURIXA
              </span>
              <span className="mt-0.5 block text-xs text-ui-muted">My care</span>
            </span>
          </Link>

          <nav aria-label="Patient navigation" className="hidden items-center gap-1 lg:flex">
            {TABS.map((t) => {
              const isActive = pathname === t.href;
              return (
                <Link
                  key={t.id}
                  href={t.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-ui-md px-3.5 py-2 text-sm font-semibold transition-colors ${
                    isActive
                      ? "bg-ui-tint text-ui-accent"
                      : "text-ui-muted hover:bg-ui-surface-inset hover:text-ui-ink"
                  }`}
                >
                  <t.icon />
                  {t.label}
                </Link>
              );
            })}
          </nav>

          <Link href="/help" className="button-primary px-4">
            <IconChat />
            <span>Get support</span>
          </Link>
        </div>
      </header>

      <nav
        aria-label="Patient mobile navigation"
        className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-ui-border-strong bg-ui-surface px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-ui lg:hidden"
      >
        {TABS.map((t) => {
          const isActive = pathname === t.href;
          return (
            <Link
              key={t.id}
              href={t.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-ui-md px-1 py-1.5 text-[11px] font-semibold transition-colors ${
                isActive
                  ? "bg-ui-tint text-ui-accent"
                  : "text-ui-muted hover:bg-ui-surface-inset hover:text-ui-ink"
              }`}
            >
              <t.icon />
              <span className="max-w-full truncate">{t.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
