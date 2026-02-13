"use client";

import { motion } from "framer-motion";
import clsx from "clsx";

const systemMetrics = [
  {
    label: "System Health",
    value: "Operational",
    badge: "healthy",
    detail: "All systems nominal",
  },
  {
    label: "Active Tenants",
    value: "24",
    badge: "info",
    detail: "3 pending approval",
  },
  {
    label: "Total API Calls",
    value: "1.2M",
    badge: "info",
    detail: "Last 24 hours",
  },
  {
    label: "Error Rate",
    value: "0.03%",
    badge: "healthy",
    detail: "Below threshold",
  },
];

const services = [
  { name: "API Gateway", status: "running", uptime: "99.99%", latency: "12ms" },
  { name: "Auth Service", status: "running", uptime: "99.98%", latency: "8ms" },
  { name: "Valuation Engine", status: "running", uptime: "99.95%", latency: "145ms" },
  { name: "Market Data", status: "running", uptime: "99.97%", latency: "23ms" },
  { name: "Risk Analyzer", status: "running", uptime: "99.90%", latency: "89ms" },
  { name: "Portfolio Service", status: "running", uptime: "99.96%", latency: "34ms" },
  { name: "Notification Hub", status: "degraded", uptime: "98.50%", latency: "210ms" },
  { name: "Report Generator", status: "running", uptime: "99.92%", latency: "560ms" },
];

const badgeColors: Record<string, string> = {
  healthy: "bg-accent-success/15 text-accent-success",
  warning: "bg-accent-warning/15 text-accent-warning",
  error: "bg-accent-error/15 text-accent-error",
  info: "bg-aurixa-600/15 text-aurixa-400",
};

const statusColors: Record<string, string> = {
  running: "bg-accent-success",
  degraded: "bg-accent-warning",
  stopped: "bg-accent-error",
};

export default function OverviewPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">System Overview</h1>
        <p className="text-sm text-white/40 mt-1">
          Platform health and operational metrics
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {systemMetrics.map((metric, i) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-surface-secondary border border-white/5 rounded-xl p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-white/40 uppercase tracking-wider">
                {metric.label}
              </span>
              <span
                className={clsx(
                  "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                  badgeColors[metric.badge]
                )}
              >
                {metric.badge === "healthy" ? "Healthy" : "Active"}
              </span>
            </div>
            <p className="text-2xl font-bold text-white">{metric.value}</p>
            <p className="text-xs text-white/30 mt-1">{metric.detail}</p>
          </motion.div>
        ))}
      </div>

      {/* Service Status Grid */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">
          Service Status
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {services.map((service, i) => (
            <motion.div
              key={service.name}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.03 }}
              className="bg-surface-secondary border border-white/5 rounded-lg p-4 hover:border-white/10 transition-colors"
            >
              <div className="flex items-center gap-2 mb-3">
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
              <div className="flex items-center justify-between text-xs text-white/40">
                <span>Uptime: {service.uptime}</span>
                <span>Latency: {service.latency}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
