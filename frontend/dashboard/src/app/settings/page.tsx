"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { getConfigSummary, getConfigDetail, getServiceHealth } from "@/app/services/api";

const API_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://localhost:3000";

export default function SettingsPage() {
  const [config, setConfig] = useState<Awaited<ReturnType<typeof getConfigSummary>> | null>(null);
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getConfigDetail>> | null>(null);
  const [health, setHealth] = useState<Awaited<ReturnType<typeof getServiceHealth>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getConfigSummary().catch(() => null),
      getConfigDetail().catch(() => null),
      getServiceHealth().catch(() => null),
    ])
      .then(([c, d, h]) => {
        setConfig(c);
        setDetail(d);
        setHealth(h);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  if (error) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Settings</h1>
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
      <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
      <p className="text-white/50 text-sm mb-8">Platform configuration and service status</p>

      {loading ? (
        <div className="glass rounded-xl p-8 text-center text-white/50">Loading...</div>
      ) : (
        <div className="space-y-6">
          <div className="glass rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white/80 mb-4">API Endpoint</h2>
            <code className="block px-4 py-2 rounded-lg bg-surface-secondary/80 text-aurixa-400 text-sm font-mono break-all">
              {API_URL}
            </code>
            <p className="text-xs text-white/40 mt-2">Gateway used for orchestration, observability, and admin APIs</p>
          </div>

          <div className="glass rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white/80 mb-4">Service Health</h2>
            {health && Object.keys(health).length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(health).map(([name, info]) => (
                  <div
                    key={name}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg bg-surface-secondary/50 border border-white/5"
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        info?.status === "healthy" ? "bg-accent-success" : "bg-accent-warning"
                      }`}
                    />
                    <div>
                      <p className="text-sm font-medium text-white/80">{name}</p>
                      <p className="text-xs text-white/40">
                        {info?.status ?? "unknown"}
                        {info?.latencyMs != null && ` · ${info.latencyMs}ms`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/50 text-sm">No service health data available. Ensure the API gateway is running.</p>
            )}
          </div>

          {config && (
            <div className="glass rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white/80 mb-4">Tenant Distribution</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-2xl font-bold text-white">{config.tenants_count}</p>
                  <p className="text-xs text-white/40">Total</p>
                </div>
                {Object.entries(config.tenants_by_plan ?? {}).map(([plan, n]) => (
                  <div key={plan}>
                    <p className="text-2xl font-bold text-white">{n}</p>
                    <p className="text-xs text-white/40 capitalize">{plan}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-white/5">
                <p className="text-sm text-white/50">
                  By status:{" "}
                  {Object.entries(config.tenants_by_status ?? {})
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(", ")}
                </p>
              </div>
            </div>
          )}

          {detail && Object.keys(detail.categories ?? {}).length > 0 && (
            <div className="glass rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white/80 mb-4">Platform Config</h2>
              <p className="text-sm text-white/50 mb-4">Key-value settings from database</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(detail.categories).flatMap(([category, entries]) =>
                  entries.map(({ key, value }) => (
                    <div
                      key={`${category}-${key}`}
                      className="flex items-center justify-between px-4 py-2 rounded-lg bg-surface-secondary/50 border border-white/5"
                    >
                      <span className="text-sm text-white/70 truncate" title={key}>{key}</span>
                      <span className="text-sm text-aurixa-400 font-mono ml-2">{value}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
