import { NextResponse } from "next/server";
import { patientOidcAuthorizeUrl, patientOidcConfigured } from "@/lib/patient-oidc";

export const dynamic = "force-dynamic";

export function GET() {
  if (!patientOidcConfigured()) {
    return NextResponse.json(
      { error: "Patient OIDC is not configured. See docs/FRONTEND_AUTH.md." },
      { status: 503 },
    );
  }
  const state = crypto.randomUUID();
  const url = patientOidcAuthorizeUrl(state);
  if (!url) {
    return NextResponse.json({ error: "Patient OIDC authorize URL could not be built." }, { status: 503 });
  }
  const response = NextResponse.redirect(url);
  response.cookies.set("aurixa_patient_oidc_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return response;
}
