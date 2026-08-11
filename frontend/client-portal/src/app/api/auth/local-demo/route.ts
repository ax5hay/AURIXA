import { NextResponse } from "next/server";
import {
  CLIENT_SESSION_COOKIE,
  CLIENT_SESSION_MAX_AGE_SECONDS,
  createClientSessionToken,
  getClientSessionSecret,
  isLocalClientDemoEnabled,
} from "@/lib/client-session";

function env(name: string, legacy?: string): string | undefined {
  return process.env[name] ?? (legacy ? process.env[legacy] : undefined);
}

export async function POST() {
  const secret = getClientSessionSecret();
  if (!isLocalClientDemoEnabled() || !secret) {
    return NextResponse.json(
      { error: "Local client demo sign-in is not configured." },
      { status: 403 },
    );
  }

  const clientId = Number(env("CLIENT_DEMO_CLIENT_ID", "PATIENT_DEMO_PATIENT_ID") ?? "1");
  const tenantId = Number(env("CLIENT_DEMO_TENANT_ID", "PATIENT_DEMO_TENANT_ID") ?? "1");
  if (
    !Number.isSafeInteger(clientId) ||
    clientId < 1 ||
    !Number.isSafeInteger(tenantId) ||
    tenantId < 1
  ) {
    return NextResponse.json({ error: "Local client demo identity is invalid." }, { status: 500 });
  }

  const token = await createClientSessionToken(
    {
      clientId,
      tenantId,
      subject: `local-demo-client-${clientId}`,
      demo: true,
    },
    secret,
  );
  const response = NextResponse.json({ ok: true });
  response.cookies.set(CLIENT_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CLIENT_SESSION_MAX_AGE_SECONDS,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
