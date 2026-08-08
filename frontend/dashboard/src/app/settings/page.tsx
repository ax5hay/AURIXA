"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, Button, FieldShell, Input, PageHeader, Select, useToast } from "@aurixa/ui-kit";
import { getConfigDetail, updateConfigKey } from "@/app/services/api";
import { PageShell } from "@/components/OperatorCompositions";

const BOOLEAN_KEYS = [
  "feature_rag_enabled",
  "feature_voice_enabled",
  "feature_safety_guardrails",
  "maintenance_mode",
];
const NUMERIC_KEYS = [
  "rate_limit_per_minute",
  "max_conversations_per_tenant",
  "api_gateway_timeout_ms",
];

function Setting({
  category,
  name,
  value,
  onSaved,
}: {
  category: string;
  name: string;
  value: string;
  onSaved: (value: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      await onSaved(draft);
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="grid gap-3 border-b border-white/10 py-4 last:border-b-0 md:grid-cols-[minmax(0,1fr)_minmax(14rem,0.7fr)_auto] md:items-end">
      <div>
        <p className="text-xs capitalize text-white/40">{category.replace(/_/g, " ")}</p>
        <p className="mt-1 font-mono text-sm text-white">{name}</p>
      </div>
      <FieldShell label={`Value for ${name}`} className="[&_label]:sr-only">
        {BOOLEAN_KEYS.includes(name) ? (
          <Select value={draft} onChange={(event) => setDraft(event.target.value)}>
            <option value="true">Enabled (true)</option>
            <option value="false">Disabled (false)</option>
          </Select>
        ) : (
          <Input
            type={NUMERIC_KEYS.includes(name) ? "number" : "text"}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
        )}
      </FieldShell>
      <Button variant="secondary" onClick={save} disabled={saving || draft === value}>
        {saving ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}

export default function SettingsPage() {
  const { toast } = useToast();
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getConfigDetail>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      setDetail(await getConfigDetail());
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Settings could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const save = async (key: string, value: string) => {
    try {
      await updateConfigKey(key, value);
      await load();
      toast({ title: "Behavior updated", description: key, tone: "success" });
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Setting could not be saved.";
      toast({ title: "Save failed", description: message, tone: "error" });
      throw reason;
    }
  };
  const entries = Object.entries(detail?.categories ?? {}).flatMap(([category, values]) =>
    values.map((item) => ({ category, ...item })),
  );

  return (
    <PageShell className="max-w-5xl">
      <PageHeader
        eyebrow="System · editable"
        title="Behavior settings"
        description="Edit persisted platform behavior. Runtime endpoints, providers, and deployed facts are shown separately under Runtime facts."
      />
      {error && (
        <Alert title="Settings unavailable" tone="danger" className="mb-5">
          {error}
        </Alert>
      )}
      <Alert title="Changes affect platform behavior" tone="warning" className="mb-5">
        Values are written through the existing configuration API. Review each change before saving.
      </Alert>
      <div className="surface-card">
        {loading ? (
          <p className="py-8 text-center text-sm text-white/55">Loading behavior settings…</p>
        ) : entries.length ? (
          entries.map((entry) => (
            <Setting
              key={`${entry.category}-${entry.key}-${entry.value}`}
              category={entry.category}
              name={entry.key}
              value={entry.value}
              onSaved={(value) => save(entry.key, value)}
            />
          ))
        ) : (
          <p className="py-8 text-center text-sm text-white/55">
            No editable platform values were returned.
          </p>
        )}
      </div>
    </PageShell>
  );
}
