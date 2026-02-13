"use client";

import { motion } from "framer-motion";
import clsx from "clsx";
import { useState } from "react";

interface AuditEntry {
  id: string;
  timestamp: string;
  service: string;
  action: string;
  user: string;
  details: string;
  severity: "info" | "warning" | "error";
}

const mockAuditLogs: AuditEntry[] = [
  { id: "a-001", timestamp: "2026-02-14 09:32:15", service: "Auth Service", action: "User Login", user: "admin@aurixa.io", details: "Successful admin login from 192.168.1.1", severity: "info" },
  { id: "a-002", timestamp: "2026-02-14 09:28:41", service: "API Gateway", action: "Rate Limit Hit", user: "atlas-inv-key-03", details: "Rate limit exceeded: 1000 req/min on /api/v1/valuations", severity: "warning" },
  { id: "a-003", timestamp: "2026-02-14 09:15:03", service: "Valuation Engine", action: "Model Update", user: "system", details: "DCF model parameters updated to v3.1.2", severity: "info" },
  { id: "a-004", timestamp: "2026-02-14 08:55:22", service: "Notification Hub", action: "Service Degraded", user: "system", details: "High memory usage detected: 88% utilization", severity: "error" },
  { id: "a-005", timestamp: "2026-02-14 08:42:10", service: "Portfolio Service", action: "Deployment", user: "deploy-bot", details: "Successfully deployed v2.2.0 to production", severity: "info" },
  { id: "a-006", timestamp: "2026-02-14 08:30:55", service: "Auth Service", action: "API Key Created", user: "admin@meridian.com", details: "New API key issued for Meridian Capital (prod-key-06)", severity: "info" },
  { id: "a-007", timestamp: "2026-02-14 08:12:33", service: "Risk Analyzer", action: "Threshold Alert", user: "system", details: "VaR threshold exceeded for portfolio PF-0042", severity: "warning" },
  { id: "a-008", timestamp: "2026-02-14 07:58:17", service: "Market Data", action: "Feed Reconnect", user: "system", details: "Bloomberg feed reconnected after 3s interruption", severity: "warning" },
  { id: "a-009", timestamp: "2026-02-14 07:45:00", service: "Report Generator", action: "Service Stopped", user: "admin@aurixa.io", details: "Report Generator stopped for maintenance", severity: "error" },
  { id: "a-010", timestamp: "2026-02-14 07:30:12", service: "API Gateway", action: "Config Update", user: "admin@aurixa.io", details: "Updated CORS policy for tenant Harbor Wealth", severity: "info" },
];

const serviceOptions = [
  "All Services",
  "API Gateway",
  "Auth Service",
  "Valuation Engine",
  "Market Data",
  "Risk Analyzer",
  "Portfolio Service",
  "Notification Hub",
  "Report Generator",
];

const severityColors: Record<string, string> = {
  info: "text-aurixa-400",
  warning: "text-accent-warning",
  error: "text-accent-error",
};

const severityDotColors: Record<string, string> = {
  info: "bg-aurixa-400",
  warning: "bg-accent-warning",
  error: "bg-accent-error",
};

export default function AuditPage() {
  const [serviceFilter, setServiceFilter] = useState("All Services");
  const [severityFilter, setSeverityFilter] = useState("all");

  const filteredLogs = mockAuditLogs.filter((log) => {
    const matchesService =
      serviceFilter === "All Services" || log.service === serviceFilter;
    const matchesSeverity =
      severityFilter === "all" || log.severity === severityFilter;
    return matchesService && matchesSeverity;
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Audit Log</h1>
        <p className="text-sm text-white/40 mt-1">
          System activity and security events
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <select
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
          className="bg-surface-secondary border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-aurixa-500/50"
        >
          {serviceOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>

        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="bg-surface-secondary border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-aurixa-500/50"
        >
          <option value="all">All Severities</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="error">Error</option>
        </select>

        <span className="text-xs text-white/30 ml-2">
          {filteredLogs.length} entries
        </span>
      </div>

      {/* Log Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-surface-secondary border border-white/5 rounded-xl overflow-hidden"
      >
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left px-5 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider">
                Timestamp
              </th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider">
                Service
              </th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider">
                Action
              </th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider">
                User
              </th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider">
                Details
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredLogs.map((log, i) => (
              <motion.tr
                key={log.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.02 }}
                className="hover:bg-white/[0.02] transition-colors"
              >
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={clsx(
                        "w-1.5 h-1.5 rounded-full flex-shrink-0",
                        severityDotColors[log.severity]
                      )}
                    />
                    <span className="text-xs font-mono text-white/50">
                      {log.timestamp}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3 text-sm text-white/70">
                  {log.service}
                </td>
                <td className="px-5 py-3">
                  <span
                    className={clsx(
                      "text-sm font-medium",
                      severityColors[log.severity]
                    )}
                  >
                    {log.action}
                  </span>
                </td>
                <td className="px-5 py-3 text-xs font-mono text-white/40">
                  {log.user}
                </td>
                <td className="px-5 py-3 text-xs text-white/40 max-w-xs truncate">
                  {log.details}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </div>
  );
}
