"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { getKnowledgeArticles, getAnalyticsSummary, getTenants, type KnowledgeArticle } from "@/app/services/api";

export default function KnowledgePage() {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof getAnalyticsSummary>> | null>(null);
  const [tenants, setTenants] = useState<Awaited<ReturnType<typeof getTenants>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [tenantFilter, setTenantFilter] = useState<string>("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      getKnowledgeArticles().catch(() => []),
      getAnalyticsSummary().catch(() => null),
      getTenants().catch(() => []),
    ])
      .then(([a, s, t]) => {
        setArticles(a);
        setSummary(s);
        setTenants(t);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = articles;
    if (tenantFilter) {
      const tid = parseInt(tenantFilter.replace(/^t-/, ""), 10);
      if (!isNaN(tid)) list = list.filter((a) => a.tenantId === tid);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((a) => a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q));
    }
    return list;
  }, [articles, search, tenantFilter]);

  if (error) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Knowledge Base</h1>
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Knowledge Base</h1>
          <p className="text-white/50 text-sm">
            RAG-indexed articles from the database. Used for context retrieval in pipelines.
          </p>
        </div>
        {summary && (
          <div className="flex gap-4">
            <div className="glass rounded-lg px-4 py-2">
              <p className="text-xs text-white/40">Articles</p>
              <p className="text-xl font-bold text-white">{summary.knowledge_articles_count}</p>
            </div>
            <div className="glass rounded-lg px-4 py-2">
              <p className="text-xs text-white/40">Tenants</p>
              <p className="text-xl font-bold text-white">{summary.tenants_count}</p>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="glass rounded-xl p-12 text-center text-white/50">Loading knowledge base...</div>
      ) : (
        <>
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              placeholder="Search articles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 max-w-md px-4 py-2.5 rounded-xl bg-surface-secondary/80 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-aurixa-500/50"
            />
            <select
              value={tenantFilter}
              onChange={(e) => setTenantFilter(e.target.value)}
              className="px-4 py-2.5 rounded-xl bg-surface-secondary/80 border border-white/10 text-white focus:outline-none focus:border-aurixa-500/50"
            >
              <option value="">All tenants</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <p className="text-xs text-white/40 mb-4">
            {filtered.length} of {articles.length} articles
          </p>

          {filtered.length === 0 ? (
            <div className="glass rounded-xl p-12 text-center">
              <p className="text-white/60 mb-2">No articles found</p>
              <p className="text-sm text-white/40">
                {articles.length === 0 ? "Run the database seed to populate the knowledge base." : "Try a different search term."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((a, i) => (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="glass rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
                    className="w-full flex items-center justify-between p-6 text-left hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-white truncate">{a.title}</h3>
                      <p className="text-sm text-white/50 mt-1">
                        {a.content.slice(0, 100)}
                        {a.content.length > 100 && "..."}
                      </p>
                      {a.tenantId != null && (
                        <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded bg-aurixa-600/20 text-aurixa-400">
                          Tenant #{a.tenantId}
                        </span>
                      )}
                    </div>
                    <svg
                      className={cn("w-5 h-5 text-white/40 flex-shrink-0 ml-4 transition-transform", expandedId === a.id && "rotate-180")}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {expandedId === a.id && (
                    <div className="px-6 pb-6 pt-0">
                      <div className="border-t border-white/5 pt-4">
                        <p className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap">{a.content}</p>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
