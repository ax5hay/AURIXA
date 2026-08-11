/** Production OIDC readiness for the agent workspace. */

function env(name: string, legacy?: string): string | undefined {
  return process.env[name] ?? (legacy ? process.env[legacy] : undefined);
}

export function workspaceOidcConfigured() {
  return Boolean(
    env("WORKSPACE_OIDC_ISSUER", "HOSPITAL_OIDC_ISSUER") &&
      env("WORKSPACE_OIDC_CLIENT_ID", "HOSPITAL_OIDC_CLIENT_ID") &&
      env("WORKSPACE_OIDC_REDIRECT_URI", "HOSPITAL_OIDC_REDIRECT_URI"),
  );
}

export function workspaceOidcAuthorizeUrl(state: string) {
  const issuer = env("WORKSPACE_OIDC_ISSUER", "HOSPITAL_OIDC_ISSUER");
  const clientId = env("WORKSPACE_OIDC_CLIENT_ID", "HOSPITAL_OIDC_CLIENT_ID");
  const redirectUri = env("WORKSPACE_OIDC_REDIRECT_URI", "HOSPITAL_OIDC_REDIRECT_URI");
  if (!issuer || !clientId || !redirectUri) {
    throw new Error("Workspace OIDC is not configured.");
  }
  const url = new URL(`${issuer.replace(/\/$/, "")}/oauth2/v2.0/authorize`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set(
    "scope",
    env("WORKSPACE_OIDC_SCOPE", "HOSPITAL_OIDC_SCOPE") ?? "openid profile email",
  );
  return url.toString();
}

/** @deprecated */
export const hospitalOidcConfigured = workspaceOidcConfigured;
/** @deprecated */
export const hospitalOidcAuthorizeUrl = workspaceOidcAuthorizeUrl;
