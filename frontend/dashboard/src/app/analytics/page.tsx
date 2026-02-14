"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { getAnalytics, getAnalyticsSummary } from "@/app/services/api";

export default function AnalyticsPage() {
  const [data, setData] = useState<Awaited<ReturnType<typeof getAnalytics>> | null>(null);
  const [dbSummary, setDbSummary] = useState<Awaited<ReturnType<typeof getAnalyticsSummary>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getAnalytics().catch(() => null),
      getAnalyticsSummary().catch(() => null),
    ])
      .then(([obs, summary]) => {
        setData(obs);
        setDbSummary(summary);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  if (error) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Analytics</h1>
        <div className="glass rounded-xl p-6 text-accent-error border border-accent-error/30">{error}</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Analytics</h1>
        <div className="glass rounded-xl p-8 text-center text-white/50">Loading analytics...</div>
      </div>
    );
  }

  const overall = data?.overall_metrics ?? {};
  const hasObservability = Object.keys(overall).length > 0;
  const totalCalls = Object.values(overall).reduce((s, m) => s + (m?.count || 0), 0);
  const totalCost = Object.values(overall).reduce((s, m) => s + (m?.total_cost_usd || 0), 0);
  const avgLatency = totalCalls > 0
    ? Object.entries(overall).reduce((s, [, m]) => s + ((m?.avg_latency_ms || 0) * (m?.count || 0)), 0) / totalCalls
    : 0;

  const dbMetrics = [
    { label: "Conversations", value: (dbSummary?.conversations_total ?? 0).toLocaleString(), sub: "From database" },
    { label: "Tenants", value: (dbSummary?.tenants_count ?? 0).toLocaleString(), sub: "Organizations" },
    { label: "Patients", value: (dbSummary?.patients_count ?? 0).toLocaleString(), sub: "Registered" },
    { label: "Appointments", value: (dbSummary?.appointments_count ?? 0).toLocaleString(), sub: "Scheduled" },
    { label: "Knowledge Articles", value: (dbSummary?.knowledge_articles_count ?? 0).toLocaleString(), sub: "In RAG index" },
    { label: "Audit Entries", value: (dbSummary?.audit_entries_count ?? 0).toLocaleString(), sub: "Log entries" },
  ];

  const obsMetrics = [
    { label: "Telemetry Events", value: totalCalls.toLocaleString(), sub: "Observability" },
    { label: "Avg Latency", value: `${avgLatency.toFixed(0)}ms`, sub: "Across event types" },
    { label: "LLM Cost", value: `$${totalCost.toFixed(2)}`, sub: "Estimated" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="p-8 max-w-7xl mx-auto"
    >
      <h1 className="text-3xl font-bold text-white mb-2">Analytics</h1>
      <p className="text-white/50 text-sm mb-8">
        Database metrics and performance data from the observability core.
      </p>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-white/80 mb-4">Database Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dbMetrics.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass rounded-xl p-5"
            >
              <p className="text-xs font-medium text-white/40 uppercase tracking-wider">{m.label}</p>
              <p className="text-2xl font-bold text-white mt-1">{m.value}</p>
              <p className="text-xs text-white/30 mt-0.5">{m.sub}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {hasObservability && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white/80 mb-4">Observability Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {obsMetrics.map((m, i) => (
              <motion.div
                key={m.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.05 }}
                className="glass rounded-xl p-5"
              >
                <p className="text-xs font-medium text-white/40 uppercase tracking-wider">{m.label}</p>
                <p className="text-2xl font-bold text-white mt-1">{m.value}</p>
                <p className="text-xs text-white/30 mt-0.5">{m.sub}</p>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {!hasObservability && (
        <div className="glass rounded-xl p-6 mb-8 border border-white/5">
          <p className="text-white/60">
            Observability metrics (telemetry, latency, LLM cost) are empty. These are populated when the observability service receives events.
          </p>
        </div>
      )}

      {hasObservability && (
        <div className="glass rounded-xl overflow-hidden mb-6">
          <h2 className="text-lg font-semibold text-white/80 px-6 py-4 border-b border-white/5">By Event Type</h2>
          <div className="divide-y divide-white/5">
            {Object.entries(overall).map(([type, m]) => (
              <div key={type} className="flex items-center justify-between px-6 py-4">
                <span className="text-white/90 capitalize">{type.replace(/_/g, " ")}</span>
                <div className="flex gap-6 text-sm">
                  <span className="text-white/50">{m?.count ?? 0} events</span>
                  <span className="text-white/50">{m?.avg_latency_ms?.toFixed(0) ?? "—"}ms avg</span>
                  {m?.total_cost_usd != null && <span className="text-aurixa-400">${m.total_cost_usd.toFixed(3)}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data?.service_metrics && Object.keys(data.service_metrics).length > 0 && (
        <div className="glass rounded-xl overflow-hidden">
          <h2 className="text-lg font-semibold text-white/80 px-6 py-4 border-b border-white/5">By Service</h2>
          <div className="divide-y divide-white/5">
            {Object.entries(data.service_metrics).map(([svc, types]) => (
              <div key={svc} className="px-6 py-4">
                <p className="text-white/90 font-medium mb-2">{svc}</p>
                <div className="flex flex-wrap gap-4">
                  {Object.entries(types).map(([t, m]) => (
                    <span key={t} className="text-xs text-white/50">
                      {t}: {m?.count ?? 0} calls, {m?.avg_latency_ms?.toFixed(0) ?? "—"}ms
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}