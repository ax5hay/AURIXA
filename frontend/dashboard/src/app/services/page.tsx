"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { getServiceHealth, getAnalytics } from "@/app/services/api";

interface Service {
  rawKey: string;
  name: string;
  status: string;
  latencyMs?: number;
}

const statusColors: Record<string, string> = {
  healthy: "bg-accent-success",
  degraded: "bg-accent-warning",
  down: "bg-accent-error",
};

const statusLabels: Record<string, string> = {
  healthy: "Running",
  degraded: "Degraded",
  down: "Down",
};

function formatName(key: string): string {
  return key.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function matchServiceMetrics(rawKey: string, serviceMetrics: Record<string, Record<string, unknown>>): Record<string, unknown> | undefined {
  if (serviceMetrics[rawKey]) return serviceMetrics[rawKey] as Record<string, unknown>;
  const candidates = [
    rawKey + "-engine",
    rawKey + "-service",
    rawKey.replace(" ", "-").toLowerCase(),
  ];
  for (const c of candidates) {
    if (serviceMetrics[c]) return serviceMetrics[c] as Record<string, unknown>;
  }
  return undefined;
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [analytics, setAnalytics] = useState<Awaited<ReturnType<typeof getAnalytics>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  useEffect(() => {
    Promise.all([
      getServiceHealth(),
      getAnalytics().catch(() => ({ overall_metrics: {}, service_metrics: {} })),
    ])
      .then(([sh, obs]) => {
        setServices(
          Object.entries(sh).map(([rawKey, h]) => ({
            rawKey,
            name: formatName(rawKey),
            status: h?.status || "down",
            latencyMs: h?.latencyMs,
          }))
        );
        setAnalytics(obs);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  if (error) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Service Management</h1>
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
      <h1 className="text-3xl font-bold text-white mb-2">Service Management</h1>
      <p className="text-white/50 text-sm mb-8">Monitor and manage platform microservices</p>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-3">
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Service Health</h2>
          {loading ? (
            <div className="text-white/50 py-8">Loading services...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {services.map((service, i) => (
                <motion.button
                  key={service.rawKey}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => setSelectedService(service)}
                  className={cn(
                    "glass rounded-xl p-4 text-left transition-all",
                    selectedService?.rawKey === service.rawKey ? "ring-2 ring-aurixa-500/50" : "hover:bg-white/[0.02]"
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", statusColors[service.status] || "bg-accent-error")} />
                      <span className="text-sm font-medium text-white/90">{service.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-white/30">
                      {service.latencyMs != null ? `${service.latencyMs}ms` : ""}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-white/40">Latency</span>
                      <span className="text-white/60 font-mono">{service.latencyMs != null ? `${service.latencyMs}ms` : "—"}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-white/40">Status</span>
                      <span className="text-white/60 capitalize">{statusLabels[service.status] || service.status}</span>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">
            {selectedService ? selectedService.name : "Select a Service"}
          </h2>
          {selectedService ? (
            <motion.div
              key={selectedService.rawKey}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div className="glass rounded-xl p-4">
                <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Health & Latency</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/40">Status</span>
                    <span className={cn("font-medium capitalize", selectedService.status === "healthy" ? "text-accent-success" : selectedService.status === "degraded" ? "text-accent-warning" : "text-accent-error")}>
                      {statusLabels[selectedService.status] || selectedService.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">Latency</span>
                    <span className="text-white/80 font-mono">{selectedService.latencyMs != null ? `${selectedService.latencyMs}ms` : "—"}</span>
                  </div>
                </div>
              </div>
              {analytics?.service_metrics && (() => {
                const types = matchServiceMetrics(selectedService.rawKey, analytics.service_metrics);
                if (!types || Object.keys(types).length === 0) return null;
                const eventList = Object.entries(types) as [string, { count?: number; avg_latency_ms?: number; p95_latency_ms?: number; total_cost_usd?: number }][];
                const totalEvents = eventList.reduce((s, [, m]) => s + (m?.count ?? 0), 0);
                const totalCost = eventList.reduce((s, [, m]) => s + (m?.total_cost_usd ?? 0), 0);
                const avgLat = totalEvents > 0
                  ? eventList.reduce((s, [, m]) => s + ((m?.avg_latency_ms ?? 0) * (m?.count ?? 0)), 0) / totalEvents
                  : 0;
                return (
                  <div className="glass rounded-xl p-4">
                    <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Observability Metrics</h3>
                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex justify-between">
                        <span className="text-white/40">Total events</span>
                        <span className="text-white/80 font-mono">{totalEvents.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/40">Avg latency</span>
                        <span className="text-white/80 font-mono">{avgLat.toFixed(0)}ms</span>
                      </div>
                      {totalCost > 0 && (
                        <div className="flex justify-between">
                          <span className="text-white/40">Estimated cost</span>
                          <span className="text-aurixa-400">${totalCost.toFixed(3)}</span>
                        </div>
                      )}
                    </div>
                    <div className="border-t border-white/10 pt-3">
                      <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-2">By event type</p>
                      <div className="space-y-1.5">
                        {eventList.map(([evt, m]) => (
                          <div key={evt} className="flex justify-between text-xs">
                            <span className="text-white/60 capitalize truncate">{evt.replace(/_/g, " ")}</span>
                            <span className="text-white/50 font-mono flex-shrink-0 ml-2">
                              {m?.count ?? 0} calls · {(m?.avg_latency_ms ?? 0).toFixed(0)}ms
                              {m?.total_cost_usd != null && m.total_cost_usd > 0 && (
                                <span className="text-aurixa-400 ml-1">· ${m.total_cost_usd.toFixed(3)}</span>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          ) : (
            <div className="glass rounded-xl p-8 text-center">
              <p className="text-sm text-white/30">Click on a service to view details.</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
