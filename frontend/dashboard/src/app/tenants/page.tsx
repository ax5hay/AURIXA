"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";
import { getTenants, type Tenant } from "@/app/services/api";

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
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTenants()
      .then(setTenants)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  if (error) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Tenant Management</h1>
        <div className="glass rounded-xl p-6 text-accent-error border border-accent-error/30">{error}</div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="p-8 max-w-7xl mx-auto"
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Tenant Management</h1>
          <p className="text-white/50 text-sm mt-1">Manage organizations and their access</p>
        </div>
        <button className="px-4 py-2 bg-aurixa-600 hover:bg-aurixa-700 text-white text-sm font-medium rounded-lg transition-colors">
          + Add Tenant
        </button>
      </div>

      <div className="glass rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left px-5 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider">Name</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider">Plan</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider">Status</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider">API Keys</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider">Created</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-white/50">Loading tenants...</td>
              </tr>
            ) : (
              tenants.map((tenant, i) => (
                <motion.tr
                  key={tenant.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-5 py-4">
                    <p className="text-sm font-medium text-white/90">{tenant.name}</p>
                    <p className="text-xs text-white/30 font-mono">{tenant.id}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className={clsx("text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize", planColors[tenant.plan] || "bg-white/10")}>
                      {tenant.plan}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className={clsx("w-1.5 h-1.5 rounded-full", statusDotColors[tenant.status] || "bg-white/30")} />
                      <span className={clsx("text-sm capitalize", statusColors[tenant.status])}>{tenant.status}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-white/60 font-mono">{tenant.apiKeys ?? 0}</td>
                  <td className="px-5 py-4 text-sm text-white/40">{tenant.created}</td>
                  <td className="px-5 py-4 text-right">
                    <button className="text-xs text-aurixa-400 hover:text-aurixa-300 transition-colors font-medium">Manage</button>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
