// A simple client for calling the AURIXA API gateway.

const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://localhost:3000";
const FETCH_OPTS: RequestInit = { cache: "no-store" };

export interface Tenant {
  id: string;
  name: string;
  plan: string;
  status: string;
  apiKeys: number;
  created: string;
}

export async function getTenants(): Promise<Tenant[]> {
  const res = await fetch(`${API_GATEWAY_URL}/api/v1/admin/tenants`, FETCH_OPTS);
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
  const res = await fetch(`${API_GATEWAY_URL}/api/v1/admin/analytics/summary`, FETCH_OPTS);
  if (!res.ok) throw new Error("Failed to fetch analytics summary");
  return res.json();
}

export interface ConfigSummary {
  tenants_count: number;
  tenants_by_plan: Record<string, number>;
  tenants_by_status: Record<string, number>;
}

export async function getConfigSummary(): Promise<ConfigSummary> {
  const res = await fetch(`${API_GATEWAY_URL}/api/v1/admin/config/summary`, FETCH_OPTS);
  if (!res.ok) throw new Error("Failed to fetch config summary");
  return res.json();
}

export interface ConfigDetail {
  categories: Record<string, Array<{ key: string; value: string }>>;
}

export async function getConfigDetail(): Promise<ConfigDetail> {
  const res = await fetch(`${API_GATEWAY_URL}/api/v1/admin/config/detail`, FETCH_OPTS);
  if (!res.ok) throw new Error("Failed to fetch config detail");
  return res.json();
}

export interface PerformanceReport {
  overall_metrics: Record<string, { count: number; avg_latency_ms: number; p95_latency_ms: number; total_cost_usd?: number }>;
  service_metrics: Record<string, Record<string, { count: number; avg_latency_ms: number; p95_latency_ms: number; total_cost_usd?: number }>>;
}

export async function getAnalytics(): Promise<PerformanceReport> {
  const res = await fetch(`${API_GATEWAY_URL}/api/v1/observe/reports/performance`, FETCH_OPTS);
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
  const url = tenantId != null
    ? `${API_GATEWAY_URL}/api/v1/orchestration/knowledge/articles?tenant_id=${tenantId}`
    : `${API_GATEWAY_URL}/api/v1/orchestration/knowledge/articles`;
  const res = await fetch(url, FETCH_OPTS);
  if (!res.ok) throw new Error("Failed to fetch knowledge articles");
  return res.json();
}

export interface PipelineResponse {
  session_id: string;
  final_response: string;
  // Add other fields from the ConversationState as needed
}

export async function runPipeline(prompt: string): Promise<PipelineResponse> {
  const url = `${API_GATEWAY_URL}/api/v1/orchestration/pipelines`;

  const response = await fetch(url, {
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
  const url = `${API_GATEWAY_URL}/health/services`;
  const response = await fetch(url, FETCH_OPTS);
  if (!response.ok) {
    throw new Error("Failed to fetch service health.");
  }
  const data = await response.json();
  return data.services ?? {};
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
  const res = await fetch(`${API_GATEWAY_URL}/api/v1/admin/audit?limit=${limit}`, FETCH_OPTS);
  if (!res.ok) throw new Error("Failed to fetch audit log");
  return res.json();
}
