/** API client for AURIXA Patient Portal - all data from backend. */

const API_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://localhost:3000";

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
  const res = await fetch(`${API_URL}/api/v1/admin/patients/${patientId}`);
  if (!res.ok) throw new Error("Failed to fetch patient");
  return res.json();
}

export async function getAppointments(patientId: number): Promise<Appointment[]> {
  const res = await fetch(`${API_URL}/api/v1/admin/patients/${patientId}/appointments`);
  if (!res.ok) throw new Error("Failed to fetch appointments");
  return res.json();
}

export async function getKnowledgeArticles(tenantId?: number): Promise<KnowledgeArticle[]> {
  const url = tenantId != null
    ? `${API_URL}/api/v1/admin/knowledge/articles?tenant_id=${tenantId}`
    : `${API_URL}/api/v1/admin/knowledge/articles`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch knowledge articles");
  return res.json();
}

export interface PipelineResponse {
  session_id: string;
  final_response: string;
}

export async function sendMessage(prompt: string): Promise<PipelineResponse> {
  const res = await fetch(`${API_URL}/api/v1/orchestration/pipelines`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to get response: ${text}`);
  }
  return res.json();
}
