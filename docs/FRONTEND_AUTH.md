# Frontend authentication readiness

Client portal and agent workspace support a **local development session** for
UX validation. Production identity is designed as an external OIDC / SSO handoff.

## Client portal

- Session cookie: signed client session (`frontend/client-portal/src/lib/client-session.ts`)
- Middleware protects all routes except sign-in and public auth callbacks
- API proxy scopes requests to the authenticated `clientId`
- Local demo sign-in is disabled unless `CLIENT_DEMO_AUTH_ENABLED=true` and the
  runtime is not production

### Production wiring

Set:

```env
CLIENT_OIDC_ISSUER=
CLIENT_OIDC_CLIENT_ID=
CLIENT_OIDC_CLIENT_SECRET=
CLIENT_OIDC_REDIRECT_URI=
CLIENT_SESSION_SECRET=
NEXT_PUBLIC_CLIENT_OIDC_READY=true
```

Legacy `PATIENT_*` env vars are still read as fallbacks during migration.

The sign-in page surfaces OIDC as the primary path when issuer + client ID are
configured. Local demo remains a development escape hatch only.

## Agent workspace

- Staff session carries `staffId`, `tenantId`, and role category
- Middleware enforces role-gated routes
- Local demo sign-in is for non-production only

### Production wiring

Set:

```env
WORKSPACE_OIDC_ISSUER=
WORKSPACE_OIDC_CLIENT_ID=
WORKSPACE_OIDC_CLIENT_SECRET=
WORKSPACE_OIDC_REDIRECT_URI=
STAFF_SESSION_SECRET=
NEXT_PUBLIC_WORKSPACE_OIDC_READY=true
STAFF_ALLOWED_ROLES=
```

Legacy `HOSPITAL_OIDC_*` and `NEXT_PUBLIC_HOSPITAL_OIDC_READY` env vars are still
read as fallbacks during migration.

Map IdP claims to agent/coordination/operations roles and remove impersonation-style
staff pickers from production builds once SSO is live.

## Operator dashboard

Deployment operations already use GitHub OAuth / NextAuth with organization and
optional team allowlists. Keep deployment writes disabled until the control plane
secrets and approval policy are configured.

## Local Docker Compose hosts

| Service | Port | Local URL |
| --- | --- | --- |
| Client portal | 3300 | http://localhost:3300 |
| Agent workspace | 3400 | http://localhost:3400 |
| Operator dashboard | 3100 | http://localhost:3100 |
| API gateway | 3000 | http://localhost:3000 |

Helm ingress targets (see `infra/helm/aurixa/values.yaml`):

| Route | Local host | Production example |
| --- | --- | --- |
| Client portal | `client.aurixa.local` | `client.aurixa.example` |
| Agent workspace | `workspace.aurixa.local` | `workspace.aurixa.example` |
