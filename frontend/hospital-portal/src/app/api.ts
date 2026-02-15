/** API client for AURIXA Hospital Portal - staff interface. */

const API_BASE = process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://127.0.0.1:3000";
const FETCH_TIMEOUT_MS = 8000;
const PIPELINE_TIMEOUT_MS = 120000;

async function fetchWithTimeout(url: string, opts: RequestInit = {}, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}

export interface Patient {
  id: number;
  fullName: string;
  email?: string;
  phoneNumber?: string;
  tenantId?: number;
}

export interface Appointment {
  id: number;
  startTime: string;
  endTime: string;
  providerName: string;
  status: string;
  patientId?: number;
  tenantId?: number;
}

export interface KnowledgeArticle {
  id: number;
  title: string;
  content: string;
  tenantId?: number;
}

export interface Tenant {
  id: string;
  name: string;
  plan: string;
  status: string;
}

export interface PipelineResponse {
  session_id: string;
  final_response: string;
}

export interface ServiceHealth {
  [key: string]: { status: string; latencyMs?: number };
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

export async function getPatients(tenantId?: number): Promise<Patient[]> {
  const url = tenantId != null
    ? `${API_BASE}/api/v1/admin/patients?tenant_id=${tenantId}`
    : `${API_BASE}/api/v1/admin/patients`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error("Failed to fetch patients");
  return res.json();
}

export async function getPatient(patientId: number): Promise<Patient> {
  const res = await fetchWithTimeout(`${API_BASE}/api/v1/admin/patients/${patientId}`);
  if (!res.ok) throw new Error("Failed to fetch patient");
  return res.json();
}

export async function createPatient(data: { full_name: string; email?: string; phone_number?: string; tenant_id?: number }): Promise<Patient> {
  const res = await fetchWithTimeout(`${API_BASE}/api/v1/admin/patients`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create patient");
  return res.json();
}

export async function getAppointments(opts?: { tenantId?: number; dateFrom?: string; dateTo?: string }): Promise<Appointment[]> {
  const params = new URLSearchParams();
  if (opts?.tenantId) params.set("tenant_id", String(opts.tenantId));
  if (opts?.dateFrom) params.set("date_from", opts.dateFrom);
  if (opts?.dateTo) params.set("date_to", opts.dateTo);
  const qs = params.toString();
  const url = `${API_BASE}/api/v1/admin/appointments${qs ? `?${qs}` : ""}`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error("Failed to fetch appointments");
  return res.json();
}

export async function getPatientAppointments(patientId: number): Promise<Appointment[]> {
  const res = await fetchWithTimeout(`${API_BASE}/api/v1/admin/patients/${patientId}/appointments`);
  if (!res.ok) throw new Error("Failed to fetch appointments");
  return res.json();
}

export async function getKnowledgeArticles(tenantId?: number): Promise<KnowledgeArticle[]> {
  const url = tenantId != null
    ? `${API_BASE}/api/v1/admin/knowledge/articles?tenant_id=${tenantId}`
    : `${API_BASE}/api/v1/admin/knowledge/articles`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error("Failed to fetch knowledge");
  return res.json();
}

export async function getTenants(): Promise<Tenant[]> {
  const res = await fetchWithTimeout(`${API_BASE}/api/v1/admin/tenants`);
  if (!res.ok) throw new Error("Failed to fetch tenants");
  return res.json();
}

export async function sendMessage(prompt: string, opts?: { patientId?: number; tenantId?: string }): Promise<PipelineResponse> {
  const body: Record<string, unknown> = { prompt };
  if (opts?.patientId) body.patient_id = opts.patientId;
  if (opts?.tenantId) body.tenant_id = opts.tenantId;
  const res = await fetchWithTimeout(
    `${API_BASE}/api/v1/orchestration/pipelines`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    PIPELINE_TIMEOUT_MS
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pipeline failed: ${text}`);
  }
  return res.json();
}

export async function executeAction(actionName: string, params: Record<string, unknown>): Promise<{ status: string; result?: { message: string } }> {
  const res = await fetchWithTimeout(`${API_BASE}/api/v1/execute/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action_name: actionName, params }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function listExecutionActions(): Promise<{ actions: string[] }> {
  const res = await fetchWithTimeout(`${API_BASE}/api/v1/execute/actions`);
  if (!res.ok) return { actions: [] };
  return res.json();
}

export async function getServiceHealth(): Promise<ServiceHealth> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/health/services`);
    if (!res.ok) return {};
    const data = await res.json();
    return data.services ?? {};
  } catch {
    return {};
  }
}

export async function getAuditLog(limit = 30): Promise<AuditEntry[]> {
  const res = await fetchWithTimeout(`${API_BASE}/api/v1/admin/audit?limit=${limit}`);
  if (!res.ok) return [];
  return res.json();
}
