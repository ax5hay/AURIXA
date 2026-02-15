"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { getAnalytics, getAnalyticsSummary } from "@/app/services/api";

const AnalyticsCharts = dynamic(() => import("./AnalyticsCharts"), { ssr: false });

export default function AnalyticsPage() {
  const [data, setData] = useState<Awaited<ReturnType<typeof getAnalytics>> | null>(null);
  const [dbSummary, setDbSummary] = useState<Awaited<ReturnType<typeof getAnalyticsSummary>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getAnalytics().catch(() => null),
      getAnalyticsSummary().catch(() => null),
    ])
      .then(([obs, summary]) => {
        setData(obs);
        setDbSummary(summary);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  if (error) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Analytics</h1>
        <div className="glass rounded-xl p-6 text-accent-error border border-accent-error/30">{error}</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
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
      className="p-8 max-w-7xl mx-auto"
    >
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Analytics</h1>
        <p className="text-white/50 text-sm">
          Platform metrics, telemetry performance, and database insights.
        </p>
      </div>

      {/* Key metrics — compact hero strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
        <div className="glass rounded-xl p-4 border border-white/5">
          <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Conversations</p>
          <p className="text-2xl font-bold text-white mt-0.5">{(dbSummary?.conversations_total ?? 0).toLocaleString()}</p>
        </div>
        <div className="glass rounded-xl p-4 border border-white/5">
          <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Tenants</p>
          <p className="text-2xl font-bold text-white mt-0.5">{(dbSummary?.tenants_count ?? 0).toLocaleString()}</p>
        </div>
        <div className="glass rounded-xl p-4 border border-white/5">
          <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Patients</p>
          <p className="text-2xl font-bold text-white mt-0.5">{(dbSummary?.patients_count ?? 0).toLocaleString()}</p>
        </div>
        <div className="glass rounded-xl p-4 border border-white/5">
          <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Appointments</p>
          <p className="text-2xl font-bold text-white mt-0.5">{(dbSummary?.appointments_count ?? 0).toLocaleString()}</p>
        </div>
        <div className="glass rounded-xl p-4 border border-white/5">
          <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Knowledge</p>
          <p className="text-2xl font-bold text-white mt-0.5">{(dbSummary?.knowledge_articles_count ?? 0).toLocaleString()}</p>
        </div>
        <div className="glass rounded-xl p-4 border border-white/5">
          <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Audits</p>
          <p className="text-2xl font-bold text-white mt-0.5">{(dbSummary?.audit_entries_count ?? 0).toLocaleString()}</p>
        </div>
      </div>

      <AnalyticsCharts overall={overall} dbSummary={dbSummary} data={data} />
    </motion.div>
  );
}
