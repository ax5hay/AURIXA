"use client";

import { motion } from "framer-motion";
import clsx from "clsx";
import { useState } from "react";

interface Service {
  name: string;
  status: "running" | "degraded" | "stopped";
  version: string;
  instances: number;
  cpu: number;
  memory: number;
  lastDeployed: string;
}

const mockServices: Service[] = [
  { name: "API Gateway", status: "running", version: "2.4.1", instances: 3, cpu: 24, memory: 45, lastDeployed: "2026-02-12" },
  { name: "Auth Service", status: "running", version: "1.8.0", instances: 2, cpu: 12, memory: 32, lastDeployed: "2026-02-10" },
  { name: "Valuation Engine", status: "running", version: "3.1.2", instances: 4, cpu: 67, memory: 71, lastDeployed: "2026-02-08" },
  { name: "Market Data Ingestion", status: "running", version: "2.0.5", instances: 2, cpu: 38, memory: 52, lastDeployed: "2026-02-11" },
  { name: "Risk Analyzer", status: "running", version: "1.5.3", instances: 3, cpu: 55, memory: 63, lastDeployed: "2026-02-07" },
  { name: "Portfolio Service", status: "running", version: "2.2.0", instances: 2, cpu: 18, memory: 29, lastDeployed: "2026-02-13" },
  { name: "Notification Hub", status: "degraded", version: "1.3.1", instances: 1, cpu: 82, memory: 88, lastDeployed: "2026-01-30" },
  { name: "Report Generator", status: "stopped", version: "1.1.0", instances: 0, cpu: 0, memory: 0, lastDeployed: "2026-01-25" },
];

const statusColors: Record<string, string> = {
  running: "bg-accent-success",
  degraded: "bg-accent-warning",
  stopped: "bg-accent-error",
};

const statusLabels: Record<string, string> = {
  running: "Running",
  degraded: "Degraded",
  stopped: "Stopped",
};

export default function ServicesPage() {
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Service Management</h1>
        <p className="text-sm text-white/40 mt-1">
          Monitor and manage platform microservices
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Service Health Grid */}
        <div className="xl:col-span-2 space-y-3">
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">
            Service Health
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {mockServices.map((service, i) => (
              <motion.button
                key={service.name}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => setSelectedService(service)}
                className={clsx(
                  "bg-surface-secondary border rounded-lg p-4 text-left transition-all",
                  selectedService?.name === service.name
                    ? "border-aurixa-500/50 ring-1 ring-aurixa-500/20"
                    : "border-white/5 hover:border-white/10"
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={clsx(
                        "w-2 h-2 rounded-full",
                        statusColors[service.status]
                      )}
                    />
                    <span className="text-sm font-medium text-white/90">
                      {service.name}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-white/30">
                    v{service.version}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/40">CPU</span>
                    <span className="text-white/60 font-mono">{service.cpu}%</span>
                  </div>
                  <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={clsx(
                        "h-full rounded-full transition-all",
                        service.cpu > 75 ? "bg-accent-error" : service.cpu > 50 ? "bg-accent-warning" : "bg-aurixa-500"
                      )}
                      style={{ width: `${service.cpu}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/40">Memory</span>
                    <span className="text-white/60 font-mono">{service.memory}%</span>
                  </div>
                  <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={clsx(
                        "h-full rounded-full transition-all",
                        service.memory > 80 ? "bg-accent-error" : service.memory > 60 ? "bg-accent-warning" : "bg-aurixa-500"
                      )}
                      style={{ width: `${service.memory}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 text-xs text-white/30">
                  <span>{service.instances} instance{service.instances !== 1 ? "s" : ""}</span>
                  <span>{statusLabels[service.status]}</span>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Configuration Viewer / Actions */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">
            {selectedService ? selectedService.name : "Select a Service"}
          </h2>

          {selectedService ? (
            <motion.div
              key={selectedService.name}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              {/* Config */}
              <div className="bg-surface-secondary border border-white/5 rounded-lg p-4">
                <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
                  Configuration
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/40">Version</span>
                    <span className="text-white/80 font-mono">
                      {selectedService.version}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">Instances</span>
                    <span className="text-white/80 font-mono">
                      {selectedService.instances}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">Status</span>
                    <span
                      className={clsx(
                        "capitalize font-medium",
                        selectedService.status === "running"
                          ? "text-accent-success"
                          : selectedService.status === "degraded"
                          ? "text-accent-warning"
                          : "text-accent-error"
                      )}
                    >
                      {selectedService.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">Last Deployed</span>
                    <span className="text-white/80">
                      {selectedService.lastDeployed}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="bg-surface-secondary border border-white/5 rounded-lg p-4">
                <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
                  Actions
                </h3>
                <div className="space-y-2">
                  <button className="w-full px-3 py-2 bg-aurixa-600/15 text-aurixa-400 text-sm font-medium rounded-lg hover:bg-aurixa-600/25 transition-colors">
                    Restart Service
                  </button>
                  <button className="w-full px-3 py-2 bg-white/5 text-white/60 text-sm font-medium rounded-lg hover:bg-white/10 transition-colors">
                    Deploy New Version
                  </button>
                  <button className="w-full px-3 py-2 bg-white/5 text-white/60 text-sm font-medium rounded-lg hover:bg-white/10 transition-colors">
                    Scale Instances
                  </button>
                  <button className="w-full px-3 py-2 bg-accent-error/10 text-accent-error text-sm font-medium rounded-lg hover:bg-accent-error/20 transition-colors">
                    Stop Service
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="bg-surface-secondary border border-white/5 rounded-lg p-8 text-center">
              <p className="text-sm text-white/30">
                Click on a service to view its configuration and actions.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
