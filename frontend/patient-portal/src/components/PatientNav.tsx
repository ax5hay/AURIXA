"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert, Icon, PortalShell, type IconName } from "@aurixa/ui-kit";
import { isSectionActive } from "@/lib/patient-sections";

type NavigationTab = {
  id: string;
  href: string;
  label: string;
  icon: IconName;
  related?: string[];
};

const DESKTOP_TABS = [
  { id: "home", href: "/", label: "Home", icon: "home" },
  { id: "appointments", href: "/appointments", label: "Visits", icon: "calendar" },
  {
    id: "records",
    href: "/records",
    label: "Records",
    icon: "check",
    related: ["/results", "/documents"],
  },
  {
    id: "medications",
    href: "/medications",
    label: "Medicines",
    icon: "info",
    related: ["/refills"],
  },
  {
    id: "billing",
    href: "/billing",
    label: "Billing",
    icon: "info",
    related: ["/insurance"],
  },
  { id: "chat", href: "/chat", label: "Messages", icon: "message" },
] satisfies NavigationTab[];

const MOBILE_TABS = [
  { id: "home", href: "/", label: "Home", icon: "home" },
  { id: "appointments", href: "/appointments", label: "Visits", icon: "calendar" },
  {
    id: "records",
    href: "/records",
    label: "Records",
    icon: "check",
    related: ["/results", "/documents"],
  },
  { id: "chat", href: "/chat", label: "Messages", icon: "message" },
  {
    id: "account",
    href: "/account",
    label: "More",
    icon: "menu",
    related: [
      "/medications",
      "/refills",
      "/billing",
      "/insurance",
      "/notifications",
      "/help",
    ],
  },
] satisfies NavigationTab[];

function PatientNavigation({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  const tabs = mobile ? MOBILE_TABS : DESKTOP_TABS;

  return (
    <div
      className={mobile ? "grid grid-cols-5 px-1 pt-2" : "flex items-center justify-center gap-0.5"}
    >
      {tabs.map((tab) => {
        const active =
          tab.href === "/"
            ? pathname === "/"
            : isSectionActive(pathname, tab.href, "related" in tab ? tab.related : []);
        return (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={
              mobile
                ? `flex min-h-14 flex-col items-center justify-center gap-1 rounded-ui-md px-1 py-1.5 text-[11px] font-semibold ${
                    active ? "bg-ui-tint text-ui-accent" : "text-ui-muted"
                  }`
                : `inline-flex min-h-11 items-center gap-1.5 rounded-ui-md px-2.5 py-2 text-sm font-semibold transition-colors ${
                    active
                      ? "bg-ui-tint text-ui-accent"
                      : "text-ui-muted hover:bg-ui-surface-inset hover:text-ui-ink"
                  }`
            }
          >
            <Icon name={tab.icon} />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

function ConnectivityStatus() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  if (online) return null;
  return (
    <Alert title="You’re offline" tone="warning" className="mb-6">
      Information already on screen may be stale. Reconnect before sending a message or changing an
      appointment.
    </Alert>
  );
}

export function PatientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/auth/")) return <main id="main-content">{children}</main>;

  return (
    <PortalShell
      brand={
        <Link href="/" className="flex min-h-11 items-center gap-3 rounded-ui-md">
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-ui-border-strong bg-ui-tint font-display text-lg font-semibold text-ui-accent">
            A
          </span>
          <span>
            <span className="block text-sm font-semibold tracking-[0.08em]">AURIXA</span>
            <span className="block text-xs text-ui-muted">My care</span>
          </span>
        </Link>
      }
      navigation={<PatientNavigation />}
      bottomNavigation={<PatientNavigation mobile />}
      actions={
        <>
          <Link
            href="/notifications"
            aria-label="Notifications"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-ui-md text-ui-muted hover:bg-ui-surface-inset hover:text-ui-ink"
          >
            <Icon name="bell" />
          </Link>
          <Link
            href="/help"
            className="hidden min-h-11 items-center rounded-ui-md px-3 text-sm font-semibold text-ui-muted hover:bg-ui-surface-inset sm:inline-flex"
          >
            Help
          </Link>
          <Link
            href="/account"
            className="hidden min-h-11 items-center rounded-ui-md px-3 text-sm font-semibold text-ui-muted hover:bg-ui-surface-inset sm:inline-flex"
          >
            Account
          </Link>
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="min-h-11 rounded-ui-md border border-ui-border-strong px-3 text-sm font-semibold text-ui-ink hover:bg-ui-surface-inset"
            >
              Sign out
            </button>
          </form>
        </>
      }
      contentClassName="max-w-6xl"
    >
      <ConnectivityStatus />
      {children}
    </PortalShell>
  );
}
