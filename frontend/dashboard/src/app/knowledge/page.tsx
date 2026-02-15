"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { getKnowledgeArticles, getAnalyticsSummary, getTenants, createKnowledgeArticle, type KnowledgeArticle } from "@/app/services/api";

export default function KnowledgePage() {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof getAnalyticsSummary>> | null>(null);
  const [tenants, setTenants] = useState<Awaited<ReturnType<typeof getTenants>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [tenantFilter, setTenantFilter] = useState<string>("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addForm, setAddForm] = useState({ title: "", content: "", tenant_id: 0 });

  const fetchData = () => {
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
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (tenants.length > 0 && addForm.tenant_id === 0) {
      const tid = parseInt(tenants[0].id.replace(/^t-/, ""), 10);
      if (!isNaN(tid)) setAddForm((f) => ({ ...f, tenant_id: tid }));
    }
  }, [tenants]);

  const handleAddArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.title.trim()) {
      setAddError("Title is required");
      return;
    }
    const tid = addForm.tenant_id || (tenants[0] ? parseInt(tenants[0].id.replace(/^t-/, ""), 10) : 1);
    if (!tid || tenants.length === 0) {
      setAddError("No tenants available. Create a tenant first.");
      return;
    }
    setAddSubmitting(true);
    setAddError(null);
    try {
      await createKnowledgeArticle({
        title: addForm.title.trim(),
        content: addForm.content.trim() || "No content",
        tenant_id: tid,
      });
      setShowAddModal(false);
      setAddForm({ title: "", content: "", tenant_id: tenants[0] ? parseInt(tenants[0].id.replace(/^t-/, ""), 10) : 0 });
      fetchData();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to create article");
    } finally {
      setAddSubmitting(false);
    }
  };

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
            RAG-indexed articles from the database. Each article belongs to a specific tenant. Used for context retrieval in pipelines.
          </p>
          {tenants.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {tenants.map((t) => {
                const count = articles.filter((a) => a.tenantId === parseInt(t.id.replace(/^t-/, ""), 10)).length;
                if (count === 0) return null;
                return (
                  <span
                    key={t.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-aurixa-600/20 text-aurixa-300 text-xs"
                  >
                    {t.name}: {count} articles
                  </span>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          {summary && (
            <>
              <div className="glass rounded-lg px-4 py-2">
                <p className="text-xs text-white/40">Articles</p>
                <p className="text-xl font-bold text-white">{summary.knowledge_articles_count}</p>
              </div>
              <div className="glass rounded-lg px-4 py-2">
                <p className="text-xs text-white/40">Tenants</p>
                <p className="text-xl font-bold text-white">{summary.tenants_count}</p>
              </div>
            </>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-aurixa-500/20 text-aurixa-300 hover:bg-aurixa-500/30 transition-colors text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Article
          </button>
        </div>
      </div>

      {/* Add Article Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => !addSubmitting && setShowAddModal(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="glass rounded-2xl p-6 w-full max-w-md border border-white/10"
          >
            <h2 className="text-xl font-semibold text-white mb-4">Add Knowledge Base Article</h2>
            <form onSubmit={handleAddArticle} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Title</label>
                <input
                  type="text"
                  value={addForm.title}
                  onChange={(e) => setAddForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Article title"
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-secondary/80 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-aurixa-500/50"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Content</label>
                <textarea
                  value={addForm.content}
                  onChange={(e) => setAddForm((f) => ({ ...f, content: e.target.value }))}
                  placeholder="Article content (used for RAG retrieval)"
                  rows={4}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-secondary/80 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-aurixa-500/50 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Tenant</label>
                <select
                  value={addForm.tenant_id || (tenants[0] ? parseInt(tenants[0].id.replace(/^t-/, ""), 10) : "")}
                  onChange={(e) => setAddForm((f) => ({ ...f, tenant_id: parseInt(e.target.value, 10) }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-secondary/80 border border-white/10 text-white focus:outline-none focus:border-aurixa-500/50"
                >
                  {tenants.map((t) => {
                    const tid = parseInt(t.id.replace(/^t-/, ""), 10);
                    return (
                      <option key={t.id} value={tid}>
                        {t.name}
                      </option>
                    );
                  })}
                </select>
              </div>
              {addError && <p className="text-sm text-accent-error">{addError}</p>}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => !addSubmitting && setShowAddModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-white/20 text-white/70 hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addSubmitting}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-aurixa-500/30 text-aurixa-300 hover:bg-aurixa-500/40 disabled:opacity-50 transition-colors font-medium"
                >
                  {addSubmitting ? "Creating…" : "Add Article"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

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
                          {tenants.find((t) => parseInt(t.id.replace(/^t-/, ""), 10) === a.tenantId)?.name ?? `Tenant #${a.tenantId}`}
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
