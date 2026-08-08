import { NextResponse } from "next/server";
import { hospitalOidcAuthorizeUrl, hospitalOidcConfigured } from "@/lib/staff-oidc";

export const dynamic = "force-dynamic";

export function GET() {
  if (!hospitalOidcConfigured()) {
    return NextResponse.json(
      { error: "Hospital OIDC is not configured. See docs/FRONTEND_AUTH.md." },
      { status: 503 },
    );
  }
  const state = crypto.randomUUID();
  const url = hospitalOidcAuthorizeUrl(state);
  if (!url) {
    return NextResponse.json({ error: "Hospital OIDC authorize URL could not be built." }, { status: 503 });
  }
  const response = NextResponse.redirect(url);
  response.cookies.set("aurixa_hospital_oidc_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return response;
}
