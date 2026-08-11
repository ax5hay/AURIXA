"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Avatar,
  Badge,
  Button,
  Icon,
  type IconName,
  PortalShell,
} from "@aurixa/ui-kit";
import { useStaffContext, type AgentRoleCategory } from "@/context/StaffContext";
import { CommandPalette } from "./CommandPalette";

const TABS: {
  id: string;
  href: string;
  label: string;
  icon: IconName;
  roles: AgentRoleCategory[];
}[] = [
  { id: "today", href: "/", label: "Today", icon: "home", roles: ["agent", "coordination", "operations"] },
  { id: "clients", href: "/clients", label: "Clients", icon: "user", roles: ["agent", "coordination", "operations"] },
  { id: "showings", href: "/showings", label: "Showings", icon: "calendar", roles: ["agent", "coordination", "operations"] },
  { id: "leads", href: "/leads", label: "Leads", icon: "check", roles: ["agent", "coordination"] },
  { id: "schedule", href: "/schedule", label: "Schedule", icon: "clock", roles: ["agent", "coordination"] },
  { id: "chat", href: "/chat", label: "Assistant", icon: "message", roles: ["agent", "coordination"] },
  { id: "knowledge", href: "/knowledge", label: "Knowledge", icon: "search", roles: ["agent", "coordination", "operations"] },
  { id: "status", href: "/status", label: "Operations", icon: "settings", roles: ["operations"] },
];

function roleLabel(role: string) {
  return role.replace(/[-_]/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function NavLink({ tab, compact = false }: { tab: (typeof TABS)[number]; compact?: boolean }) {
  const pathname = usePathname();
  const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
  return (
    <Link
      href={tab.href}
      aria-current={active ? "page" : undefined}
      className={`${compact ? "flex min-h-16 flex-col justify-center gap-1 px-2 text-[10px]" : "inline-flex min-h-11 items-center gap-2 rounded-ui-md px-3 text-sm"} font-semibold ${
        active ? "bg-ui-tint text-ui-accent" : "text-ui-muted hover:bg-ui-surface-inset hover:text-ui-ink"
      }`}
    >
      <Icon name={tab.icon} size={compact ? "md" : "sm"} />
      {tab.label}
    </Link>
  );
}

export function AgentNav({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { staff, roleCategory, tenantId, demo } = useStaffContext();
  if (pathname.startsWith("/auth/")) return <>{children}</>;
  const tabs = TABS.filter((tab) => tab.roles.includes(roleCategory));
  const mobileTabs = tabs.slice(0, 5);

  return (
    <PortalShell
      density="compact"
      brand={
        <Link href="/" className="flex min-h-11 items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-ui-md bg-ui-accent font-bold text-ui-accent-ink">
            A
          </span>
          <span>
            <span className="block text-sm font-bold tracking-[0.12em]">AURIXA</span>
            <span className="block text-[10px] font-semibold uppercase tracking-wide text-ui-muted">
              Agent workspace
            </span>
          </span>
        </Link>
      }
      navigation={
        <div className="flex items-center justify-center gap-1">
          {tabs.map((tab) => (
            <NavLink key={tab.id} tab={tab} />
          ))}
        </div>
      }
      actions={
        <>
          <CommandPalette navigation={tabs} />
          <div className="hidden items-center gap-2 sm:flex">
            <Avatar name={staff?.fullName ?? "Agent"} size="sm" />
            <div>
              <p className="max-w-36 truncate text-xs font-semibold">{staff?.fullName}</p>
              <p className="text-[11px] text-ui-muted">{roleLabel(staff?.role ?? "")}</p>
            </div>
          </div>
          <form action="/api/auth/logout" method="post">
            <Button type="submit" variant="quiet" size="sm">
              Sign out
            </Button>
          </form>
        </>
      }
      context={
        <div className="mx-auto flex max-w-[var(--ui-shell-content)] items-center justify-between gap-3 px-ui-gutter py-2 text-xs">
          <span className="font-semibold text-ui-muted">
            Organization #{tenantId} · verified session scope
          </span>
          {demo && <Badge tone="warning">Demo access</Badge>}
        </div>
      }
      bottomNavigation={
        <div className="grid" style={{ gridTemplateColumns: `repeat(${mobileTabs.length}, minmax(0, 1fr))` }}>
          {mobileTabs.map((tab) => (
            <NavLink key={tab.id} tab={tab} compact />
          ))}
        </div>
      }
    >
      {children}
    </PortalShell>
  );
}

/** @deprecated Use AgentNav */
export const StaffNav = AgentNav;
