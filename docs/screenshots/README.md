# AURIXA UI screenshots

Full-page PNG captures (1280×720 viewport) of every primary screen across the three surfaces. Use in docs, decks, and sales collateral.

**Regenerate:** `pnpm capture:screenshots` (requires stack on ports 3300, 3400, 3100 with demo auth enabled).

---

## Client Portal (`client-portal/`)

| File | Route | Screen |
| --- | --- | --- |
| 01-auth-signin.png | `/auth/signin` | Sign-in |
| 02-home.png | `/` | Home + Tour Day Card |
| 03-showings.png | `/showings` | Showing schedule |
| 04-showing-detail.png | `/showings/1` | Showing detail (Oak Street) |
| 05-listings.png | `/listings` | Listings + match badges |
| 06-listings-compare.png | `/listings/compare?ids=1,2` | Compare two listings |
| 07-messages-chat.png | `/chat` | AI messages |
| 08-voice.png | `/voice` | Voice assistant |
| 09-documents.png | `/documents` | Documents |
| 10-applications.png | `/applications` | Applications |
| 11-financing.png | `/financing` | Financing |
| 12-maintenance.png | `/maintenance` | Maintenance requests |
| 13-notifications.png | `/notifications` | Notifications |
| 14-help.png | `/help` | Help articles |
| 15-account.png | `/account` | Account |
| 16-account-privacy.png | `/account/privacy` | Privacy |
| 17-account-accessibility.png | `/account/accessibility` | Accessibility |
| 18-records.png | `/records` | Records |
| 19-results.png | `/results` | Results / inspections |
| 20-billing.png | `/billing` | Billing (legacy route) |

Demo identity: **Jane Smith** (local demo sign-in).

---

## Agent Workspace (`agent-workspace/`)

| File | Route | Screen |
| --- | --- | --- |
| 01-auth-signin.png | `/auth/signin` | Sign-in |
| 02-today.png | `/` | Today queue |
| 03-clients.png | `/clients` | Client list |
| 04-client-detail.png | `/clients/1` | Jane Smith + 60-second client brief |
| 05-showings.png | `/showings` | Showings |
| 06-leads.png | `/leads` | Leads pipeline |
| 07-schedule.png | `/schedule?clientId=1` | Schedule showing |
| 08-assistant-chat.png | `/chat?clientId=1` | Staff assistant |
| 09-knowledge.png | `/knowledge` | Knowledge |
| 10-status.png | `/status` | Status |

Demo identity: **Demo Agent** (local demo sign-in).

---

## Operator Dashboard (`operator-dashboard/`)

| File | Route | Screen |
| --- | --- | --- |
| 01-overview.png | `/` | Overview |
| 02-dashboard.png | `/dashboard` | Dashboard |
| 03-analytics.png | `/analytics` | Analytics |
| 04-organizations.png | `/tenants` | Organizations (tenants) |
| 05-knowledge.png | `/knowledge` | Knowledge CMS |
| 06-playground.png | `/playground` | Playground |
| 07-playground-foundations.png | `/playground/foundations` | UI foundations workbench |
| 08-services.png | `/services` | Services health |
| 09-audit.png | `/audit` | Audit log |
| 10-configuration.png | `/configuration` | Configuration |
| 11-settings.png | `/settings` | Settings |
| 12-guide.png | `/guide` | Operator guide |
| 13-deployments.png | `/deployments` | Deployments |
| 14-auth-signin.png | `/auth/signin` | Deployment sign-in |

No auth required for most operator routes in local demo.

---

## Related

- [Demo videos](../demo-videos/) — short WebM walkthroughs
- [Demo presentation](../DEMO_PRESENTATION.md) — live demo script
- [Product overview](../REAL_ESTATE_PRODUCT_OVERVIEW.md) — stakeholder narrative
