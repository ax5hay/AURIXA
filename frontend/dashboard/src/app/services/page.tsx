"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { getServiceHealth } from "@/app/services/api";

interface Service {
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

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  useEffect(() => {
    getServiceHealth()
      .then((sh) => Object.entries(sh).map(([name, h]) => ({ name: formatName(name), status: h?.status || "down", latencyMs: h?.latencyMs })))
      .then(setServices)
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
                  key={service.name}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => setSelectedService(service)}
                  className={cn(
                    "glass rounded-xl p-4 text-left transition-all",
                    selectedService?.name === service.name ? "ring-2 ring-aurixa-500/50" : "hover:bg-white/[0.02]"
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
              key={selectedService.name}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass rounded-xl p-4"
            >
              <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Details</h3>
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
