"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const CHART_COLORS = {
  grid: "rgba(148, 163, 184, 0.08)",
  tooltipBg: "rgba(15, 23, 42, 0.95)",
  tooltipBorder: "rgba(148, 163, 184, 0.15)",
  primary: "#6366f1",
  success: "#34d399",
  warning: "#fbbf24",
};

const PIE_COLORS = ["#6366f1", "#22d3ee", "#a78bfa", "#34d399", "#fbbf24", "#64748b"];

function EventVolumeTooltip(props: { active?: boolean; payload?: Array<{ payload: { name: string; count: number; latency: number; cost?: number } }> }) {
  const { active, payload } = props;
  if (!active || !payload?.[0]?.payload) return null;
  const d = payload[0].payload;
  return (
    <div className="px-4 py-3 rounded-xl border shadow-xl text-sm" style={{ backgroundColor: CHART_COLORS.tooltipBg, borderColor: CHART_COLORS.tooltipBorder }}>
      <p className="font-medium text-white mb-1">{d.name}</p>
      <p className="text-white/70">Events: <span className="text-aurixa-300 font-mono">{d.count?.toLocaleString()}</span></p>
      <p className="text-white/70">Avg latency: <span className="font-mono">{d.latency}ms</span></p>
      {d.cost != null && d.cost > 0 && <p className="text-white/70">Cost: <span className="text-aurixa-400">${d.cost.toFixed(4)}</span></p>}
    </div>
  );
}

function ServiceTrafficTooltip(props: { active?: boolean; payload?: Array<{ payload: { name: string; events: number; cost?: number } }> }) {
  const { active, payload } = props;
  if (!active || !payload?.[0]?.payload) return null;
  const d = payload[0].payload;
  return (
    <div className="px-4 py-3 rounded-xl border shadow-xl text-sm" style={{ backgroundColor: CHART_COLORS.tooltipBg, borderColor: CHART_COLORS.tooltipBorder }}>
      <p className="font-medium text-white mb-1">{d.name}</p>
      <p className="text-white/70">Total events: <span className="text-aurixa-300 font-mono">{d.events?.toLocaleString()}</span></p>
      {d.cost != null && d.cost > 0 && <p className="text-white/70">Estimated cost: <span className="text-aurixa-400">${d.cost.toFixed(4)}</span></p>}
    </div>
  );
}

function EntityPieTooltip(props: { active?: boolean; payload?: readonly { name: string; value: number }[]; total: number }) {
  const { active, payload, total } = props;
  if (!active || !payload?.[0]) return null;
  const p = payload[0];
  const value = Number(p.value);
  const pct = total > 0 ? (value / total * 100).toFixed(1) : "0";
  return (
    <div className="px-4 py-3 rounded-xl border shadow-xl text-sm" style={{ backgroundColor: CHART_COLORS.tooltipBg, borderColor: CHART_COLORS.tooltipBorder }}>
      <p className="font-medium text-white">{p.name}</p>
      <p className="text-white/70">Count: <span className="text-aurixa-300 font-mono">{value.toLocaleString()}</span></p>
      <p className="text-white/50 text-xs">{pct}% of total entities</p>
    </div>
  );
}

export interface AnalyticsChartsProps {
  overall: Record<string, { count?: number; avg_latency_ms?: number; p95_latency_ms?: number; total_cost_usd?: number }>;
  dbSummary: { conversations_total?: number; tenants_count?: number; patients_count?: number; appointments_count?: number; knowledge_articles_count?: number; audit_entries_count?: number } | null;
  data: { service_metrics?: Record<string, Record<string, { count?: number; avg_latency_ms?: number; p95_latency_ms?: number; total_cost_usd?: number }>> } | null;
}

export default function AnalyticsCharts({ overall, dbSummary, data }: AnalyticsChartsProps) {
  const hasObservability = Object.keys(overall).length > 0;
  const totalCalls = Object.values(overall).reduce((s, m) => s + (m?.count || 0), 0);
  const totalCost = Object.values(overall).reduce((s, m) => s + (m?.total_cost_usd || 0), 0);
  const avgLatency = totalCalls > 0
    ? Object.entries(overall).reduce((s, [, m]) => s + ((m?.avg_latency_ms || 0) * (m?.count || 0)), 0) / totalCalls
    : 0;

  const eventTypeChartData = Object.entries(overall).map(([name, m]) => ({
    name: name.replace(/_/g, " "),
    count: m?.count ?? 0,
    latency: Math.round(m?.avg_latency_ms ?? 0),
    cost: m?.total_cost_usd ?? 0,
  }));

  const dbPieData = [
    { name: "Conversations", value: dbSummary?.conversations_total ?? 0 },
    { name: "Tenants", value: dbSummary?.tenants_count ?? 0 },
    { name: "Patients", value: dbSummary?.patients_count ?? 0 },
    { name: "Appointments", value: dbSummary?.appointments_count ?? 0 },
    { name: "Articles", value: dbSummary?.knowledge_articles_count ?? 0 },
    { name: "Audits", value: dbSummary?.audit_entries_count ?? 0 },
  ].filter((d) => d.value > 0);

  const serviceChartData = data?.service_metrics
    ? Object.entries(data.service_metrics).map(([svc, types]) => {
        const total = Object.values(types).reduce((s, m) => s + (m?.count ?? 0), 0);
        const cost = Object.values(types).reduce((s, m) => s + (m?.total_cost_usd ?? 0), 0);
        return { name: svc.replace(/-/g, " "), events: total, cost };
      }).filter((d) => d.events > 0)
    : [];

  const totalEntities = dbPieData.reduce((s, d) => s + d.value, 0);

  return (
    <>
      {hasObservability && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="glass rounded-xl p-4 border border-indigo-500/20 bg-indigo-500/5">
            <p className="text-[10px] font-semibold text-indigo-300/80 uppercase tracking-wider">Telemetry Events</p>
            <p className="text-2xl font-bold text-white mt-0.5">{totalCalls.toLocaleString()}</p>
            <p className="text-xs text-white/40 mt-1">From observability core</p>
          </div>
          <div className="glass rounded-xl p-4 border border-cyan-500/20 bg-cyan-500/5">
            <p className="text-[10px] font-semibold text-cyan-300/80 uppercase tracking-wider">Avg Latency</p>
            <p className="text-2xl font-bold text-white mt-0.5">{avgLatency.toFixed(0)}ms</p>
            <p className="text-xs text-white/40 mt-1">Across all event types</p>
          </div>
          <div className="glass rounded-xl p-4 border border-amber-500/20 bg-amber-500/5">
            <p className="text-[10px] font-semibold text-amber-300/80 uppercase tracking-wider">LLM Cost</p>
            <p className="text-2xl font-bold text-white mt-0.5">${totalCost.toFixed(3)}</p>
            <p className="text-xs text-white/40 mt-1">Estimated USD</p>
          </div>
        </div>
      )}

      {hasObservability && eventTypeChartData.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white/90 mb-4">Event Volume by Type</h2>
          <div className="glass rounded-xl p-6 border border-white/5 overflow-hidden">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={eventTypeChartData} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <Tooltip content={<EventVolumeTooltip />} cursor={{ fill: "rgba(99, 102, 241, 0.08)" }} />
                <Bar dataKey="count" fill={CHART_COLORS.primary} radius={[6, 6, 0, 0]} name="Events" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {hasObservability && serviceChartData.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white/90 mb-4">Traffic by Service</h2>
          <div className="glass rounded-xl p-6 border border-white/5 overflow-hidden">
            <ResponsiveContainer width="100%" height={Math.max(220, serviceChartData.length * 48)}>
              <BarChart data={serviceChartData} layout="vertical" margin={{ left: 90, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <YAxis type="category" dataKey="name" stroke="#94a3b8" tick={{ fill: "#94a3b8", fontSize: 11 }} width={85} />
                <Tooltip content={<ServiceTrafficTooltip />} cursor={{ fill: "rgba(99, 102, 241, 0.06)" }} />
                <Bar dataKey="events" fill={CHART_COLORS.success} radius={[0, 6, 6, 0]} name="Events" />
                {serviceChartData.some((d) => d.cost > 0) && (
                  <Bar dataKey="cost" fill={CHART_COLORS.warning} radius={[0, 6, 6, 0]} name="Cost (USD)" />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {dbPieData.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white/90 mb-4">Entity Distribution</h2>
          <div className="glass rounded-xl p-6 border border-white/5 overflow-hidden">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={dbPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {dbPieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="rgba(15,23,42,0.6)" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip content={(p) => <EntityPieTooltip active={p.active} payload={p.payload} total={totalEntities} />} />
                  <Legend
                    formatter={(value, entry) => (
                      <span className="text-white/70 text-sm inline-flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry?.color }} />
                        {value}
                      </span>
                    )}
                    wrapperStyle={{ paddingTop: 16 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 text-sm text-white/50 space-y-1">
                <p>Total entities: <span className="text-white font-mono">{totalEntities.toLocaleString()}</span></p>
                <p className="text-xs mt-2">Breakdown of database records across core entity types used for analytics and RAG.</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {!hasObservability && (
        <div className="glass rounded-xl p-6 mb-8 border border-white/5 text-white/50 text-sm">
          Telemetry charts (event volume, service traffic) appear when the observability service receives events from pipelines.
        </div>
      )}

      {hasObservability && Object.keys(overall).length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-white/90 mb-4">Event-Type Breakdown</h2>
          <div className="glass rounded-xl overflow-hidden border border-white/5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 font-medium text-white/60">Type</th>
                  <th className="text-right py-3 px-4 font-medium text-white/60">Count</th>
                  <th className="text-right py-3 px-4 font-medium text-white/60">Avg (ms)</th>
                  <th className="text-right py-3 px-4 font-medium text-white/60">P95 (ms)</th>
                  <th className="text-right py-3 px-4 font-medium text-white/60">Cost</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(overall).map(([type, m]) => (
                  <tr key={type} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="py-3 px-4 text-white/90 capitalize">{type.replace(/_/g, " ")}</td>
                    <td className="py-3 px-4 text-right font-mono text-white/80">{(m?.count ?? 0).toLocaleString()}</td>
                    <td className="py-3 px-4 text-right font-mono text-white/70">{(m?.avg_latency_ms ?? 0).toFixed(0)}</td>
                    <td className="py-3 px-4 text-right font-mono text-white/70">{(m?.p95_latency_ms ?? 0).toFixed(0)}</td>
                    <td className="py-3 px-4 text-right text-aurixa-400 font-mono">
                      {m?.total_cost_usd != null ? `$${m.total_cost_usd.toFixed(4)}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
