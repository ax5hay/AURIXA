export const CLIENT_SESSION_COOKIE = "aurixa_client_session";
/** @deprecated Phase 4 migration — read legacy patient cookie when present */
export const LEGACY_PATIENT_SESSION_COOKIE = "aurixa_patient_session";
export const CLIENT_SESSION_MAX_AGE_SECONDS = 60 * 60;

export interface ClientSession {
  clientId: number;
  tenantId: number;
  subject: string;
  issuedAt: number;
  expiresAt: number;
  demo: boolean;
}

function env(name: string, legacy?: string): string | undefined {
  return process.env[name] ?? (legacy ? process.env[legacy] : undefined);
}

function encodeBase64Url(value: Uint8Array | string): string {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value: string): Uint8Array {
  const padded = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function hmac(
  secret: string,
  value: string,
  operation: "sign" | "verify",
  signature?: ArrayBuffer,
) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    [operation],
  );
  if (operation === "verify" && signature) {
    return crypto.subtle.verify("HMAC", key, signature, new TextEncoder().encode(value));
  }
  return crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
}

function normalizeSessionPayload(value: unknown): ClientSession | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const clientId = Number(raw.clientId ?? raw.patientId);
  const tenantId = Number(raw.tenantId);
  if (
    !Number.isSafeInteger(clientId) ||
    clientId < 1 ||
    !Number.isSafeInteger(tenantId) ||
    tenantId < 1 ||
    typeof raw.subject !== "string" ||
    typeof raw.issuedAt !== "number" ||
    typeof raw.expiresAt !== "number" ||
    typeof raw.demo !== "boolean"
  ) {
    return null;
  }
  return {
    clientId,
    tenantId,
    subject: raw.subject,
    issuedAt: raw.issuedAt,
    expiresAt: raw.expiresAt,
    demo: raw.demo,
  };
}

const LOCAL_DEMO_SESSION_SECRET = "aurixa-local-client-demo-session-secret";

export function getClientSessionSecret(): string | null {
  const secret = env("CLIENT_SESSION_SECRET", "PATIENT_SESSION_SECRET");
  if (secret && secret.length >= 32) return secret;
  if (isClientLivePathOpen()) return LOCAL_DEMO_SESSION_SECRET;
  return null;
}

export function buildLocalClientDemoSession(): ClientSession | null {
  if (!isClientLivePathOpen()) return null;

  const clientId = Number(env("CLIENT_DEMO_CLIENT_ID", "PATIENT_DEMO_PATIENT_ID") ?? "1");
  const tenantId = Number(env("CLIENT_DEMO_TENANT_ID", "PATIENT_DEMO_TENANT_ID") ?? "1");
  if (
    !Number.isSafeInteger(clientId) ||
    clientId < 1 ||
    !Number.isSafeInteger(tenantId) ||
    tenantId < 1
  ) {
    return null;
  }

  const issuedAt = Math.floor(Date.now() / 1000);
  return {
    clientId,
    tenantId,
    subject: `local-demo-client-${clientId}`,
    demo: true,
    issuedAt,
    expiresAt: issuedAt + CLIENT_SESSION_MAX_AGE_SECONDS,
  };
}

export async function resolveClientSession(
  token: string | undefined,
): Promise<ClientSession | null> {
  const verified = await verifyClientSessionToken(token);
  if (verified) return verified;
  return buildLocalClientDemoSession();
}

export async function createClientSessionToken(
  session: Omit<ClientSession, "issuedAt" | "expiresAt">,
  secret: string,
): Promise<string> {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload: ClientSession = {
    ...session,
    issuedAt,
    expiresAt: issuedAt + CLIENT_SESSION_MAX_AGE_SECONDS,
  };
  const encoded = encodeBase64Url(JSON.stringify(payload));
  const signature = await hmac(secret, encoded, "sign");
  return `${encoded}.${encodeBase64Url(new Uint8Array(signature as ArrayBuffer))}`;
}

export async function verifyClientSessionToken(
  token: string | undefined,
  secret: string | null = getClientSessionSecret(),
): Promise<ClientSession | null> {
  if (!token || !secret) return null;
  const [encoded, encodedSignature, extra] = token.split(".");
  if (!encoded || !encodedSignature || extra) return null;

  try {
    const signature = decodeBase64Url(encodedSignature);
    const valid = await hmac(secret, encoded, "verify", signature.buffer as ArrayBuffer);
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(decodeBase64Url(encoded))) as unknown;
    const session = normalizeSessionPayload(payload);
    if (!session || session.expiresAt <= Math.floor(Date.now() / 1000)) return null;
    return session;
  } catch {
    return null;
  }
}

export function isLocalClientDemoEnabled(): boolean {
  return (
    env("NODE_ENV") !== "production" &&
    env("CLIENT_DEMO_AUTH_ENABLED", "PATIENT_DEMO_AUTH_ENABLED") === "true"
  );
}

export function isClientLivePathOpen(): boolean {
  return env("CLIENT_DEMO_AUTH_ENABLED", "PATIENT_DEMO_AUTH_ENABLED") === "true";
}
