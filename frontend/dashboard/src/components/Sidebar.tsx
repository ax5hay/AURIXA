"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "@aurixa/ui-kit";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { navigationForRole, navigationGroups } from "@/config/navigation";
import { useOperator } from "@/context/OperatorContext";

function NavIcon({ iconKey }: { iconKey: string }) {
  const paths: Record<string, string> = {
    home: "M4 13h6V4H4v9Zm0 7h6v-4H4v4Zm10 0h6v-9h-6v9Zm0-16v4h6V4h-6Z",
    pulse: "M3 12h4l2-6 4 12 2-6h6",
    audit: "M6 3h9l3 3v15H6V3Zm3 6h6M9 13h6M9 17h4",
    chart: "M5 20V10m7 10V4m7 16v-7",
    people:
      "M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m7-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.87",
    book: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5v13Z",
    test: "m9 3-1 4-4 10a3 3 0 0 0 3 4h10a3 3 0 0 0 3-4L16 7l-1-4M7 13h10",
    info: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-6v-5m0-3h.01",
    settings:
      "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7.4-3.5a7 7 0 0 0-.1-1l2-1.6-2-3.4-2.5 1a8 8 0 0 0-1.7-1L14.7 3h-4L10 6a8 8 0 0 0-1.7 1L5.8 6l-2 3.4 2 1.6a7 7 0 0 0 0 2l-2 1.6 2 3.4 2.5-1a8 8 0 0 0 1.7 1l.7 3h4l.7-3a8 8 0 0 0 1.7-1l2.5 1 2-3.4-2-1.6a7 7 0 0 0 .1-1Z",
    help: "M9.1 9a3 3 0 1 1 4.8 2.4c-1.2.9-1.9 1.3-1.9 2.6m0 4h.01M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z",
  };
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={paths[iconKey] ?? paths.info} />
    </svg>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { role } = useOperator();
  const [collapsed, setCollapsed] = useState(false);
  const items = navigationForRole(role);
  const mobile = items
    .filter((item) => item.mobilePriority)
    .sort((a, b) => (a.mobilePriority ?? 9) - (b.mobilePriority ?? 9))
    .slice(0, 4);
  const more = items.filter((item) => !mobile.includes(item));

  const active = (route: string) => (route === "/" ? pathname === "/" : pathname.startsWith(route));

  return (
    <>
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 border-r border-white/10 bg-[#081321] lg:flex lg:flex-col",
          collapsed ? "w-20" : "w-64",
        )}
      >
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-teal-300/30 text-sm font-bold text-teal-200">
            A
          </span>
          {!collapsed && (
            <div>
              <p className="text-sm font-semibold tracking-[0.13em]">AURIXA</p>
              <p className="text-[10px] text-white/40">Operator console</p>
            </div>
          )}
        </div>
        <nav aria-label="Primary navigation" className="flex-1 overflow-y-auto px-3 py-4">
          {navigationGroups.map((group) => {
            const groupItems = items.filter((item) => item.group === group);
            if (!groupItems.length) return null;
            return (
              <div key={group} className="mb-5">
                {!collapsed && (
                  <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/35">
                    {group}
                  </p>
                )}
                {groupItems.map((item) => (
                  <Link
                    key={item.route}
                    href={item.route}
                    title={collapsed ? item.label : item.description}
                    aria-current={active(item.route) ? "page" : undefined}
                    className={cn(
                      "my-0.5 flex min-h-11 items-center gap-3 rounded-md border-l-2 px-3 text-sm transition-colors",
                      active(item.route)
                        ? "border-teal-400 bg-white/[0.06] text-white"
                        : "border-transparent text-white/55 hover:bg-white/[0.04] hover:text-white",
                    )}
                  >
                    <NavIcon iconKey={item.iconKey} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                ))}
              </div>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-3">
          {!collapsed && (
            <p className="mb-2 px-3 text-xs text-white/40">Platform health: unknown</p>
          )}
          <button
            onClick={() => setCollapsed((value) => !value)}
            className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm text-white/50 hover:bg-white/[0.04]"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <span aria-hidden="true">{collapsed ? "›" : "‹"}</span>
            {!collapsed && "Collapse"}
          </button>
        </div>
      </aside>

      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-white/15 bg-[#081321] px-1 pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {mobile.map((item) => (
          <Link
            key={item.route}
            href={item.route}
            aria-current={active(item.route) ? "page" : undefined}
            className={cn(
              "flex min-h-16 flex-col items-center justify-center gap-1 text-[10px]",
              active(item.route) ? "text-teal-300" : "text-white/55",
            )}
          >
            <NavIcon iconKey={item.iconKey} />
            <span>{item.label}</span>
          </Link>
        ))}
        <Menu
          label="More navigation"
          trigger={
            <button
              type="button"
              className="flex min-h-16 flex-col items-center justify-center gap-1 text-[10px] text-white/55"
            >
              <span className="text-xl" aria-hidden="true">
                •••
              </span>
              <span>More</span>
            </button>
          }
          items={more.map((item) => ({ label: item.label, href: item.route }))}
        />
      </nav>
    </>
  );
}
