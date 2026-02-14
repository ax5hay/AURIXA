"use client";

import { useState, useEffect } from "react";
import clsx from "clsx";
import { getConfigSummary, getConfigDetail, getServiceHealth, getLLMProviders, getLLMModels } from "@/app/services/api";

const API_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://localhost:3000";

export default function ConfigurationPage() {
  const [config, setConfig] = useState<Awaited<ReturnType<typeof getConfigSummary>> | null>(null);
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getConfigDetail>> | null>(null);
  const [services, setServices] = useState<Awaited<ReturnType<typeof getServiceHealth>> | null>(null);
  const [providers, setProviders] = useState<Awaited<ReturnType<typeof getLLMProviders>>>([]);
  const [models, setModels] = useState<Awaited<ReturnType<typeof getLLMModels>>>({ models: [], source: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timeout = setTimeout(() => {
      if (cancelled) return;
      setLoading(false);
    }, 10000);

    Promise.allSettled([
      getConfigSummary(),
      getConfigDetail(),
      getServiceHealth(),
      getLLMProviders(),
      getLLMModels(),
    ]).then(([r1, r2, r3, r4, r5]) => {
      if (cancelled) return;
      setConfig(r1.status === "fulfilled" ? r1.value : null);
      setDetail(r2.status === "fulfilled" ? r2.value : null);
      setServices(r3.status === "fulfilled" ? r3.value ?? {} : {});
      if (r4.status === "fulfilled") setProviders(r4.value);
      if (r5.status === "fulfilled") setModels(r5.value);
      setLoading(false);
      clearTimeout(timeout);
    });

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
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
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-2">Configuration</h1>
      <p className="text-white/50 text-sm mb-8">Platform settings, tenant distribution, and service status — all from database and live APIs</p>

      {loading ? (
        <div className="glass rounded-xl p-12 text-center text-white/50">Loading configuration...</div>
      ) : (
        <div className="space-y-6">
          <div className="glass rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white/80 mb-4">API Gateway</h2>
            <code className="block px-4 py-2 rounded-lg bg-surface-secondary/80 text-aurixa-400 text-sm font-mono break-all">{API_URL}</code>
            <p className="text-xs text-white/40 mt-2">Base URL for admin, orchestration, and observability</p>
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

          <div className="glass rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white/80 mb-4">LLM Providers & Models</h2>
            <p className="text-sm text-white/50 mb-4">
              Local (LM Studio) is primary for cost savings. Cloud providers are selectable when configured.
            </p>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Providers</p>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const [p, m] = await Promise.all([getLLMProviders(), getLLMModels()]);
                      setProviders(p);
                      setModels(m);
                    } catch {
                      /* ignore */
                    }
                  }}
                  className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white/70"
                >
                  Refresh
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {providers.map((p) => (
                  <span
                    key={p.id}
                    className={clsx(
                      "text-xs px-3 py-1.5 rounded-lg flex items-center gap-2",
                      p.healthy ? "bg-accent-success/15 text-accent-success" : "bg-white/10 text-white/50"
                    )}
                  >
                    <span className="w-2 h-2 rounded-full bg-current" />
                    {p.name}
                    {p.healthy ? "" : " (offline)"}
                  </span>
                ))}
                {providers.length === 0 && (
                  <span className="text-white/40 text-sm">No providers. Start LM Studio at http://127.0.0.1:1234 and click Refresh</span>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                  Models {models.source && <span className="normal-case font-normal">(from {models.source})</span>}
                </p>
                <div className="flex flex-wrap gap-2">
                  {models.models.slice(0, 8).map((m) => (
                    <code key={m} className="text-xs px-2 py-1 rounded bg-surface-secondary/80 text-aurixa-400">
                      {m}
                    </code>
                  ))}
                  {models.models.length > 8 && (
                    <span className="text-white/40 text-xs">+{models.models.length - 8} more</span>
                  )}
                  {models.models.length === 0 && (
                    <span className="text-white/40 text-sm">Load a model in LM Studio and click Refresh</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
