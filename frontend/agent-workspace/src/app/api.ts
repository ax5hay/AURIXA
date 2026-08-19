/** API client for AURIXA Agent Workspace — staff/agent interface. */

const API_BASE = "/api/workspace";
const FETCH_TIMEOUT_MS = 8000;
const PIPELINE_TIMEOUT_MS = 120000;

async function fetchWithTimeout(
  url: string,
  opts: RequestInit = {},
  timeoutMs = FETCH_TIMEOUT_MS,
): Promise<Response> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}

export interface ClientSearchPreferences {
  budget_max?: number;
  beds_min?: number;
  areas?: string[];
  pets?: boolean;
}

export interface Client {
  id: number;
  fullName: string;
  email?: string;
  phoneNumber?: string;
  tenantId?: number;
  clientType?: string;
  preferences?: ClientSearchPreferences;
  notes?: string;
  lastContactAt?: string;
}

export interface Showing {
  id: number;
  startTime: string;
  endTime: string;
  agentName: string;
  providerName?: string;
  status: string;
  clientId?: number;
  patientId?: number;
  tenantId?: number;
  notes?: string;
  postShowingNotes?: string;
  listingId?: number;
}

export interface Lead {
  id: number;
  fullName: string;
  email?: string;
  phoneNumber?: string;
  stage?: string;
  source?: string;
  tenantId?: number;
  clientId?: number;
  daysStale?: number;
  lastContactedAt?: string;
}

export interface OvernightActivityItem {
  type: string;
  id: number;
  clientId?: number | null;
  summary: string;
  at?: string | null;
}

export interface SafetyEscalation {
  id: number;
  clientId?: number | null;
  clientName?: string | null;
  escalationType?: string | null;
  sourceText: string;
  status: string;
  createdAt?: string | null;
}

export interface StaleActivity {
  staleLeads: Lead[];
  coldClients: Array<{
    id: number;
    fullName: string;
    daysCold: number;
    lastShowingAt?: string | null;
    lastShowingStatus?: string;
  }>;
}

export interface Listing {
  id: number;
  marketingTitle?: string;
  status?: string;
  listPrice?: number;
  rentAmount?: number;
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

export interface Staff {
  id: number;
  fullName: string;
  email: string;
  role: string;
  tenantId: number;
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

export async function getClients(tenantId?: number): Promise<Client[]> {
  const url =
    tenantId != null
      ? `${API_BASE}/admin/clients?tenant_id=${tenantId}`
      : `${API_BASE}/admin/clients`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error("Failed to fetch clients");
  return res.json();
}

export async function getClient(clientId: number, expectedTenantId?: number): Promise<Client> {
  const res = await fetchWithTimeout(`${API_BASE}/admin/clients/${clientId}`);
  if (!res.ok) throw new Error("Failed to fetch client");
  const client = (await res.json()) as Client;
  if (expectedTenantId != null && client.tenantId !== expectedTenantId) {
    throw new Error("Client is outside the verified organization scope");
  }
  return client;
}

export async function createClient(data: {
  full_name: string;
  email?: string;
  phone_number?: string;
  tenant_id?: number;
}): Promise<Client> {
  const res = await fetchWithTimeout(`${API_BASE}/admin/clients`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create client");
  return res.json();
}

export async function getShowings(opts?: {
  tenantId?: number;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}): Promise<Showing[]> {
  const params = new URLSearchParams();
  if (opts?.tenantId) params.set("tenant_id", String(opts.tenantId));
  if (opts?.dateFrom) params.set("date_from", opts.dateFrom);
  if (opts?.dateTo) params.set("date_to", opts.dateTo);
  if (opts?.limit) params.set("limit", String(opts.limit));
  const qs = params.toString();
  const url = `${API_BASE}/admin/showings${qs ? `?${qs}` : ""}`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error("Failed to fetch showings");
  return res.json();
}

export async function getClientShowings(clientId: number): Promise<Showing[]> {
  const res = await fetchWithTimeout(`${API_BASE}/admin/clients/${clientId}/showings`);
  if (!res.ok) throw new Error("Failed to fetch showings");
  return res.json();
}

export async function updateClient(
  clientId: number,
  data: { notes?: string; append_note?: string },
): Promise<Client> {
  const res = await fetchWithTimeout(`${API_BASE}/admin/clients/${clientId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getOvernightActivity(
  tenantId?: number,
  hours = 12,
): Promise<{ since: string; items: OvernightActivityItem[] }> {
  const params = new URLSearchParams({ hours: String(hours) });
  if (tenantId != null) params.set("tenant_id", String(tenantId));
  const res = await fetchWithTimeout(`${API_BASE}/admin/activity/overnight?${params}`);
  if (!res.ok) throw new Error("Failed to fetch overnight activity");
  return res.json();
}

export async function getStaleActivity(tenantId?: number, days = 7): Promise<StaleActivity> {
  const params = new URLSearchParams({ days: String(days) });
  if (tenantId != null) params.set("tenant_id", String(tenantId));
  const res = await fetchWithTimeout(`${API_BASE}/admin/activity/stale?${params}`);
  if (!res.ok) throw new Error("Failed to fetch stale activity");
  return res.json();
}

export async function getEscalations(tenantId?: number): Promise<SafetyEscalation[]> {
  const params = new URLSearchParams({ status: "pending" });
  if (tenantId != null) params.set("tenant_id", String(tenantId));
  const res = await fetchWithTimeout(`${API_BASE}/admin/escalations?${params}`);
  if (!res.ok) throw new Error("Failed to fetch escalations");
  return res.json();
}

export async function reviewEscalation(escalationId: number): Promise<{ id: number; status: string }> {
  const res = await fetchWithTimeout(`${API_BASE}/admin/escalations/${escalationId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "reviewed" }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function generateDraft(data: {
  draft_type: "follow_up" | "reminder" | "client_update";
  client_id: number;
  showing_id?: number;
  channel?: "sms" | "email";
  context?: string;
}): Promise<{ draft: string; draftType: string; channel: string }> {
  const res = await fetchWithTimeout(
    `${API_BASE}/admin/agent/drafts`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
    PIPELINE_TIMEOUT_MS,
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function generateDraftStream(
  data: {
    draft_type: "follow_up" | "reminder" | "client_update";
    client_id: number;
    showing_id?: number;
    channel?: "sms" | "email";
    context?: string;
  },
  onDelta: (delta: string) => void,
  onStatus?: (message: string) => void,
): Promise<string> {
  const res = await fetchWithTimeout(
    `${API_BASE}/admin/agent/drafts/stream`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
    PIPELINE_TIMEOUT_MS,
  );
  if (!res.ok) throw new Error(await res.text());
  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response stream");
  const decoder = new TextDecoder();
  let buffer = "";
  let draft = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      const event = JSON.parse(line) as {
        event: string;
        delta?: string;
        draft?: string;
        message?: string;
      };
      if (event.event === "text_delta" && event.delta) {
        draft += event.delta;
        onDelta(event.delta);
      } else if (event.event === "status" && event.message) {
        onStatus?.(event.message);
      } else if (event.event === "done" && event.draft) {
        draft = event.draft;
      } else if (event.event === "error") {
        throw new Error(event.message ?? "Draft stream failed");
      }
    }
  }
  return draft;
}

export async function updateLeadStage(
  leadId: number,
  stage: string,
): Promise<{ id: number; stage: string }> {
  const res = await fetchWithTimeout(`${API_BASE}/admin/leads/${leadId}/stage`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stage }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getStaleLeads(tenantId?: number, days = 7): Promise<Lead[]> {
  const params = new URLSearchParams({ stale: "true", stale_days: String(days) });
  if (tenantId != null) params.set("tenant_id", String(tenantId));
  const res = await fetchWithTimeout(`${API_BASE}/admin/leads?${params}`);
  if (!res.ok) throw new Error("Failed to fetch stale leads");
  return res.json();
}
export async function getLeads(tenantId?: number): Promise<Lead[]> {
  const url =
    tenantId != null
      ? `${API_BASE}/admin/leads?tenant_id=${tenantId}`
      : `${API_BASE}/admin/leads`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error("Failed to fetch leads");
  return res.json();
}

export async function getListings(tenantId?: number): Promise<Listing[]> {
  const url =
    tenantId != null
      ? `${API_BASE}/admin/listings?tenant_id=${tenantId}`
      : `${API_BASE}/admin/listings`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error("Failed to fetch listings");
  return res.json();
}

export async function getKnowledgeArticles(tenantId?: number): Promise<KnowledgeArticle[]> {
  const url =
    tenantId != null
      ? `${API_BASE}/admin/knowledge/articles?tenant_id=${tenantId}`
      : `${API_BASE}/admin/knowledge/articles`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error("Failed to fetch knowledge");
  return res.json();
}

export async function getTenants(): Promise<Tenant[]> {
  const res = await fetchWithTimeout(`${API_BASE}/admin/tenants`);
  if (!res.ok) throw new Error("Failed to fetch tenants");
  return res.json();
}

export async function getStaff(opts?: { tenantId?: number; role?: string }): Promise<Staff[]> {
  const params = new URLSearchParams();
  if (opts?.tenantId) params.set("tenant_id", String(opts.tenantId));
  if (opts?.role) params.set("role", opts.role);
  const qs = params.toString();
  const url = `${API_BASE}/admin/staff${qs ? `?${qs}` : ""}`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error("Failed to fetch staff");
  return res.json();
}

export async function createShowing(data: {
  client_id: number;
  tenant_id?: number;
  agent_name?: string;
  notes?: string;
  listing_id?: number;
}): Promise<Showing> {
  const res = await fetchWithTimeout(`${API_BASE}/admin/showings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: data.client_id,
      tenant_id: data.tenant_id,
      agent_name: data.agent_name ?? "Agent",
      notes: data.notes ?? "Property showing",
      listing_id: data.listing_id,
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updateShowing(
  showingId: number,
  data: { status?: string; post_showing_notes?: string },
): Promise<Showing> {
  const res = await fetchWithTimeout(`${API_BASE}/admin/showings/${showingId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updateShowingStatus(
  showingId: number,
  status: string,
): Promise<{ id: number; status: string }> {
  const result = await updateShowing(showingId, { status });
  return { id: result.id, status: result.status };
}

export async function sendMessage(
  prompt: string,
  opts?: { clientId?: number; tenantId?: string; channel?: "client" | "agent" },
): Promise<PipelineResponse> {
  const body: Record<string, unknown> = { prompt, channel: opts?.channel ?? "agent" };
  if (opts?.clientId) body.client_id = opts.clientId;
  if (opts?.tenantId) body.tenant_id = opts.tenantId;
  const res = await fetchWithTimeout(
    `${API_BASE}/orchestration/pipelines`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    PIPELINE_TIMEOUT_MS,
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pipeline failed: ${text}`);
  }
  return res.json();
}

export async function sendMessageStream(
  prompt: string,
  opts: {
    clientId?: number;
    tenantId?: string;
    channel?: "client" | "agent";
    onDelta: (delta: string) => void;
    onStatus?: (message: string) => void;
  },
): Promise<string> {
  const body: Record<string, unknown> = { prompt, channel: opts.channel ?? "agent" };
  if (opts.clientId) body.client_id = opts.clientId;
  if (opts.tenantId) body.tenant_id = opts.tenantId;
  const res = await fetchWithTimeout(
    `${API_BASE}/orchestration/pipelines/stream`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    PIPELINE_TIMEOUT_MS,
  );
  if (!res.ok) throw new Error(await res.text());
  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response stream");
  const decoder = new TextDecoder();
  let buffer = "";
  let finalText = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      const event = JSON.parse(line) as {
        event: string;
        delta?: string;
        final_response?: string;
        message?: string;
      };
      if (event.event === "text_delta" && event.delta) {
        finalText += event.delta;
        opts.onDelta(event.delta);
      } else if (event.event === "status" && event.message) {
        opts.onStatus?.(event.message);
      } else if (event.event === "done" && event.final_response) {
        finalText = event.final_response;
      } else if (event.event === "error") {
        throw new Error(event.message ?? "Stream failed");
      }
    }
  }
  return finalText;
}

export async function executeAction(
  actionName: string,
  params: Record<string, unknown>,
): Promise<{ status: string; result?: { message: string } }> {
  const res = await fetchWithTimeout(`${API_BASE}/execute/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action_name: actionName, params }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function listExecutionActions(): Promise<{ actions: string[] }> {
  const res = await fetchWithTimeout(`${API_BASE}/execute/actions`);
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
  const res = await fetchWithTimeout(`${API_BASE}/admin/audit?limit=${limit}`);
  if (!res.ok) return [];
  return res.json();
}

/** @deprecated Use getClients */
export const getPatients = getClients;
/** @deprecated Use getClient */
export const getPatient = getClient;
/** @deprecated Use createClient */
export const createPatient = createClient;
/** @deprecated Use getShowings */
export const getAppointments = getShowings;
/** @deprecated Use getClientShowings */
export const getPatientAppointments = getClientShowings;
/** @deprecated Use createShowing */
export const createAppointment = (data: {
  patient_id: number;
  tenant_id?: number;
  provider_name: string;
  reason: string;
  date?: string;
  start_time?: string;
}) =>
  createShowing({
    client_id: data.patient_id,
    tenant_id: data.tenant_id,
    agent_name: data.provider_name,
    notes: data.reason,
  });
/** @deprecated Use updateShowingStatus */
export const updateAppointmentStatus = updateShowingStatus;
export type Patient = Client;
export type Appointment = Showing;
