"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { getConfigSummary, getConfigDetail, getServiceHealth, updateConfigKey } from "@/app/services/api";

const API_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://localhost:3000";

const BOOLEAN_KEYS = ["feature_rag_enabled", "feature_voice_enabled", "feature_safety_guardrails", "maintenance_mode"];
const NUMERIC_KEYS = ["rate_limit_per_minute", "max_conversations_per_tenant", "api_gateway_timeout_ms"];

function ConfigRow({
  keyName,
  value,
  category,
  onSave,
}: {
  keyName: string;
  value: string;
  category: string;
  onSave: (key: string, value: string) => Promise<void>;
}) {
  const [editValue, setEditValue] = useState(value);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const isBoolean = BOOLEAN_KEYS.includes(keyName);
  const isNumeric = NUMERIC_KEYS.includes(keyName);

  const handleSave = async () => {
    if (editValue === value) return;
    setSaving(true);
    try {
      await onSave(keyName, editValue);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 rounded-lg bg-surface-secondary/50 border border-white/5">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-white/40 capitalize">{category}</p>
        <p className="text-sm font-medium text-white/80 truncate" title={keyName}>{keyName}</p>
      </div>
      <div className="flex items-center gap-2">
        {isBoolean ? (
          <select
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-surface-secondary/80 border border-white/10 text-white text-sm focus:outline-none focus:border-aurixa-500/50"
          >
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        ) : (
          <input
            type={isNumeric ? "number" : "text"}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-surface-secondary/80 border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-aurixa-500/50 w-32"
          />
        )}
        <button
          onClick={handleSave}
          disabled={saving || editValue === value}
          className="px-3 py-1.5 rounded-lg bg-aurixa-600/30 text-aurixa-300 text-xs font-medium hover:bg-aurixa-600/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? "..." : saved ? "Saved" : "Save"}
        </button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [config, setConfig] = useState<Awaited<ReturnType<typeof getConfigSummary>> | null>(null);
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getConfigDetail>> | null>(null);
  const [health, setHealth] = useState<Awaited<ReturnType<typeof getServiceHealth>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = () => {
    Promise.all([
      getConfigSummary().catch(() => null),
      getConfigDetail().catch(() => null),
      getServiceHealth().catch(() => null),
    ])
      .then(([c, d, h]) => {
        setConfig(c);
        setDetail(d);
        setHealth(h);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleConfigSave = async (key: string, value: string) => {
    await updateConfigKey(key, value);
    if (detail?.categories) {
      for (const cat of Object.keys(detail.categories)) {
        const idx = detail.categories[cat].findIndex((e) => e.key === key);
        if (idx >= 0) {
          detail.categories[cat][idx].value = value;
          setDetail({ ...detail });
          break;
        }
      }
    }
  };

  if (error) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Settings</h1>
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
      <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
      <p className="text-white/50 text-sm mb-8">Platform configuration and service status</p>

      {loading ? (
        <div className="glass rounded-xl p-8 text-center text-white/50">Loading...</div>
      ) : (
        <div className="space-y-6">
          <div className="glass rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white/80 mb-4">API Endpoint</h2>
            <code className="block px-4 py-2 rounded-lg bg-surface-secondary/80 text-aurixa-400 text-sm font-mono break-all">
              {API_URL}
            </code>
            <p className="text-xs text-white/40 mt-2">Gateway used for orchestration, observability, and admin APIs</p>
          </div>

          <div className="glass rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white/80 mb-4">Service Health</h2>
            {health && Object.keys(health).length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(health).map(([name, info]) => (
                  <div
                    key={name}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg bg-surface-secondary/50 border border-white/5"
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        info?.status === "healthy" ? "bg-accent-success" : "bg-accent-warning"
                      }`}
                    />
                    <div>
                      <p className="text-sm font-medium text-white/80">{name}</p>
                      <p className="text-xs text-white/40">
                        {info?.status ?? "unknown"}
                        {info?.latencyMs != null && ` · ${info.latencyMs}ms`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/50 text-sm">No service health data available. Ensure the API gateway is running.</p>
            )}
          </div>

          {config && (
            <div className="glass rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white/80 mb-4">Tenant Distribution</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-2xl font-bold text-white">{config.tenants_count}</p>
                  <p className="text-xs text-white/40">Total</p>
                </div>
                {Object.entries(config.tenants_by_plan ?? {}).map(([plan, n]) => (
                  <div key={plan}>
                    <p className="text-2xl font-bold text-white">{n}</p>
                    <p className="text-xs text-white/40 capitalize">{plan}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-white/5">
                <p className="text-sm text-white/50">
                  By status:{" "}
                  {Object.entries(config.tenants_by_status ?? {})
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(", ")}
                </p>
              </div>
            </div>
          )}

          {detail && Object.keys(detail.categories ?? {}).length > 0 && (
            <div className="glass rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white/80 mb-2">Platform Config</h2>
              <p className="text-sm text-white/50 mb-4">Edit values and click Save to update. Changes are persisted to the database.</p>
              <div className="space-y-3">
                {Object.entries(detail.categories).flatMap(([category, entries]) =>
                  entries.map(({ key, value }) => (
                    <ConfigRow
                      key={`${category}-${key}`}
                      keyName={key}
                      value={value}
                      category={category}
                      onSave={handleConfigSave}
                    />
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
