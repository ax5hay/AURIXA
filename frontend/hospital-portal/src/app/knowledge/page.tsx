"use client";

import { useState, useEffect } from "react";
import { getKnowledgeArticles, getTenants } from "../api";
import type { KnowledgeArticle } from "../api";

export default function KnowledgePage() {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [tenants, setTenants] = useState<{ id: string; name: string }[]>([]);
  const [tenantFilter, setTenantFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tid = tenantFilter ? parseInt(tenantFilter.replace(/^t-/, ""), 10) : undefined;
    getKnowledgeArticles(isNaN(tid as number) ? undefined : tid).then(setArticles).catch(() => []).finally(() => setLoading(false));
  }, [tenantFilter]);

  useEffect(() => {
    getTenants().then(setTenants).catch(() => []);
  }, []);

  const filtered = articles.filter(
    (a) =>
      !search.trim() ||
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.content.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <span className="inline-flex gap-1 mb-4">
          <span className="h-3 w-3 bg-hospital-400 rounded-full animate-pulse" />
          <span className="h-3 w-3 bg-hospital-400 rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
          <span className="h-3 w-3 bg-hospital-400 rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
        </span>
        <p className="text-white/50 text-sm">Loading knowledge base...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 -mt-6 pb-8">
      <div className="flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          placeholder="Search articles..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-xl bg-surface-secondary/80 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-hospital-500/50"
        />
        <select
          value={tenantFilter}
          onChange={(e) => setTenantFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-surface-secondary/80 border border-white/10 text-white"
        >
          <option value="">All tenants</option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>
      <p className="text-white/50 text-sm">{filtered.length} articles</p>
      {filtered.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <p className="text-white/50">No articles found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((a) => (
            <div key={a.id} className="glass rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
                className="w-full p-5 text-left hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-white">{a.title}</h3>
                    <p className="text-white/50 text-sm mt-1 line-clamp-1">{a.content.slice(0, 120)}...</p>
                  </div>
                  <svg className={`w-5 h-5 text-white/40 transition-transform ${expandedId === a.id ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>
              {expandedId === a.id && (
                <div className="px-5 pb-5 pt-0 border-t border-white/5">
                  <p className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap">{a.content}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
