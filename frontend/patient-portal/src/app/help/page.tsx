"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getKnowledgeArticles, type KnowledgeArticle } from "../api";

function IconChat() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

export default function HelpPage() {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getKnowledgeArticles(1).then(setArticles).catch(() => []).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 -mt-6">
        <span className="inline-flex gap-1 mb-4">
          <span className="h-3 w-3 bg-aurixa-400 rounded-full animate-pulse" />
          <span className="h-3 w-3 bg-aurixa-400 rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
          <span className="h-3 w-3 bg-aurixa-400 rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
        </span>
        <p className="text-white/50 text-sm">Loading help articles...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 -mt-6 pb-8">
      <div className="glass rounded-2xl p-6 glow-sm">
        <h2 className="text-lg font-semibold text-white mb-1">Help & FAQ</h2>
        <p className="text-white/60 text-sm">Frequently asked questions and helpful information from your care provider.</p>
      </div>
      {articles.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <p className="text-white/50">No help articles available.</p>
          <p className="text-white/30 text-sm mt-2">Ask the AI assistant for general healthcare questions.</p>
          <Link
            href="/chat"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-aurixa-500/80 hover:bg-aurixa-600 text-white text-sm font-medium"
          >
            <IconChat />
            Open chat
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {articles.map((a) => (
            <details
              key={a.id}
              className="group glass rounded-xl overflow-hidden glass-hover"
            >
              <summary className="cursor-pointer p-5 font-semibold text-white flex items-center justify-between list-none">
                {a.title}
                <span className="text-aurixa-400 group-open:rotate-180 transition-transform">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </summary>
              <div className="px-5 pb-5 pt-0">
                <p className="text-white/70 text-sm leading-relaxed">{a.content}</p>
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
