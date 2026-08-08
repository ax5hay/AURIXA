"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Accordion,
  Alert,
  Button,
  Dialog,
  EmptyState,
  ErrorSummary,
  FieldShell,
  PageHeader,
  SearchInput,
  Select,
  Textarea,
  Input,
  useToast,
} from "@aurixa/ui-kit";
import {
  createKnowledgeArticle,
  getKnowledgeArticles,
  getTenants,
  type KnowledgeArticle,
} from "@/app/services/api";
import { FilterBar, PageShell } from "@/components/OperatorCompositions";

export default function KnowledgePage() {
  const { toast } = useToast();
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [tenants, setTenants] = useState<Awaited<ReturnType<typeof getTenants>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [tenant, setTenant] = useState("");
  const [form, setForm] = useState({ title: "", content: "", tenantId: "" });
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const load = useCallback(async () => {
    const [articleResult, tenantResult] = await Promise.allSettled([
      getKnowledgeArticles(),
      getTenants(),
    ]);
    if (articleResult.status === "fulfilled") setArticles(articleResult.value);
    if (tenantResult.status === "fulfilled") setTenants(tenantResult.value);
    if (articleResult.status === "rejected" && tenantResult.status === "rejected")
      setError("Knowledge sources could not be loaded.");
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () =>
      articles.filter((article) => {
        const term = search.trim().toLowerCase();
        const tenantId = tenant ? Number(tenant.replace(/^t-/, "")) : null;
        return (
          (!term || `${article.title} ${article.content}`.toLowerCase().includes(term)) &&
          (tenantId == null || article.tenantId === tenantId)
        );
      }),
    [articles, search, tenant],
  );

  const submit = async () => {
    const errors = [];
    if (!form.title.trim()) errors.push("Title is required.");
    if (!form.tenantId) errors.push("Choose an organization.");
    if (errors.length) {
      setFormErrors(errors);
      return;
    }
    setSaving(true);
    setFormErrors([]);
    try {
      await createKnowledgeArticle({
        title: form.title.trim(),
        content: form.content.trim() || "No content",
        tenant_id: Number(form.tenantId.replace(/^t-/, "")),
      });
      setOpen(false);
      setForm({ title: "", content: "", tenantId: "" });
      await load();
      toast({ title: "Knowledge source added", tone: "success" });
    } catch (reason) {
      setFormErrors([reason instanceof Error ? reason.message : "The source could not be added."]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell className="max-w-6xl">
      <PageHeader
        eyebrow="Manage"
        title="Knowledge sources"
        description="Tenant-scoped content available to the existing retrieval pipeline."
        actions={<Button onClick={() => setOpen(true)}>Add source</Button>}
      />
      {error && (
        <Alert title="Knowledge unavailable" tone="danger" className="mb-5">
          {error}
        </Alert>
      )}
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Add knowledge source"
        description="Creates a tenant-scoped article through the existing knowledge API."
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={saving}>
              {saving ? "Adding…" : "Add source"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <ErrorSummary errors={formErrors} />
          <FieldShell label="Title" htmlFor="article-title" required>
            <Input
              id="article-title"
              value={form.title}
              onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))}
              autoFocus
            />
          </FieldShell>
          <FieldShell
            label="Content"
            htmlFor="article-content"
            hint="Content is sent to the existing retrieval source endpoint."
          >
            <Textarea
              id="article-content"
              value={form.content}
              onChange={(event) => setForm((value) => ({ ...value, content: event.target.value }))}
            />
          </FieldShell>
          <FieldShell label="Organization" htmlFor="article-tenant" required>
            <Select
              id="article-tenant"
              value={form.tenantId}
              onChange={(event) => setForm((value) => ({ ...value, tenantId: event.target.value }))}
            >
              <option value="">Choose an organization</option>
              {tenants.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </FieldShell>
        </div>
      </Dialog>
      <FilterBar result={`${filtered.length} of ${articles.length} sources`}>
        <SearchInput
          aria-label="Search knowledge sources"
          placeholder="Search title or content"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="sm:min-w-80"
        />
        <Select
          aria-label="Filter by organization"
          value={tenant}
          onChange={(event) => setTenant(event.target.value)}
          className="sm:max-w-64"
        >
          <option value="">All organizations</option>
          {tenants.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </Select>
      </FilterBar>
      {loading ? (
        <div className="surface-card py-12 text-center text-sm text-white/55">
          Loading knowledge sources…
        </div>
      ) : filtered.length ? (
        <div className="surface-card">
          <Accordion
            items={filtered.map((article) => ({
              id: String(article.id),
              title: article.title,
              content: (
                <>
                  <p className="whitespace-pre-wrap">{article.content}</p>
                  <p className="mt-3 text-xs text-ui-faint">
                    Organization:{" "}
                    {tenants.find((item) => Number(item.id.replace(/^t-/, "")) === article.tenantId)
                      ?.name ??
                      (article.tenantId == null ? "Not reported" : `Tenant ${article.tenantId}`)}
                  </p>
                </>
              ),
            }))}
          />
        </div>
      ) : (
        <EmptyState
          title="No matching knowledge sources"
          description={
            articles.length
              ? "Adjust search or organization filters."
              : "The API returned no sources."
          }
        />
      )}
    </PageShell>
  );
}
