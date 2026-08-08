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
  Select,
} from "@aurixa/ui-kit";
import { getKnowledgeArticles, getTenants, type KnowledgeArticle } from "../api";
import { useStaffContext } from "@/context/StaffContext";

function parseTenantId(value: string): number | undefined {
  const parsed = parseInt(value.replace(/^t-0*/, ""), 10);
  return value && !isNaN(parsed) ? parsed : undefined;
}

export default function KnowledgePage() {
  const { tenantFilter, setTenantFilter, tenantId } = useStaffContext();
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [tenants, setTenants] = useState<{ id: string; name: string }[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const tid = tenantId ?? parseTenantId(tenantFilter);
  const selectedTenant = tenants.find((tenant) => tenant.id === tenantFilter);

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

  useEffect(() => {
    getTenants()
      .then(setTenants)
      .catch(() => setTenants([]));
  }, []);

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
            Source: {selectedTenant?.name ?? "All organizations"}
          </p>
        }
      />
      {failed && (
        <Alert title="Knowledge service unavailable" tone="danger">
          No articles are shown. Try again after the service connection is restored.
        </Alert>
      )}
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_16rem]">
        <SearchInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search titles and article text"
          aria-label="Search knowledge articles"
        />
        <Select
          value={tenantFilter}
          onChange={(event) => setTenantFilter(event.target.value)}
          aria-label="Filter knowledge by organization"
        >
          <option value="">All organizations</option>
          {tenants.map((tenant) => (
            <option key={tenant.id} value={tenant.id}>
              {tenant.name}
            </option>
          ))}
        </Select>
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
