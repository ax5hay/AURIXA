"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert, Icon, PortalShell, RealEstateBrandMark, type IconName } from "@aurixa/ui-kit";
import { isSectionActive } from "@/lib/client-sections";

type NavigationTab = {
  id: string;
  href: string;
  label: string;
  icon: IconName;
  related?: string[];
};

const DESKTOP_TABS = [
  { id: "home", href: "/", label: "Home", icon: "home" },
  { id: "showings", href: "/showings", label: "Showings", icon: "calendar" },
  { id: "listings", href: "/listings", label: "Listings", icon: "building" },
  {
    id: "documents",
    href: "/documents",
    label: "Documents",
    icon: "listing",
    related: ["/applications"],
  },
  {
    id: "financing",
    href: "/financing",
    label: "Financing",
    icon: "key",
    related: ["/maintenance"],
  },
  { id: "chat", href: "/chat", label: "Messages", icon: "message" },
] satisfies NavigationTab[];

const MOBILE_TABS = [
  { id: "home", href: "/", label: "Home", icon: "home" },
  { id: "showings", href: "/showings", label: "Showings", icon: "calendar" },
  { id: "listings", href: "/listings", label: "Listings", icon: "building" },
  { id: "chat", href: "/chat", label: "Messages", icon: "message" },
  {
    id: "account",
    href: "/account",
    label: "More",
    icon: "menu",
    related: ["/documents", "/applications", "/financing", "/maintenance", "/notifications", "/help"],
  },
] satisfies NavigationTab[];

function ClientNavigation({ mobile = false }: { mobile?: boolean }) {
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
      Information already on screen may be stale. Reconnect before sending a message or changing a
      showing.
    </Alert>
  );
}

export function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/auth/")) return <main id="main-content">{children}</main>;

  return (
    <PortalShell
      brand={
        <Link href="/" className="flex min-h-11 items-center gap-3 rounded-ui-md">
          <RealEstateBrandMark monogram="A" size="md" />
          <span>
            <span className="block font-display text-sm font-semibold tracking-[0.08em]">AURIXA</span>
            <span className="block text-xs text-ui-muted">My properties</span>
          </span>
        </Link>
      }
      navigation={<ClientNavigation />}
      bottomNavigation={<ClientNavigation mobile />}
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

/** @deprecated Use ClientShell */
export const PatientShell = ClientShell;
