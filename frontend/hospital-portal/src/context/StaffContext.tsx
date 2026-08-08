"use client";

import {
  createContext,
  useContext,
  ReactNode,
  useMemo,
  useEffect,
  useState,
} from "react";
import { Alert, PageLoader } from "@aurixa/ui-kit";
import { usePathname } from "next/navigation";

export interface Staff {
  id: number;
  fullName: string;
  email: string;
  role: string;
  tenantId: number;
}

interface StaffContextValue {
  staff: Staff | null;
  tenantId: number | undefined;
  tenantFilter: string;
  roleCategory: StaffRoleCategory;
  demo: boolean;
}

export type StaffRoleCategory = "clinical" | "coordination" | "operations" | "unassigned";

export function getRoleCategory(role?: string): StaffRoleCategory {
  const normalized = role?.toLowerCase().trim() ?? "";
  if (["doctor", "physician", "nurse", "clinician"].some((term) => normalized.includes(term))) {
    return "clinical";
  }
  if (
    ["reception", "scheduler", "coordinator", "front desk"].some((term) =>
      normalized.includes(term),
    )
  ) {
    return "coordination";
  }
  if (["admin", "operator", "support"].some((term) => normalized.includes(term))) {
    return "operations";
  }
  return "unassigned";
}

const StaffContext = createContext<StaffContextValue | null>(null);

const DEFAULT_VALUE: StaffContextValue = {
  staff: null,
  tenantId: undefined,
  tenantFilter: "",
  roleCategory: "unassigned",
  demo: false,
};

export function StaffProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [staff, setStaff] = useState<Staff | null>(null);
  const [demo, setDemo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (pathname.startsWith("/auth/")) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setFailed(false);
    fetch("/api/auth/session", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Staff session unavailable");
        return response.json() as Promise<{
          session: Staff & { staffId: number; demo: boolean };
        }>;
      })
      .then(({ session }) => {
        setStaff({
          id: session.staffId,
          fullName: session.fullName,
          email: session.email,
          role: session.role,
          tenantId: session.tenantId,
        });
        setDemo(session.demo);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [pathname]);

  const tenantId = staff != null && typeof staff.tenantId === "number" ? staff.tenantId : undefined;
  const tenantFilter = tenantId ? String(tenantId) : "";
  const roleCategory = getRoleCategory(staff?.role);
  const value: StaffContextValue = useMemo(
    () => ({
      staff,
      tenantId,
      tenantFilter,
      roleCategory,
      demo,
    }),
    [staff, tenantId, tenantFilter, roleCategory, demo],
  );

  if (pathname.startsWith("/auth/")) return <>{children}</>;
  if (loading) return <PageLoader label="Verifying staff access" />;
  if (failed || !staff) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <Alert title="Staff access could not be verified" tone="danger">
          No clinical data is displayed. Sign in again or contact your administrator.
        </Alert>
      </div>
    );
  }
  return <StaffContext.Provider value={value}>{children}</StaffContext.Provider>;
}

export function useStaffContext(): StaffContextValue {
  const ctx = useContext(StaffContext);
  return ctx ?? DEFAULT_VALUE;
}
