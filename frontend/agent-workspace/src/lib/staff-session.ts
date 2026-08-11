export const STAFF_SESSION_COOKIE = "aurixa_staff_session";
export const STAFF_SESSION_MAX_AGE_SECONDS = 60 * 60;

export interface StaffSession {
  staffId: number;
  fullName: string;
  email: string;
  role: string;
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

function isStaffSession(value: unknown): value is StaffSession {
  if (!value || typeof value !== "object") return false;
  const session = value as Record<string, unknown>;
  return (
    Number.isSafeInteger(session.staffId) &&
    Number(session.staffId) > 0 &&
    Number.isSafeInteger(session.tenantId) &&
    Number(session.tenantId) > 0 &&
    typeof session.fullName === "string" &&
    Boolean(session.fullName) &&
    typeof session.email === "string" &&
    typeof session.role === "string" &&
    Boolean(session.role) &&
    typeof session.subject === "string" &&
    typeof session.issuedAt === "number" &&
    typeof session.expiresAt === "number" &&
    typeof session.demo === "boolean"
  );
}

const LOCAL_DEMO_SESSION_SECRET = "aurixa-local-staff-demo-session-secret";

export function getStaffSessionSecret(): string | null {
  const secret = process.env.STAFF_SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (isStaffLivePathOpen()) return LOCAL_DEMO_SESSION_SECRET;
  return null;
}

export function buildLocalStaffDemoSession(): StaffSession | null {
  if (!isStaffLivePathOpen()) return null;

  const staffId = Number(runtimeEnv("STAFF_DEMO_STAFF_ID") ?? "1");
  const tenantId = Number(runtimeEnv("STAFF_DEMO_TENANT_ID") ?? "1");
  const fullName =
    runtimeEnv("AGENT_DEMO_FULL_NAME")?.trim() ||
    runtimeEnv("STAFF_DEMO_FULL_NAME")?.trim() ||
    "Demo Agent";
  const email =
    runtimeEnv("AGENT_DEMO_EMAIL")?.trim() ||
    runtimeEnv("STAFF_DEMO_EMAIL")?.trim() ||
    "demo-agent@localhost";
  const role =
    runtimeEnv("AGENT_DEMO_ROLE")?.trim() || runtimeEnv("STAFF_DEMO_ROLE")?.trim() || "agent";
  if (
    !Number.isSafeInteger(staffId) ||
    staffId < 1 ||
    !Number.isSafeInteger(tenantId) ||
    tenantId < 1
  ) {
    return null;
  }

  const issuedAt = Math.floor(Date.now() / 1000);
  return {
    staffId,
    tenantId,
    fullName,
    email,
    role,
    subject: `local-demo-staff-${staffId}`,
    demo: true,
    issuedAt,
    expiresAt: issuedAt + STAFF_SESSION_MAX_AGE_SECONDS,
  };
}

export async function resolveStaffSession(
  token: string | undefined,
): Promise<StaffSession | null> {
  const verified = await verifyStaffSessionToken(token);
  if (verified) return verified;
  return buildLocalStaffDemoSession();
}

export async function createStaffSessionToken(
  session: Omit<StaffSession, "issuedAt" | "expiresAt">,
  secret: string,
): Promise<string> {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload: StaffSession = {
    ...session,
    issuedAt,
    expiresAt: issuedAt + STAFF_SESSION_MAX_AGE_SECONDS,
  };
  const encoded = encodeBase64Url(JSON.stringify(payload));
  const signature = await hmac(secret, encoded, "sign");
  return `${encoded}.${encodeBase64Url(new Uint8Array(signature as ArrayBuffer))}`;
}

export async function verifyStaffSessionToken(
  token: string | undefined,
  secret: string | null = getStaffSessionSecret(),
): Promise<StaffSession | null> {
  if (!token || !secret) return null;
  const [encoded, encodedSignature, extra] = token.split(".");
  if (!encoded || !encodedSignature || extra) return null;
  try {
    const signature = decodeBase64Url(encodedSignature);
    const valid = await hmac(secret, encoded, "verify", signature.buffer as ArrayBuffer);
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(decodeBase64Url(encoded))) as unknown;
    if (!isStaffSession(payload) || payload.expiresAt <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function runtimeEnv(name: string): string | undefined {
  return process.env[name];
}

export function isLocalStaffDemoEnabled(): boolean {
  return (
    runtimeEnv("NODE_ENV") !== "production" &&
    runtimeEnv("STAFF_DEMO_AUTH_ENABLED") === "true"
  );
}

export function isStaffLivePathOpen(): boolean {
  return runtimeEnv("STAFF_DEMO_AUTH_ENABLED") === "true";
}
