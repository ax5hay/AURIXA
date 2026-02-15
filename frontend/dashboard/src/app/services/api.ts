// API client for AURIXA gateway.

const API_BASE = process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://localhost:3000";
const FETCH_TIMEOUT_MS = 8000;
/** LLM pipeline calls: RAG + LLM can take 2–3 min; LM Studio slow on first token. */
const PIPELINE_TIMEOUT_MS = 180000;

async function fetchApi(
  path: string,
  opts: RequestInit = {},
  timeoutMs: number = FETCH_TIMEOUT_MS
): Promise<Response> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(`${API_BASE}${path}`, {
      ...opts,
      cache: "no-store",
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(id);
  }
}

const FETCH_OPTS: RequestInit = {};

export interface Tenant {
  id: string;
  name: string;
  plan: string;
  status: string;
  apiKeys: number;
  created: string;
}

export async function getTenants(): Promise<Tenant[]> {
  const res = await fetchApi("/api/v1/admin/tenants", FETCH_OPTS);
  if (!res.ok) throw new Error("Failed to fetch tenants");
  return res.json();
}

export async function createTenant(data: { name: string; plan?: string; status?: string }): Promise<{ id: string; name: string; plan: string; status: string }> {
  const res = await fetchApi("/api/v1/admin/tenants", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: data.name, plan: data.plan ?? "starter", status: data.status ?? "active" }),
  });
  if (!res.ok) throw new Error("Failed to create tenant");
  return res.json();
}

export async function getTenant(id: string): Promise<Tenant> {
  const res = await fetchApi(`/api/v1/admin/tenants/${encodeURIComponent(id)}`, FETCH_OPTS);
  if (!res.ok) throw new Error("Failed to fetch tenant");
  return res.json();
}

export async function updateTenant(
  id: string,
  data: { name?: string; plan?: string; status?: string }
): Promise<Tenant> {
  const res = await fetchApi(`/api/v1/admin/tenants/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update tenant");
  const updated = await res.json();
  return {
    ...updated,
    apiKeys: (updated as Tenant).apiKeys ?? 0,
    created: (updated as Tenant).created ?? "",
  };
}

export async function createPatient(data: { full_name: string; email?: string; phone_number?: string; tenant_id?: number }): Promise<PatientSummary> {
  const res = await fetchApi("/api/v1/admin/patients", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create patient");
  return res.json();
}

export interface PatientSummary {
  id: number;
  fullName: string;
  email?: string;
  phoneNumber?: string;
}

export async function getPatients(): Promise<PatientSummary[]> {
  const res = await fetchApi("/api/v1/admin/patients", FETCH_OPTS);
  if (!res.ok) return [];
  return res.json();
}

export interface AnalyticsSummary {
  conversations_total: number;
  tenants_count: number;
  audit_entries_count: number;
  knowledge_articles_count: number;
  patients_count: number;
  appointments_count: number;
}

export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const res = await fetchApi("/api/v1/admin/analytics/summary", FETCH_OPTS);
  if (!res.ok) throw new Error("Failed to fetch analytics summary");
  return res.json();
}

export interface ConfigSummary {
  tenants_count: number;
  tenants_by_plan: Record<string, number>;
  tenants_by_status: Record<string, number>;
}

export async function getConfigSummary(): Promise<ConfigSummary> {
  const res = await fetchApi("/api/v1/admin/config/summary", FETCH_OPTS);
  if (!res.ok) throw new Error("Failed to fetch config summary");
  return res.json();
}

export interface ConfigDetail {
  categories: Record<string, Array<{ key: string; value: string }>>;
}

export async function getConfigDetail(): Promise<ConfigDetail> {
  const res = await fetchApi("/api/v1/admin/config/detail", FETCH_OPTS);
  if (!res.ok) throw new Error("Failed to fetch config detail");
  return res.json();
}

export async function updateConfigKey(key: string, value: string): Promise<{ key: string; value: string }> {
  const res = await fetchApi(`/api/v1/admin/config/${encodeURIComponent(key)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value }),
  });
  if (!res.ok) throw new Error("Failed to update config");
  return res.json();
}

export interface PerformanceReport {
  overall_metrics: Record<string, { count: number; avg_latency_ms: number; p95_latency_ms: number; total_cost_usd?: number }>;
  service_metrics: Record<string, Record<string, { count: number; avg_latency_ms: number; p95_latency_ms: number; total_cost_usd?: number }>>;
}

export async function getAnalytics(): Promise<PerformanceReport> {
  const res = await fetchApi("/api/v1/observe/reports/performance", FETCH_OPTS);
  if (!res.ok) throw new Error("Failed to fetch analytics");
  return res.json();
}

export interface KnowledgeArticle {
  id: number;
  title: string;
  content: string;
  tenantId?: number;
}

export async function getKnowledgeArticles(tenantId?: number): Promise<KnowledgeArticle[]> {
  const path =
    tenantId != null
      ? `/api/v1/admin/knowledge/articles?tenant_id=${tenantId}`
      : "/api/v1/admin/knowledge/articles";
  const res = await fetchApi(path, FETCH_OPTS);
  if (!res.ok) throw new Error("Failed to fetch knowledge articles");
  return res.json();
}

export async function createKnowledgeArticle(data: {
  title: string;
  content: string;
  tenant_id: number;
}): Promise<KnowledgeArticle> {
  const res = await fetchApi("/api/v1/admin/knowledge/articles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create knowledge article");
  return res.json();
}

export interface PipelineResponse {
  session_id: string;
  final_response: string;
  // Add other fields from the ConversationState as needed
}

export interface PipelineRequest {
  prompt: string;
  patient_id?: number;
  session_id?: string;
  tenant_id?: string;
  user_id?: string;
}

export async function runPipeline(
  prompt: string,
  opts?: { patient_id?: number; session_id?: string; tenant_id?: string }
): Promise<PipelineResponse> {
  const body: PipelineRequest = { prompt };
  if (opts?.patient_id != null) body.patient_id = opts.patient_id;
  if (opts?.session_id) body.session_id = opts.session_id;
  if (opts?.tenant_id) body.tenant_id = opts.tenant_id;

  const response = await fetchApi(
    "/api/v1/orchestration/pipelines",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    PIPELINE_TIMEOUT_MS
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API request failed with status ${response.status}: ${errorBody}`);
  }

  return response.json();
}

export async function routeIntent(prompt: string) {
  const res = await fetchApi("/api/v1/llm/route", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function retrieveRAG(prompt: string, topK = 5) {
  const res = await fetchApi("/api/v1/rag/retrieve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, top_k: topK }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function validateSafety(text: string) {
  const res = await fetchApi("/api/v1/safety/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function runAgentTask(prompt: string, patientId?: number) {
  const task: { prompt: string; metadata?: { patient_id?: number } } = { prompt };
  if (patientId != null) task.metadata = { patient_id: patientId };
  const res = await fetchApi("/api/v1/agents/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function executeAction(actionName: string, params: Record<string, unknown>) {
  const res = await fetchApi("/api/v1/execute/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action_name: actionName, params }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function listExecutionActions() {
  const res = await fetchApi("/api/v1/execute/actions");
  if (!res.ok) return { actions: [] };
  return res.json();
}

export interface ServiceHealth {
  [key: string]: {
    status: string;
    latencyMs?: number;
  };
}

export async function getServiceHealth(): Promise<ServiceHealth> {
  try {
    const response = await fetchApi("/health/services", FETCH_OPTS);
    if (!response.ok) return {};
    const data = await response.json();
    return data.services ?? {};
  } catch {
    return {};
  }
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  service: string;
  action: string;
  user: string;
  details: string;
  severity: string;
}

export async function getAuditLog(limit = 50): Promise<AuditEntry[]> {
  const res = await fetchApi(`/api/v1/admin/audit?limit=${limit}`, FETCH_OPTS);
  if (!res.ok) throw new Error("Failed to fetch audit log");
  return res.json();
}

export interface LLMProviderInfo {
  id: string;
  name: string;
  healthy: boolean;
}

export async function getLLMProviders(): Promise<LLMProviderInfo[]> {
  const res = await fetchApi("/api/v1/llm/providers", FETCH_OPTS);
  if (!res.ok) return [];
  const data = await res.json();
  return data.providers ?? [];
}

export interface LLMModelsResponse {
  models: string[];
  source: string;
}

export async function getLLMModels(): Promise<LLMModelsResponse> {
  const res = await fetchApi("/api/v1/llm/models", FETCH_OPTS);
  if (!res.ok) return { models: [], source: "static" };
  return res.json();
}
