export const PATIENT_SESSION_COOKIE = "aurixa_patient_session";
export const PATIENT_SESSION_MAX_AGE_SECONDS = 60 * 60;

export interface PatientSession {
  patientId: number;
  tenantId: number;
  subject: string;
  issuedAt: number;
  expiresAt: number;
  demo: boolean;
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

function isPatientSession(value: unknown): value is PatientSession {
  if (!value || typeof value !== "object") return false;
  const session = value as Record<string, unknown>;
  return (
    Number.isSafeInteger(session.patientId) &&
    Number(session.patientId) > 0 &&
    Number.isSafeInteger(session.tenantId) &&
    Number(session.tenantId) > 0 &&
    typeof session.subject === "string" &&
    typeof session.issuedAt === "number" &&
    typeof session.expiresAt === "number" &&
    typeof session.demo === "boolean"
  );
}

const LOCAL_DEMO_SESSION_SECRET = "aurixa-local-patient-demo-session-secret";

export function getPatientSessionSecret(): string | null {
  const secret = process.env.PATIENT_SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (isPatientLivePathOpen()) return LOCAL_DEMO_SESSION_SECRET;
  return null;
}

export function buildLocalPatientDemoSession(): PatientSession | null {
  if (!isPatientLivePathOpen()) return null;

  const patientId = Number(runtimeEnv("PATIENT_DEMO_PATIENT_ID") ?? "1");
  const tenantId = Number(runtimeEnv("PATIENT_DEMO_TENANT_ID") ?? "1");
  if (
    !Number.isSafeInteger(patientId) ||
    patientId < 1 ||
    !Number.isSafeInteger(tenantId) ||
    tenantId < 1
  ) {
    return null;
  }

  const issuedAt = Math.floor(Date.now() / 1000);
  return {
    patientId,
    tenantId,
    subject: `local-demo-patient-${patientId}`,
    demo: true,
    issuedAt,
    expiresAt: issuedAt + PATIENT_SESSION_MAX_AGE_SECONDS,
  };
}

export async function resolvePatientSession(
  token: string | undefined,
): Promise<PatientSession | null> {
  const verified = await verifyPatientSessionToken(token);
  if (verified) return verified;
  return buildLocalPatientDemoSession();
}

export async function createPatientSessionToken(
  session: Omit<PatientSession, "issuedAt" | "expiresAt">,
  secret: string,
): Promise<string> {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload: PatientSession = {
    ...session,
    issuedAt,
    expiresAt: issuedAt + PATIENT_SESSION_MAX_AGE_SECONDS,
  };
  const encoded = encodeBase64Url(JSON.stringify(payload));
  const signature = await hmac(secret, encoded, "sign");
  return `${encoded}.${encodeBase64Url(new Uint8Array(signature as ArrayBuffer))}`;
}

export async function verifyPatientSessionToken(
  token: string | undefined,
  secret: string | null = getPatientSessionSecret(),
): Promise<PatientSession | null> {
  if (!token || !secret) return null;
  const [encoded, encodedSignature, extra] = token.split(".");
  if (!encoded || !encodedSignature || extra) return null;

  try {
    const signature = decodeBase64Url(encodedSignature);
    const valid = await hmac(secret, encoded, "verify", signature.buffer as ArrayBuffer);
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(decodeBase64Url(encoded))) as unknown;
    if (!isPatientSession(payload) || payload.expiresAt <= Math.floor(Date.now() / 1000))
      return null;
    return payload;
  } catch {
    return null;
  }
}

function runtimeEnv(name: string): string | undefined {
  return process.env[name];
}

export function isLocalPatientDemoEnabled(): boolean {
  return (
    runtimeEnv("NODE_ENV") !== "production" &&
    runtimeEnv("PATIENT_DEMO_AUTH_ENABLED") === "true"
  );
}

export function isPatientLivePathOpen(): boolean {
  return runtimeEnv("PATIENT_DEMO_AUTH_ENABLED") === "true";
}
