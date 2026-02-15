"use client";

import { useState, useEffect } from "react";
import { getServiceHealth, getAuditLog } from "../api";
import type { ServiceHealth, AuditEntry } from "../api";

function formatName(name: string) {
  return name.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function StatusPage() {
  const [health, setHealth] = useState<ServiceHealth>({});
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getServiceHealth().then(setHealth).catch(() => ({})),
      getAuditLog(20).then(setAudit).catch(() => []),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <span className="inline-flex gap-1 mb-4">
          <span className="h-3 w-3 bg-hospital-400 rounded-full animate-pulse" />
          <span className="h-3 w-3 bg-hospital-400 rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
          <span className="h-3 w-3 bg-hospital-400 rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
        </span>
        <p className="text-white/50 text-sm">Loading system status...</p>
      </div>
    );
  }

  const healthyCount = Object.values(health).filter((h) => h?.status === "healthy").length;
  const total = Object.keys(health).length || 1;

  return (
    <div className="space-y-6 -mt-6 pb-8">
      <div className="glass rounded-2xl p-6 glow-sm">
        <h2 className="text-lg font-semibold text-white mb-1">System Status</h2>
        <p className="text-white/60 text-sm">Services health and recent audit log</p>
      </div>

      <div className="glass rounded-xl p-6">
        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">Service Health</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(health).map(([name, info]) => (
            <div key={name} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-secondary/50 border border-white/5">
              <span className={`w-2.5 h-2.5 rounded-full ${info?.status === "healthy" ? "bg-green-500" : "bg-amber-500"}`} />
              <div>
                <p className="text-sm font-medium text-white">{formatName(name)}</p>
                <p className="text-xs text-white/40">
                  {info?.status ?? "unknown"}
                  {info?.latencyMs != null && ` · ${info.latencyMs}ms`}
                </p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-white/50 text-sm mt-4">{healthyCount}/{total} services healthy</p>
      </div>

      <div className="glass rounded-xl p-6">
        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">Recent Audit Log</h3>
        {audit.length === 0 ? (
          <p className="text-white/50 text-sm">No audit entries.</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {audit.map((a) => (
              <div key={a.id} className="flex items-start gap-3 p-3 rounded-xl bg-surface-secondary/40 border border-white/5 text-sm">
                <span className="text-white/40 font-mono shrink-0">{a.timestamp}</span>
                <div className="min-w-0">
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
  );
}
