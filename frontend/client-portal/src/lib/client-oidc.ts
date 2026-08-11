/** Production OIDC readiness for the client portal. */

function env(name: string, legacy?: string): string | undefined {
  return process.env[name] ?? (legacy ? process.env[legacy] : undefined);
}

export function clientOidcConfigured() {
  return Boolean(
    env("CLIENT_OIDC_ISSUER", "PATIENT_OIDC_ISSUER") &&
      env("CLIENT_OIDC_CLIENT_ID", "PATIENT_OIDC_CLIENT_ID") &&
      env("CLIENT_OIDC_REDIRECT_URI", "PATIENT_OIDC_REDIRECT_URI"),
  );
}

export function clientOidcAuthorizeUrl(state: string) {
  const issuer = env("CLIENT_OIDC_ISSUER", "PATIENT_OIDC_ISSUER");
  const clientId = env("CLIENT_OIDC_CLIENT_ID", "PATIENT_OIDC_CLIENT_ID");
  const redirectUri = env("CLIENT_OIDC_REDIRECT_URI", "PATIENT_OIDC_REDIRECT_URI");
  if (!issuer || !clientId || !redirectUri) {
    throw new Error("Client OIDC is not configured.");
  }
  const url = new URL(`${issuer.replace(/\/$/, "")}/oauth2/v2.0/authorize`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set(
    "scope",
    env("CLIENT_OIDC_SCOPE", "PATIENT_OIDC_SCOPE") ?? "openid profile email",
  );
  return url.toString();
}
