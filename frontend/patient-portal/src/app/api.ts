/** API client for AURIXA Patient Portal. */

const API_BASE =
  typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://localhost:3000")
    : (process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://localhost:3000");

const FETCH_TIMEOUT_MS = 8000;
const PIPELINE_TIMEOUT_MS = 120000;

async function fetchWithTimeout(url: string, opts: RequestInit = {}, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

export interface Appointment {
  id: number;
  startTime: string;
  endTime: string;
  providerName: string;
  status: string;
}

export interface Patient {
  id: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  tenantId?: number;
}

export interface KnowledgeArticle {
  id: number;
  title: string;
  content: string;
  tenantId?: number;
}

export async function getPatient(patientId: number): Promise<Patient> {
  const res = await fetchWithTimeout(`${API_BASE}/api/v1/admin/patients/${patientId}`);
  if (!res.ok) throw new Error("Failed to fetch patient");
  return res.json();
}

export async function getAppointments(patientId: number): Promise<Appointment[]> {
  const res = await fetchWithTimeout(`${API_BASE}/api/v1/admin/patients/${patientId}/appointments`);
  if (!res.ok) throw new Error("Failed to fetch appointments");
  return res.json();
}

export async function getKnowledgeArticles(tenantId?: number): Promise<KnowledgeArticle[]> {
  const url =
    tenantId != null
      ? `${API_BASE}/api/v1/admin/knowledge/articles?tenant_id=${tenantId}`
      : `${API_BASE}/api/v1/admin/knowledge/articles`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error("Failed to fetch knowledge articles");
  return res.json();
}

export interface PipelineResponse {
  session_id: string;
  final_response: string;
}

export interface ConversationSummary {
  id: number;
  sessionId: string;
  prompt: string;
  response: string;
  createdAt: string | null;
}

export async function getConversations(patientId: number): Promise<ConversationSummary[]> {
  const res = await fetchWithTimeout(
    `${API_BASE}/api/v1/admin/patients/${patientId}/conversations`,
    { method: "GET" }
  );
  if (!res.ok) return [];
  return res.json();
}

export async function sendMessage(
  prompt: string,
  patientId?: number
): Promise<PipelineResponse> {
  const body: Record<string, unknown> = { prompt };
  if (patientId != null) body.patient_id = patientId;
  const res = await fetchWithTimeout(
    `${API_BASE}/api/v1/orchestration/pipelines`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    PIPELINE_TIMEOUT_MS
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to get response: ${text}`);
  }
  return res.json();
}
