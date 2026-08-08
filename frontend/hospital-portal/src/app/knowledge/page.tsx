"use client";

import { useEffect, useState } from "react";
import {
  Accordion,
  Alert,
  Card,
  EmptyState,
  PageHeader,
  PageLoader,
  SearchInput,
} from "@aurixa/ui-kit";
import { getKnowledgeArticles, type KnowledgeArticle } from "../api";
import { useStaffContext } from "@/context/StaffContext";

export default function KnowledgePage() {
  const { tenantId } = useStaffContext();
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const tid = tenantId;

  useEffect(() => {
    setLoading(true);
    setFailed(false);
    getKnowledgeArticles(tid)
      .then(setArticles)
      .catch(() => {
        setArticles([]);
        setFailed(true);
      })
      .finally(() => setLoading(false));
  }, [tid]);

  const query = search.trim().toLowerCase();
  const filtered = articles.filter(
    (article) =>
      !query ||
      article.title.toLowerCase().includes(query) ||
      article.content.toLowerCase().includes(query),
  );

  if (loading) return <PageLoader label="Loading knowledge library" />;

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        eyebrow="Organizational guidance"
        title="Knowledge library"
        description="Search source articles returned by the knowledge service. Confirm guidance against current policy before care decisions."
        aside={
          <p className="text-xs font-semibold text-ui-muted">
            Source: verified organization #{tenantId}
          </p>
        }
      />
      {failed && (
        <Alert title="Knowledge service unavailable" tone="danger">
          No articles are shown. Try again after the service connection is restored.
        </Alert>
      )}
      <div>
        <SearchInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search titles and article text"
          aria-label="Search knowledge articles"
        />
      </div>
      <p className="text-sm text-ui-muted">{filtered.length} source articles</p>
      {filtered.length ? (
        <Card variant="compact" padding="lg">
          <Accordion
            items={filtered.map((article) => ({
              id: String(article.id),
              title: article.title,
              content: (
                <div>
                  <p className="whitespace-pre-wrap">{article.content}</p>
                  <p className="mt-4 border-t border-ui-border pt-3 text-xs font-semibold text-ui-faint">
                    Source article #{article.id}
                    {article.tenantId ? ` · Organization ${article.tenantId}` : ""}
                  </p>
                </div>
              ),
            }))}
          />
        </Card>
      ) : (
        <EmptyState
          title="No matching guidance"
          description="Try a broader search or a different organization context."
        />
      )}
    </div>
  );
}
