"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { OperatorRole } from "@/config/navigation";

type OperatorContextValue = {
  role: OperatorRole;
  setRole: (role: OperatorRole) => void;
  environment: string;
  tenantScope: string;
};

const OperatorContext = createContext<OperatorContextValue | null>(null);

export function OperatorProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<OperatorRole>("operator");
  const value = useMemo(
    () => ({
      role,
      setRole,
      environment: process.env.NODE_ENV === "production" ? "Production" : "Development",
      tenantScope: "All organizations",
    }),
    [role],
  );

  return <OperatorContext.Provider value={value}>{children}</OperatorContext.Provider>;
}

export function useOperator() {
  const value = useContext(OperatorContext);
  if (!value) throw new Error("useOperator must be used within OperatorProvider");
  return value;
}
