import { NextResponse } from "next/server";
import { workspaceOidcAuthorizeUrl, workspaceOidcConfigured } from "@/lib/staff-oidc";

export async function GET() {
  if (!workspaceOidcConfigured()) {
    return NextResponse.json(
      { error: "Workspace OIDC is not configured. See docs/FRONTEND_AUTH.md." },
      { status: 503 },
    );
  }
  const state = crypto.randomUUID();
  const url = workspaceOidcAuthorizeUrl(state);
  const response = NextResponse.redirect(url);
  response.cookies.set("aurixa_workspace_oidc_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return response;
}
