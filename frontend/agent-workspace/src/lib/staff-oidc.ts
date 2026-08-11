/** Production OIDC readiness for the hospital portal. */

export function hospitalOidcConfigured() {
  return Boolean(
    process.env.HOSPITAL_OIDC_ISSUER &&
      process.env.HOSPITAL_OIDC_CLIENT_ID &&
      process.env.HOSPITAL_OIDC_REDIRECT_URI,
  );
}

export function hospitalOidcAuthorizeUrl(state: string) {
  const issuer = process.env.HOSPITAL_OIDC_ISSUER;
  const clientId = process.env.HOSPITAL_OIDC_CLIENT_ID;
  const redirectUri = process.env.HOSPITAL_OIDC_REDIRECT_URI;
  if (!issuer || !clientId || !redirectUri) return null;

  const url = new URL(`${issuer.replace(/\/$/, "")}/authorize`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", process.env.HOSPITAL_OIDC_SCOPE ?? "openid profile email");
  url.searchParams.set("state", state);
  return url.toString();
}
