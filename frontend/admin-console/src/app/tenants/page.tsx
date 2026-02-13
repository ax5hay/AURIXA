"use client";

import { motion } from "framer-motion";
import clsx from "clsx";

interface Tenant {
  id: string;
  name: string;
  plan: "starter" | "professional" | "enterprise";
  status: "active" | "suspended" | "pending";
  apiKeys: number;
  created: string;
}

const mockTenants: Tenant[] = [
  { id: "t-001", name: "Meridian Capital", plan: "enterprise", status: "active", apiKeys: 5, created: "2025-08-14" },
  { id: "t-002", name: "Atlas Investments", plan: "professional", status: "active", apiKeys: 3, created: "2025-09-22" },
  { id: "t-003", name: "Pinnacle Fund", plan: "enterprise", status: "active", apiKeys: 8, created: "2025-07-03" },
  { id: "t-004", name: "Vertex Analytics", plan: "starter", status: "active", apiKeys: 1, created: "2025-11-18" },
  { id: "t-005", name: "Harbor Wealth", plan: "professional", status: "suspended", apiKeys: 2, created: "2025-10-01" },
  { id: "t-006", name: "Summit Partners", plan: "enterprise", status: "active", apiKeys: 6, created: "2025-06-15" },
  { id: "t-007", name: "BluePeak Capital", plan: "starter", status: "pending", apiKeys: 0, created: "2026-01-28" },
  { id: "t-008", name: "Ironwood Finance", plan: "professional", status: "active", apiKeys: 3, created: "2025-12-05" },
];

const planColors: Record<string, string> = {
  starter: "bg-white/10 text-white/60",
  professional: "bg-aurixa-600/15 text-aurixa-400",
  enterprise: "bg-accent-warning/15 text-accent-warning",
};

const statusColors: Record<string, string> = {
  active: "text-accent-success",
  suspended: "text-accent-error",
  pending: "text-accent-warning",
};

const statusDotColors: Record<string, string> = {
  active: "bg-accent-success",
  suspended: "bg-accent-error",
  pending: "bg-accent-warning",
};

export default function TenantsPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tenant Management</h1>
          <p className="text-sm text-white/40 mt-1">
            Manage organizations and their access
          </p>
        </div>
        <button className="px-4 py-2 bg-aurixa-600 hover:bg-aurixa-700 text-white text-sm font-medium rounded-lg transition-colors">
          + Add Tenant
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-surface-secondary border border-white/5 rounded-xl overflow-hidden"
      >
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left px-5 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider">
                Name
              </th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider">
                Plan
              </th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider">
                Status
              </th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider">
                API Keys
              </th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider">
                Created
              </th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {mockTenants.map((tenant, i) => (
              <motion.tr
                key={tenant.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="hover:bg-white/[0.02] transition-colors"
              >
                <td className="px-5 py-4">
                  <div>
                    <p className="text-sm font-medium text-white/90">
                      {tenant.name}
                    </p>
                    <p className="text-xs text-white/30 font-mono">
                      {tenant.id}
                    </p>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span
                    className={clsx(
                      "text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize",
                      planColors[tenant.plan]
                    )}
                  >
                    {tenant.plan}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <div
                      className={clsx(
                        "w-1.5 h-1.5 rounded-full",
                        statusDotColors[tenant.status]
                      )}
                    />
                    <span
                      className={clsx(
                        "text-sm capitalize",
                        statusColors[tenant.status]
                      )}
                    >
                      {tenant.status}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-4 text-sm text-white/60 font-mono">
                  {tenant.apiKeys}
                </td>
                <td className="px-5 py-4 text-sm text-white/40">
                  {tenant.created}
                </td>
                <td className="px-5 py-4 text-right">
                  <button className="text-xs text-aurixa-400 hover:text-aurixa-300 transition-colors font-medium">
                    Manage
                  </button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </div>
  );
}
