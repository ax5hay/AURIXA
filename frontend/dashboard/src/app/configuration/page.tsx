"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";
import { getConfigSummary, getConfigDetail, getServiceHealth } from "@/app/services/api";

const API_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://localhost:3000";

export default function ConfigurationPage() {
  const [config, setConfig] = useState<Awaited<ReturnType<typeof getConfigSummary>> | null>(null);
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getConfigDetail>> | null>(null);
  const [services, setServices] = useState<Awaited<ReturnType<typeof getServiceHealth>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getConfigSummary().catch(() => null),
      getConfigDetail().catch(() => null),
      getServiceHealth().catch(() => null),
    ])
      .then(([c, d, s]) => {
        setConfig(c);
        setDetail(d);
        setServices(s ?? {});
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  if (error) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Configuration</h1>
        <div className="glass rounded-xl p-6 text-accent-error border border-accent-error/30">{error}</div>
      </div>
    );
  }

  const healthyCount = Object.values(services ?? {}).filter((s) => s?.status === "healthy").length;
  const totalServices = Object.keys(services ?? {}).length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="p-8 max-w-7xl mx-auto"
    >
      <h1 className="text-3xl font-bold text-white mb-2">Configuration</h1>
      <p className="text-white/50 text-sm mb-8">Platform settings, tenant distribution, and service status — all from database and live APIs</p>

      {loading ? (
        <div className="glass rounded-xl p-12 text-center text-white/50">Loading configuration...</div>
      ) : (
        <div className="space-y-6">
          <div className="glass rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white/80 mb-4">API Gateway</h2>
            <code className="block px-4 py-2 rounded-lg bg-surface-secondary/80 text-aurixa-400 text-sm font-mono break-all">{API_URL}</code>
            <p className="text-xs text-white/40 mt-2">Base URL for all admin, orchestration, and observability requests</p>
          </div>

          {config && (
            <div className="glass rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white/80 mb-4">Tenant Distribution</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-2xl font-bold text-white">{config.tenants_count}</p>
                  <p className="text-xs text-white/40">Total tenants</p>
                </div>
                {Object.entries(config.tenants_by_plan ?? {}).map(([plan, n]) => (
                  <div key={plan}>
                    <p className="text-xl font-bold text-white">{n}</p>
                    <p className="text-xs text-white/40 capitalize">{plan}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap gap-4">
                {Object.entries(config.tenants_by_status ?? {}).map(([status, n]) => (
                  <span key={status} className="text-sm text-white/60">
                    <span className="capitalize">{status}</span>: {n}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="glass rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white/80 mb-4">Service Health</h2>
            <p className="text-white/60 mb-3">
              {healthyCount} of {totalServices} services healthy (from /health/services)
            </p>
            {totalServices > 0 && (
              <div className="flex flex-wrap gap-2">
                {Object.entries(services ?? {}).map(([name, h]) => (
                  <span
                    key={name}
                    className={clsx(
                      "text-xs px-2 py-1 rounded flex items-center gap-1.5",
                      h?.status === "healthy" ? "bg-accent-success/15 text-accent-success" : h?.status === "degraded" ? "bg-accent-warning/15 text-accent-warning" : "bg-accent-error/15 text-accent-error"
                    )}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                    {name.replace(/-/g, " ")}
                    {h?.latencyMs != null && <span className="text-white/50 font-mono">({h.latencyMs}ms)</span>}
                  </span>
                ))}
              </div>
            )}
            {totalServices === 0 && <p className="text-white/40 text-sm">No service health data. Ensure the API gateway is running.</p>}
          </div>

          {detail && Object.keys(detail.categories ?? {}).length > 0 && (
            <div className="glass rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white/80 mb-4">Platform Config (Database)</h2>
              <p className="text-sm text-white/50 mb-4">Key-value configuration stored in platform_config table</p>
              <div className="space-y-4">
                {Object.entries(detail.categories).map(([category, entries]) => (
                  <div key={category}>
                    <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 capitalize">{category.replace(/_/g, " ")}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {entries.map(({ key, value }) => (
                        <div key={key} className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-secondary/50 border border-white/5">
                          <span className="text-sm text-white/70 font-mono">{key}</span>
                          <span className="text-sm text-aurixa-400 font-mono">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(!detail || Object.keys(detail.categories ?? {}).length === 0) && (
            <div className="glass rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white/80 mb-4">Platform Config</h2>
              <p className="text-white/40 text-sm">
                No platform config entries. Run <code className="px-1 py-0.5 rounded bg-black/20">pnpm db:seed</code> to populate.
              </p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
