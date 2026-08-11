"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { getAnalytics, getAnalyticsSummary, type AnalyticsSummary } from "@/app/services/api";

const AnalyticsCharts = dynamic(() => import("./AnalyticsCharts"), { ssr: false });

function domainCount(
  summary: AnalyticsSummary | null | undefined,
  primary: keyof AnalyticsSummary,
  legacy?: keyof AnalyticsSummary,
): number {
  const value = summary?.[primary];
  if (typeof value === "number") return value;
  if (legacy) {
    const fallback = summary?.[legacy];
    if (typeof fallback === "number") return fallback;
  }
  return 0;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Awaited<ReturnType<typeof getAnalytics>> | null>(null);
  const [dbSummary, setDbSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getAnalytics().catch(() => null), getAnalyticsSummary().catch(() => null)])
      .then(([obs, summary]) => {
        setData(obs);
        setDbSummary(summary);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  if (error) {
    return (
      <div className="page-container">
        <h1 className="text-3xl font-bold text-white mb-8">Analytics</h1>
        <div className="glass rounded-xl p-6 text-accent-error border border-accent-error/30">
          {error}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-container">
        <h1 className="text-3xl font-bold text-white mb-8">Analytics</h1>
        <div className="glass rounded-xl p-8 text-center text-white/50">Loading analytics...</div>
      </div>
    );
  }

  const overall = data?.overall_metrics ?? {};

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="page-container"
    >
      <div className="page-header">
        <div>
          <p className="eyebrow">Investigate</p>
          <h1 className="display-title">Usage and performance</h1>
          <p className="page-description">
            Reported platform activity, real estate domain records, latency, and estimated cost.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="metric-card">
          <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">
            Conversations
          </p>
          <p className="text-2xl font-bold text-white mt-0.5">
            {(dbSummary?.conversations_total ?? 0).toLocaleString()}
          </p>
        </div>
        <div className="metric-card">
          <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">
            Organizations
          </p>
          <p className="text-2xl font-bold text-white mt-0.5">
            {(dbSummary?.tenants_count ?? 0).toLocaleString()}
          </p>
        </div>
        <div className="metric-card">
          <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">
            Clients
          </p>
          <p className="text-2xl font-bold text-white mt-0.5">
            {domainCount(dbSummary, "clients_count", "patients_count").toLocaleString()}
          </p>
        </div>
        <div className="metric-card">
          <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">
            Showings
          </p>
          <p className="text-2xl font-bold text-white mt-0.5">
            {domainCount(dbSummary, "showings_count", "appointments_count").toLocaleString()}
          </p>
        </div>
        <div className="metric-card">
          <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">
            Listings
          </p>
          <p className="text-2xl font-bold text-white mt-0.5">
            {(dbSummary?.listings_count ?? 0).toLocaleString()}
          </p>
        </div>
        <div className="metric-card">
          <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">
            Leads
          </p>
          <p className="text-2xl font-bold text-white mt-0.5">
            {(dbSummary?.leads_count ?? 0).toLocaleString()}
          </p>
        </div>
        <div className="glass rounded-xl p-4 border border-white/5">
          <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">
            Knowledge
          </p>
          <p className="text-2xl font-bold text-white mt-0.5">
            {(dbSummary?.knowledge_articles_count ?? 0).toLocaleString()}
          </p>
        </div>
        <div className="glass rounded-xl p-4 border border-white/5">
          <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Audits</p>
          <p className="text-2xl font-bold text-white mt-0.5">
            {(dbSummary?.audit_entries_count ?? 0).toLocaleString()}
          </p>
        </div>
      </div>

      <AnalyticsCharts overall={overall} dbSummary={dbSummary} data={data} />
    </motion.div>
  );
}
