import { NextResponse } from "next/server";
import { clientOidcAuthorizeUrl, clientOidcConfigured } from "@/lib/client-oidc";

export async function GET() {
  if (!clientOidcConfigured()) {
    return NextResponse.json(
      { error: "Client OIDC is not configured. See docs/FRONTEND_AUTH.md." },
      { status: 503 },
    );
  }
  const state = crypto.randomUUID();
  const url = clientOidcAuthorizeUrl(state);
  if (!url) {
    return NextResponse.json({ error: "Client OIDC authorize URL could not be built." }, { status: 503 });
  }
  const response = NextResponse.redirect(url);
  response.cookies.set("aurixa_client_oidc_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return response;
}
