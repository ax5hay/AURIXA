"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  CopyButton,
  DataTable,
  EmptyState,
  PageHeader,
  SectionHeader,
} from "@aurixa/ui-kit";
import { getConfigDetail, getLLMModels, getLLMProviders } from "@/app/services/api";
import { PageShell, StatusBadge } from "@/components/OperatorCompositions";

const API_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://localhost:3000";

export default function ConfigurationPage() {
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getConfigDetail>> | null>(null);
  const [providers, setProviders] = useState<Awaited<ReturnType<typeof getLLMProviders>>>([]);
  const [models, setModels] = useState<Awaited<ReturnType<typeof getLLMModels>>>({
    models: [],
    source: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const results = await Promise.allSettled([
      getConfigDetail(),
      getLLMProviders(),
      getLLMModels(),
    ]);
    if (results[0].status === "fulfilled") setDetail(results[0].value);
    if (results[1].status === "fulfilled") setProviders(results[1].value);
    if (results[2].status === "fulfilled") setModels(results[2].value);
    setError(
      results.every((result) => result.status === "rejected")
        ? "Runtime facts could not be loaded."
        : null,
    );
    setLoading(false);
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);

  const entries = Object.entries(detail?.categories ?? {}).flatMap(([category, values]) =>
    values.map((item) => ({ category, ...item })),
  );

  return (
    <PageShell>
      <PageHeader
        eyebrow="System · read-only"
        title="Runtime facts"
        description="Deployed endpoints, persisted values, and provider discovery. Changes are made in Behavior settings."
        actions={
          <Button variant="secondary" onClick={refresh} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh facts"}
          </Button>
        }
      />
      {error && (
        <Alert title="Runtime facts unavailable" tone="danger" className="mb-5">
          {error}
        </Alert>
      )}
      <section className="mb-8">
        <SectionHeader
          title="Gateway endpoint"
          description="The configured base URL used by this dashboard."
          action={<CopyButton value={API_URL} label="Copy URL" />}
        />
        <code className="block rounded-md border border-white/10 bg-[#07111f] p-4 text-sm text-teal-200">
          {API_URL}
        </code>
      </section>
      <section className="mb-8">
        <SectionHeader
          title="Provider discovery"
          description="Availability reported by the existing provider endpoint."
        />
        <div className="surface-card flex flex-wrap gap-3">
          {providers.length ? (
            providers.map((provider) => (
              <StatusBadge
                key={provider.id}
                status={provider.healthy ? "healthy" : "unknown"}
                label={`${provider.name} · ${provider.healthy ? "available" : "unavailable"}`}
              />
            ))
          ) : (
            <span className="text-sm text-white/55">No providers were returned.</span>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {models.models.map((model) => (
            <Badge key={model}>{model}</Badge>
          ))}
          {models.source && (
            <span className="self-center text-xs text-white/40">Source: {models.source}</span>
          )}
        </div>
      </section>
      <section>
        <SectionHeader
          title="Persisted platform values"
          description="Read-only facts from platform_config. Use Behavior settings to edit supported keys."
          count={entries.length}
        />
        {!loading && !entries.length ? (
          <EmptyState
            title="No platform values returned"
            description="No placeholder configuration is shown."
          />
        ) : (
          <DataTable
            caption="Persisted runtime configuration values"
            headers={["Category", "Key", "Value"]}
          >
            {loading ? (
              <tr>
                <td colSpan={3} className="table-cell py-10 text-center">
                  Loading runtime facts…
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr key={`${entry.category}-${entry.key}`}>
                  <td className="table-cell capitalize">{entry.category.replace(/_/g, " ")}</td>
                  <td className="table-cell font-mono text-xs text-white">{entry.key}</td>
                  <td className="table-cell break-all font-mono text-xs text-teal-200">
                    {entry.value}
                  </td>
                </tr>
              ))
            )}
          </DataTable>
        )}
      </section>
    </PageShell>
  );
}
