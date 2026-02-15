"use client";

import { createContext, useContext, useState, useCallback, ReactNode, useMemo } from "react";

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
}

const StaffContext = createContext<StaffContextValue | null>(null);

const DEFAULT_VALUE: StaffContextValue = {
  staff: null,
  setStaff: () => {},
  tenantId: undefined,
  tenantFilter: "",
  setTenantFilter: () => {},
};

export function StaffProvider({ children }: { children: ReactNode }) {
  const [staff, setStaffState] = useState<Staff | null>(null);
  const [tenantFilter, setTenantFilter] = useState<string>("");

  const setStaff = useCallback((s: Staff | null) => {
    setStaffState(s);
    if (s != null && typeof s.tenantId === "number") {
      setTenantFilter(`t-${String(s.tenantId).padStart(3, "0")}`);
    } else {
      setTenantFilter("");
    }
  }, []);

  const tenantId = staff != null && typeof staff.tenantId === "number" ? staff.tenantId : undefined;
  const value: StaffContextValue = useMemo(() => ({
    staff,
    setStaff,
    tenantId,
    tenantFilter,
    setTenantFilter,
  }), [staff, tenantId, tenantFilter, setStaff]);

  return (
    <StaffContext.Provider value={value}>
      {children}
    </StaffContext.Provider>
  );
}

export function useStaffContext(): StaffContextValue {
  const ctx = useContext(StaffContext);
  return ctx ?? DEFAULT_VALUE;
}
