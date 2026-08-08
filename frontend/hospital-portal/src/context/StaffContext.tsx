"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useMemo,
  useEffect,
} from "react";

export interface Staff {
  id: number;
  fullName: string;
  email: string;
  role: string;
  tenantId: number;
}

interface StaffContextValue {
  staff: Staff | null;
  setStaff: (s: Staff | null) => void;
  tenantId: number | undefined;
  tenantFilter: string;
  setTenantFilter: (v: string) => void;
  roleCategory: StaffRoleCategory;
}

export type StaffRoleCategory = "clinical" | "coordination" | "operations" | "unassigned";

const STORAGE_KEY = "aurixa.hospital.staff-context";

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
  setStaff: () => {},
  tenantId: undefined,
  tenantFilter: "",
  setTenantFilter: () => {},
  roleCategory: "unassigned",
};

export function StaffProvider({ children }: { children: ReactNode }) {
  const [staff, setStaffState] = useState<Staff | null>(null);
  const [tenantFilter, setTenantFilter] = useState<string>("");
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as { staff?: Staff | null; tenantFilter?: string };
        setStaffState(parsed.staff ?? null);
        setTenantFilter(parsed.tenantFilter ?? "");
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setRestored(true);
    }
  }, []);

  useEffect(() => {
    if (!restored) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ staff, tenantFilter }));
  }, [restored, staff, tenantFilter]);

  const setStaff = useCallback((s: Staff | null) => {
    setStaffState(s);
    if (s != null && typeof s.tenantId === "number") {
      setTenantFilter(`t-${String(s.tenantId).padStart(3, "0")}`);
    } else {
      setTenantFilter("");
    }
  }, []);

  const tenantId = staff != null && typeof staff.tenantId === "number" ? staff.tenantId : undefined;
  const roleCategory = getRoleCategory(staff?.role);
  const value: StaffContextValue = useMemo(
    () => ({
      staff,
      setStaff,
      tenantId,
      tenantFilter,
      setTenantFilter,
      roleCategory,
    }),
    [staff, tenantId, tenantFilter, roleCategory, setStaff],
  );

  return <StaffContext.Provider value={value}>{children}</StaffContext.Provider>;
}

export function useStaffContext(): StaffContextValue {
  const ctx = useContext(StaffContext);
  return ctx ?? DEFAULT_VALUE;
}
