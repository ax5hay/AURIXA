"use client";

import { Badge, Menu } from "@aurixa/ui-kit";
import { useRouter } from "next/navigation";
import { useOperator } from "@/context/OperatorContext";
import type { OperatorRole } from "@/config/navigation";

const roles: OperatorRole[] = ["operator", "support", "analyst", "administrator"];

export default function ContextBar() {
  const router = useRouter();
  const { role, setRole, environment, tenantScope } = useOperator();

  return (
    <div className="context-bar">
      <div className="flex min-w-0 items-center gap-2">
        <Menu
          label="Choose demo view"
          trigger={
            <button className="context-control" type="button">
              View: <strong className="capitalize">{role}</strong>
              <span aria-hidden="true">⌄</span>
            </button>
          }
          items={roles.map((item) => ({
            label: item[0].toUpperCase() + item.slice(1),
            onSelect: () => setRole(item),
          }))}
        />
        <span className="hidden text-ui-faint sm:inline">UI preview only — not access control</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="hidden text-ui-muted md:inline">{tenantScope}</span>
        <Badge tone={environment === "Production" ? "warning" : "info"}>{environment}</Badge>
        <Badge tone="neutral">Health not checked</Badge>
        <Menu
          label="Quick actions"
          trigger={
            <button type="button" className="context-control" aria-label="Open quick actions">
              Quick actions
            </button>
          }
          items={[
            { label: "Open service health", onSelect: () => router.push("/services") },
            { label: "Review audit events", onSelect: () => router.push("/audit") },
            { label: "Open command menu", shortcut: "⌘K", disabled: true },
          ]}
        />
      </div>
    </div>
  );
}
