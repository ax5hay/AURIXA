"use client";

import { useState, useEffect } from "react";
import ServiceCard from "@/components/ServiceCard";
import { getServiceHealth, getAnalyticsSummary, getTenants, getAnalytics, type ServiceHealth } from "@/app/services/api";

function formatServiceName(name: string): string {
  return name.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function DashboardPage() {
  const [serviceHealth, setServiceHealth] = useState<ServiceHealth>({});
  const [insights, setInsights] = useState<Awaited<ReturnType<typeof getAnalyticsSummary>> | null>(null);
  const [tenants, setTenants] = useState<{ status: string }[]>([]);
  const [analytics, setAnalytics] = useState<{ totalCalls: number; totalCost: number } | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [health, summary, t, obs] = await Promise.all([
          getServiceHealth(),
          getAnalyticsSummary().catch(() => null),
          getTenants().catch(() => []),
          getAnalytics().catch(() => ({ overall_metrics: {}, service_metrics: {} })),
        ]);
        setServiceHealth(health);
        setInsights(summary);
        setTenants(t);
        const totalCalls = Object.values(obs?.overall_metrics ?? {}).reduce((s, m) => s + (m?.count ?? 0), 0);
        const totalCost = Object.values(obs?.overall_metrics ?? {}).reduce((s, m) => s + (m?.total_cost_usd ?? 0), 0);
        setAnalytics({ totalCalls, totalCost });
        setLastUpdated(new Date());
      } catch (err) {
        setError("Failed to fetch data.");
      } finally {
        setHealthLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const activeTenants = tenants.filter((t) => t.status === "active").length;
  const pendingTenants = tenants.filter((t) => t.status === "pending").length;
  const allHealthy = Object.values(serviceHealth).every((s) => s?.status === "healthy");

  const overviewMetrics = [
    { label: "System Health", value: healthLoading ? "—" : allHealthy ? "Operational" : "Degraded", sub: "From /health/services" },
    { label: "Active Tenants", value: healthLoading ? "—" : `${activeTenants}`, sub: pendingTenants ? `${pendingTenants} pending` : `${tenants.length} total` },
    { label: "Conversations", value: healthLoading ? "—" : (insights?.conversations_total ?? analytics?.totalCalls ?? 0).toLocaleString(), sub: "From database" },
    { label: "LLM Cost", value: healthLoading ? "—" : `$${(analytics?.totalCost ?? 0).toFixed(2)}`, sub: "Observability" },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-white/50 text-sm">System status, metrics, and service health — unified AURIXA control center</p>
        </div>
        {lastUpdated && <span className="text-xs text-white/30 font-mono">Updated {lastUpdated.toLocaleTimeString()}</span>}
      </div>

      {error && <div className="text-accent-error mb-6">{error}</div>}

      {/* Overview metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {overviewMetrics.map((m) => (
          <div key={m.label} className="glass rounded-xl p-5">
            <p className="text-xs text-white/40 uppercase tracking-wider">{m.label}</p>
            <p className="text-2xl font-bold text-white mt-1">{m.value}</p>
            <p className="text-xs text-white/30 mt-0.5">{m.sub}</p>
          </div>
        ))}
      </div>

      {/* DB insight cards */}
      {insights && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Conversations (DB)", value: insights.conversations_total },
            { label: "Tenants", value: insights.tenants_count },
            { label: "Patients", value: insights.patients_count },
            { label: "Knowledge Articles", value: insights.knowledge_articles_count },
          ].map((m) => (
            <div key={m.label} className="glass rounded-xl p-4">
              <p className="text-xs text-white/40 uppercase tracking-wider">{m.label}</p>
              <p className="text-2xl font-bold text-white mt-1">{m.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Service Status Grid */}
      <div>
        <h2 className="text-lg font-semibold text-white/80 mb-4">Live Service Health</h2>
        {healthLoading ? (
          <div className="text-white/50">Loading service status...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Object.entries(serviceHealth).map(([name, health]) => (
              <div key={name}>
                <ServiceCard
                  name={formatServiceName(name)}
                  status={health.status as any}
                  latency={`${health.latencyMs ?? 0}ms`}
                  lastCheck="Just now"
                  description={`The ${formatServiceName(name)} service.`}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
