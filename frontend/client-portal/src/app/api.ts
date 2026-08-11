/** Patient-scoped same-origin API client. Patient identity is resolved server-side. */

const API_BASE = "/api/patient";

const FETCH_TIMEOUT_MS = 8000;
const PIPELINE_TIMEOUT_MS = 120000;

async function fetchWithTimeout(
  path: string,
  opts: RequestInit = {},
  timeoutMs = FETCH_TIMEOUT_MS,
): Promise<Response> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}/${path}`, {
      ...opts,
      cache: "no-store",
      credentials: "same-origin",
      signal: ctrl.signal,
    });
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

export class PatientApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "PatientApiError";
  }
}

async function expectJson<T>(response: Response, fallback: string): Promise<T> {
  if (response.ok) return response.json() as Promise<T>;
  if (response.status === 401 && typeof window !== "undefined") {
    const returnTo = `${window.location.pathname}${window.location.search}`;
    window.location.assign(
      `/auth/signin?reason=session-expired&returnTo=${encodeURIComponent(returnTo)}`,
    );
  }
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  throw new PatientApiError(body?.error ?? fallback, response.status);
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

export async function getPatient(): Promise<Patient> {
  return expectJson(await fetchWithTimeout("me"), "We couldn’t load your profile.");
}

export async function getAppointments(): Promise<Appointment[]> {
  return expectJson(await fetchWithTimeout("appointments"), "We couldn’t load your appointments.");
}

export async function getKnowledgeArticles(): Promise<KnowledgeArticle[]> {
  return expectJson(await fetchWithTimeout("knowledge"), "We couldn’t load support information.");
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

export async function getConversations(): Promise<ConversationSummary[]> {
  return expectJson(
    await fetchWithTimeout("conversations", { method: "GET" }),
    "We couldn’t load your saved conversation.",
  );
}

export async function sendMessage(prompt: string): Promise<PipelineResponse> {
  const res = await fetchWithTimeout(
    "messages",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    },
    PIPELINE_TIMEOUT_MS,
  );
  return expectJson(res, "We couldn’t send your message.");
}

export interface VoiceProcessResponse {
  error: string | null;
  transcript: string | null;
  response: string;
  audio_b64: string | null;
}

export async function synthesizeSpeech(text: string): Promise<string | null> {
  const res = await fetchWithTimeout(
    "voice/tts",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    },
    15000,
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.audio_b64 ?? null;
}

export async function processVoice(
  audioB64: string,
  wantTts = true,
): Promise<VoiceProcessResponse> {
  const body: Record<string, unknown> = {
    audio_b64: audioB64,
    want_tts: wantTts,
  };
  const res = await fetchWithTimeout(
    "voice/process",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    PIPELINE_TIMEOUT_MS,
  );
  return expectJson(res, "We couldn’t process the recording.");
}

export async function cancelAppointment(appointmentId: number): Promise<void> {
  const response = await fetchWithTimeout(`appointments/${appointmentId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "cancelled" }),
  });
  await expectJson(response, "We couldn’t cancel this appointment.");
}
