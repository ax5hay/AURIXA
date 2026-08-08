import { NextResponse } from "next/server";
import {
  createPatientSessionToken,
  getPatientSessionSecret,
  isLocalPatientDemoEnabled,
  PATIENT_SESSION_COOKIE,
  PATIENT_SESSION_MAX_AGE_SECONDS,
} from "@/lib/patient-session";

export async function POST() {
  const secret = getPatientSessionSecret();
  if (!isLocalPatientDemoEnabled() || !secret) {
    return NextResponse.json(
      { error: "Local patient demo sign-in is not configured." },
      { status: 403 },
    );
  }

  const patientId = Number(process.env.PATIENT_DEMO_PATIENT_ID ?? "1");
  const tenantId = Number(process.env.PATIENT_DEMO_TENANT_ID ?? "1");
  if (
    !Number.isSafeInteger(patientId) ||
    patientId < 1 ||
    !Number.isSafeInteger(tenantId) ||
    tenantId < 1
  ) {
    return NextResponse.json({ error: "Local patient demo identity is invalid." }, { status: 500 });
  }

  const token = await createPatientSessionToken(
    {
      patientId,
      tenantId,
      subject: `local-demo-patient-${patientId}`,
      demo: true,
    },
    secret,
  );
  const response = NextResponse.json({ ok: true });
  response.cookies.set(PATIENT_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: PATIENT_SESSION_MAX_AGE_SECONDS,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
