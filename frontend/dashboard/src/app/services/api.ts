// API client for AURIXA gateway.

const API_BASE = process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://localhost:3000";
const FETCH_TIMEOUT_MS = 8000;

async function fetchApi(path: string, opts: RequestInit = {}): Promise<Response> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
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
      ? `/api/v1/orchestration/knowledge/articles?tenant_id=${tenantId}`
      : "/api/v1/orchestration/knowledge/articles";
  const res = await fetchApi(path, FETCH_OPTS);
  if (!res.ok) throw new Error("Failed to fetch knowledge articles");
  return res.json();
}

export interface PipelineResponse {
  session_id: string;
  final_response: string;
  // Add other fields from the ConversationState as needed
}

export async function runPipeline(prompt: string): Promise<PipelineResponse> {
  const response = await fetchApi("/api/v1/orchestration/pipelines", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API request failed with status ${response.status}: ${errorBody}`);
  }

  return response.json();
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
