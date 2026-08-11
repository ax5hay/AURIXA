/** Client-scoped same-origin API client. Identity is resolved server-side. */

const API_BASE = "/api/client";

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
    return await fetch(`${API_BASE}/${path}`, {
      ...opts,
      cache: "no-store",
      credentials: "same-origin",
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(id);
  }
}

export interface Showing {
  id: number;
  startTime: string;
  endTime: string;
  agentName: string;
  providerName?: string;
  status: string;
  notes?: string;
  listingId?: number;
}

export interface Listing {
  id: number;
  marketingTitle?: string;
  marketingDescription?: string;
  listPrice?: number;
  rentAmount?: number;
  listingType?: string;
  status?: string;
  address?: { line1?: string; city?: string; state?: string; postalCode?: string };
  beds?: number;
  baths?: number;
}

export class ClientApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ClientApiError";
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
  throw new ClientApiError(body?.error ?? fallback, response.status);
}

export interface ClientProfile {
  id: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  tenantId?: number;
  clientType?: string;
}

export interface KnowledgeArticle {
  id: number;
  title: string;
  content: string;
  tenantId?: number;
}

export async function getClient(): Promise<ClientProfile> {
  return expectJson(await fetchWithTimeout("profile"), "We couldn’t load your profile.");
}

export async function getShowings(): Promise<Showing[]> {
  return expectJson(await fetchWithTimeout("showings"), "We couldn’t load your showings.");
}

export async function getListings(): Promise<Listing[]> {
  return expectJson(await fetchWithTimeout("listings"), "We couldn’t load listings.");
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
  const res = await fetchWithTimeout(
    "voice/process",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audio_b64: audioB64, want_tts: wantTts }),
    },
    PIPELINE_TIMEOUT_MS,
  );
  return expectJson(res, "We couldn’t process the recording.");
}

export async function cancelShowing(showingId: number): Promise<void> {
  const response = await fetchWithTimeout(`showings/${showingId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "cancelled" }),
  });
  await expectJson(response, "We couldn’t cancel this showing.");
}

/** @deprecated Use getClient */
export const getPatient = getClient;
/** @deprecated Use getShowings */
export const getAppointments = getShowings;
/** @deprecated Use cancelShowing */
export const cancelAppointment = cancelShowing;
export type Patient = ClientProfile;
export type Appointment = Showing;
export type PatientApiError = ClientApiError;
