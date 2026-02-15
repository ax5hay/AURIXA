"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ServiceCard from "@/components/ServiceCard";
import { getServiceHealth, getAnalyticsSummary, getTenants, getAnalytics, getKnowledgeArticles, getAuditLog, type ServiceHealth, type AuditEntry } from "@/app/services/api";

function formatServiceName(name: string): string {
  return name.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function DashboardPage() {
  const [serviceHealth, setServiceHealth] = useState<ServiceHealth>({});
  const [insights, setInsights] = useState<Awaited<ReturnType<typeof getAnalyticsSummary>> | null>(null);
  const [tenants, setTenants] = useState<{ status: string; id: string; name: string }[]>([]);
  const [analytics, setAnalytics] = useState<{ totalCalls: number; totalCost: number } | null>(null);
  const [articlesByTenant, setArticlesByTenant] = useState<Record<string, number>>({});
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [health, summary, t, obs, articles, audit] = await Promise.all([
          getServiceHealth(),
          getAnalyticsSummary().catch(() => null),
          getTenants().catch(() => []),
          getAnalytics().catch(() => ({ overall_metrics: {}, service_metrics: {} })),
          getKnowledgeArticles().catch(() => []),
          getAuditLog(20).catch(() => []),
        ]);
        setServiceHealth(health);
        setInsights(summary);
        setTenants(t);
        const byTenant: Record<string, number> = {};
        for (const a of articles) {
          if (a.tenantId != null) {
            const key = `t-${String(a.tenantId).padStart(3, "0")}`;
            byTenant[key] = (byTenant[key] ?? 0) + 1;
          }
        }
        setArticlesByTenant(byTenant);
        setAuditLog(audit);
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

      {/* Knowledge Base CTA */}
      <Link
        href="/knowledge"
        className="block mb-8 glass rounded-xl p-5 hover:ring-2 hover:ring-aurixa-500/40 transition-all group"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white group-hover:text-aurixa-300 transition-colors">Knowledge Base</h2>
            <p className="text-sm text-white/50 mt-0.5">
              RAG-indexed articles by tenant. Browse and search tenant-specific knowledge.
            </p>
            {Object.keys(articlesByTenant).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {tenants
                  .filter((t) => articlesByTenant[t.id] != null && articlesByTenant[t.id] > 0)
                  .map((t) => (
                    <span key={t.id} className="text-xs px-2 py-1 rounded bg-aurixa-600/20 text-aurixa-400">
                      {t.name}: {articlesByTenant[t.id]} articles
                    </span>
                  ))}
              </div>
            )}
          </div>
          <span className="text-aurixa-400 group-hover:translate-x-1 transition-transform">→</span>
        </div>
      </Link>

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

      {/* Recent Audit Log */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-white/80">Recent Audit Log</h2>
          <Link href="/audit" className="text-sm text-aurixa-400 hover:text-aurixa-300 transition-colors">View all →</Link>
        </div>
        <div className="glass rounded-xl p-6">
          {auditLog.length === 0 ? (
            <p className="text-white/50 text-sm">No audit entries.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {auditLog.map((a) => (
                <div key={a.id} className="flex items-start gap-3 p-3 rounded-xl bg-surface-secondary/40 border border-white/5 text-sm">
                  <span className="text-white/40 font-mono shrink-0 text-xs">{a.timestamp}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-white/90 font-medium">{a.service} · {a.action}</p>
                    <p className="text-white/50 text-xs mt-0.5 truncate">{a.details}</p>
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded text-xs ${a.severity === "error" ? "bg-red-500/20 text-red-400" : a.severity === "warning" ? "bg-amber-500/20 text-amber-400" : "bg-white/10 text-white/60"}`}>
                    {a.severity}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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
