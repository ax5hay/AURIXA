"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Avatar, Badge, Menu, Select } from "@aurixa/ui-kit";
import { getStaff, getTenants, type Staff } from "../app/api";
import { useStaffContext, type StaffRoleCategory } from "@/context/StaffContext";

const ICONS = {
  home: "⌂",
  patients: "◎",
  appointments: "▣",
  schedule: "+",
  chat: "✦",
  knowledge: "≡",
  status: "◇",
};

const TABS = [
  {
    id: "today",
    href: "/",
    label: "Today",
    icon: "home",
    roles: ["clinical", "coordination", "operations"],
  },
  {
    id: "patients",
    href: "/patients",
    label: "Patients",
    icon: "patients",
    roles: ["clinical", "coordination", "operations"],
  },
  {
    id: "appointments",
    href: "/appointments",
    label: "Appointments",
    icon: "appointments",
    roles: ["clinical", "coordination", "operations"],
  },
  {
    id: "schedule",
    href: "/schedule",
    label: "Schedule",
    icon: "schedule",
    roles: ["coordination", "clinical", "operations"],
  },
  {
    id: "chat",
    href: "/chat",
    label: "Assistant",
    icon: "chat",
    roles: ["clinical", "coordination", "operations"],
  },
  {
    id: "knowledge",
    href: "/knowledge",
    label: "Knowledge",
    icon: "knowledge",
    roles: ["clinical", "coordination", "operations"],
  },
  { id: "status", href: "/status", label: "Operations", icon: "status", roles: ["operations"] },
] as const;

function roleLabel(role: string) {
  return role.replace(/[-_]/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

export function StaffNav() {
  const pathname = usePathname();
  const { staff, setStaff, tenantFilter, setTenantFilter, roleCategory } = useStaffContext();
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [tenants, setTenants] = useState<{ id: string; name: string }[]>([]);
  const [staffError, setStaffError] = useState(false);

  useEffect(() => {
    getStaff()
      .then((list) => {
        setStaffList(list);
        setStaffError(false);
      })
      .catch(() => {
        setStaffList([]);
        setStaffError(true);
      });
    getTenants()
      .then(setTenants)
      .catch(() => setTenants([]));
  }, []);

  const rankedTabs = useMemo(() => {
    const category: StaffRoleCategory =
      roleCategory === "unassigned" ? "coordination" : roleCategory;
    return [...TABS].sort((a, b) => {
      const aRank = a.roles.indexOf(category as never);
      const bRank = b.roles.indexOf(category as never);
      return (aRank < 0 ? 99 : aRank) - (bRank < 0 ? 99 : bRank);
    });
  }, [roleCategory]);

  const primaryMobile = rankedTabs.filter((tab) => tab.id !== "status").slice(0, 4);
  const primaryMobileIds = new Set<string>(primaryMobile.map((tab) => tab.id));
  const moreMobile = rankedTabs.filter((tab) => !primaryMobileIds.has(tab.id));

  return (
    <>
      <header className="relative z-40 mb-7 pt-4 sm:pt-5">
        <div className="rounded-ui-lg border border-ui-border bg-ui-surface shadow-ui-soft">
          <div className="flex min-h-16 items-center gap-4 px-3 sm:px-4">
            <Link href="/" className="flex min-h-11 items-center gap-3 rounded-ui-md px-1">
              <span className="flex h-10 w-10 items-center justify-center rounded-ui-md border border-ui-border-strong bg-ui-tint text-sm font-bold text-ui-accent">
                A
              </span>
              <span className="hidden sm:block">
                <span className="block text-sm font-bold tracking-[0.12em] text-ui-ink">
                  AURIXA
                </span>
                <span className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-ui-muted">
                  Clinical workspace
                </span>
              </span>
            </Link>

            <nav
              aria-label="Staff navigation"
              className="ml-auto hidden items-center gap-0.5 xl:flex"
            >
              {rankedTabs.map((tab) => {
                const active = pathname === tab.href;
                return (
                  <Link
                    key={tab.id}
                    href={tab.href}
                    aria-current={active ? "page" : undefined}
                    className={`inline-flex min-h-11 items-center gap-2 rounded-ui-md px-3 text-sm font-semibold ${
                      active
                        ? "bg-ui-tint text-ui-accent"
                        : "text-ui-muted hover:bg-ui-surface-inset hover:text-ui-ink"
                    }`}
                  >
                    <span aria-hidden="true">{ICONS[tab.icon]}</span>
                    {tab.label}
                  </Link>
                );
              })}
            </nav>

            <div className="ml-auto flex items-center gap-2 xl:ml-2">
              {staff ? (
                <>
                  <Avatar name={staff.fullName} size="sm" />
                  <div className="hidden min-w-0 sm:block">
                    <p className="max-w-36 truncate text-xs font-semibold text-ui-ink">
                      {staff.fullName}
                    </p>
                    <p className="text-[11px] text-ui-muted">{roleLabel(staff.role)}</p>
                  </div>
                </>
              ) : (
                <Badge tone="warning">Select staff</Badge>
              )}
            </div>
          </div>

          <div className="grid gap-3 border-t border-ui-border bg-ui-canvas-subtle/40 p-3 sm:grid-cols-2 sm:p-4">
            <label className="text-xs font-semibold text-ui-muted">
              Acting staff member
              <Select
                className="mt-1.5"
                value={staff ? String(staff.id) : ""}
                onChange={(event) => {
                  const selected = staffList.find((item) => String(item.id) === event.target.value);
                  setStaff(selected ?? null);
                }}
              >
                <option value="">Select staff member</option>
                {staffList.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.fullName} · {roleLabel(item.role)}
                  </option>
                ))}
              </Select>
            </label>
            <label className="text-xs font-semibold text-ui-muted">
              Organization context
              <Select
                className="mt-1.5"
                value={tenantFilter}
                onChange={(event) => setTenantFilter(event.target.value)}
              >
                <option value="">All organizations</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </Select>
            </label>
          </div>
          {staffError && (
            <p
              role="status"
              className="border-t border-ui-border px-4 py-2 text-xs text-ui-warning"
            >
              Staff directory unavailable. Existing context is retained; check the API connection.
            </p>
          )}
        </div>
      </header>

      <nav
        aria-label="Staff mobile navigation"
        className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-5 gap-1 rounded-ui-lg border border-ui-border-strong bg-ui-surface p-1.5 shadow-ui xl:hidden"
      >
        {primaryMobile.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-ui-sm px-1 text-[10px] font-semibold ${
                active ? "bg-ui-tint text-ui-accent" : "text-ui-muted"
              }`}
            >
              <span aria-hidden="true" className="text-base leading-none">
                {ICONS[tab.icon]}
              </span>
              {tab.label}
            </Link>
          );
        })}
        <Menu
          label="More navigation"
          trigger={
            <button
              type="button"
              className="flex min-h-12 w-full flex-col items-center justify-center gap-0.5 rounded-ui-sm px-1 text-[10px] font-semibold text-ui-muted"
            >
              <span aria-hidden="true" className="text-base leading-none">
                •••
              </span>
              More
            </button>
          }
          items={moreMobile.map((tab) => ({ label: tab.label, href: tab.href }))}
        />
      </nav>
    </>
  );
}
