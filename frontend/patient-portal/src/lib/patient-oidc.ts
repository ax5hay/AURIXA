/** Production OIDC readiness for the patient portal. */

export function patientOidcConfigured() {
  return Boolean(
    process.env.PATIENT_OIDC_ISSUER &&
      process.env.PATIENT_OIDC_CLIENT_ID &&
      process.env.PATIENT_OIDC_REDIRECT_URI,
  );
}

export function patientOidcAuthorizeUrl(state: string) {
  const issuer = process.env.PATIENT_OIDC_ISSUER;
  const clientId = process.env.PATIENT_OIDC_CLIENT_ID;
  const redirectUri = process.env.PATIENT_OIDC_REDIRECT_URI;
  if (!issuer || !clientId || !redirectUri) return null;

  const url = new URL(`${issuer.replace(/\/$/, "")}/authorize`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", process.env.PATIENT_OIDC_SCOPE ?? "openid profile email");
  url.searchParams.set("state", state);
  return url.toString();
}
