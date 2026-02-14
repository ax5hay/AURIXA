"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { getAuditLog, type AuditEntry } from "@/app/services/api";

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
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serviceFilter, setServiceFilter] = useState("All Services");
  const [severityFilter, setSeverityFilter] = useState("all");

  useEffect(() => {
    getAuditLog()
      .then(setLogs)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  const serviceOptions = ["All Services", ...Array.from(new Set(logs.map((l) => l.service)))].sort((a, b) => (a === "All Services" ? -1 : a.localeCompare(b)));
  const filteredLogs = logs.filter((log) => {
    const matchesService = serviceFilter === "All Services" || log.service === serviceFilter;
    const matchesSeverity = severityFilter === "all" || log.severity === severityFilter;
    return matchesService && matchesSeverity;
  });

  if (error) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Audit Log</h1>
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
      <h1 className="text-3xl font-bold text-white mb-2">Audit Log</h1>
      <p className="text-white/50 text-sm mb-8">System activity and security events</p>

      <div className="flex items-center gap-3 mb-6">
        <select
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-surface-secondary/80 border border-white/10 text-white focus:outline-none focus:border-aurixa-500/50"
        >
          {serviceOptions.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-surface-secondary/80 border border-white/10 text-white focus:outline-none focus:border-aurixa-500/50"
        >
          <option value="all">All Severities</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="error">Error</option>
        </select>
        <span className="text-xs text-white/30 ml-2">{filteredLogs.length} entries</span>
      </div>

      <div className="glass rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left px-5 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider">Timestamp</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider">Service</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider">Action</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider">User</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-white/50">Loading audit log...</td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-white/50">No audit entries</td>
              </tr>
            ) : (
              filteredLogs.map((log, i) => (
                <motion.tr
                  key={log.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", severityDotColors[log.severity] || "bg-white/30")} />
                      <span className="text-xs font-mono text-white/50">{log.timestamp}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-white/70">{log.service}</td>
                  <td className="px-5 py-3">
                    <span className={cn("text-sm font-medium", severityColors[log.severity] || "text-white/70")}>{log.action}</span>
                  </td>
                  <td className="px-5 py-3 text-xs font-mono text-white/40">{log.user}</td>
                  <td className="px-5 py-3 text-xs text-white/40 max-w-xs truncate">{log.details}</td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
