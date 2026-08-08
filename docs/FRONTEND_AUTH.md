# Frontend authentication readiness

Patient and hospital portals currently support a **local development session** for
UX validation. Production identity is designed as an external OIDC / SSO handoff.

## Patient portal

- Session cookie: signed patient session (`frontend/patient-portal/src/lib/patient-session.ts`)
- Middleware protects all routes except sign-in and public auth callbacks
- API proxy scopes requests to the authenticated `patientId`
- Local demo sign-in is disabled unless `PATIENT_DEV_AUTH_ENABLED=true` and the
  runtime is not production

### Production wiring

Set:

```env
PATIENT_OIDC_ISSUER=
PATIENT_OIDC_CLIENT_ID=
PATIENT_OIDC_CLIENT_SECRET=
PATIENT_OIDC_REDIRECT_URI=
PATIENT_SESSION_SECRET=
```

The sign-in page surfaces OIDC as the primary path when issuer + client ID are
configured. Local demo remains a development escape hatch only.

## Hospital portal

- Staff session carries `staffId`, `tenantId`, and role category
- Middleware enforces role-gated routes
- Local demo sign-in is for non-production only

### Production wiring

Set:

```env
HOSPITAL_OIDC_ISSUER=
HOSPITAL_OIDC_CLIENT_ID=
HOSPITAL_OIDC_CLIENT_SECRET=
HOSPITAL_OIDC_REDIRECT_URI=
HOSPITAL_SESSION_SECRET=
HOSPITAL_ALLOWED_ROLES=
```

Map IdP claims to hospital roles and remove impersonation-style staff pickers
from production builds once SSO is live.

## Operator dashboard

Deployment operations already use GitHub OAuth / NextAuth with organization and
optional team allowlists. Keep deployment writes disabled until the control plane
secrets and approval policy are configured.
