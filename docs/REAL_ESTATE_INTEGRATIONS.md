# AURIXA Real Estate Integrations (Phase 0)

**Status:** Specification — contract stubs for Phase 8  
**Parent:** [`REAL_ESTATE_DOMAIN.md`](./REAL_ESTATE_DOMAIN.md)

---

## 1. Integration philosophy

- AURIXA is the **operational hub** for conversations, showings, and org knowledge.
- External systems remain **authoritative** for their domain until sync completes:
  - MLS → listing master data (when enabled)
  - CRM → lead/contact master (when enabled)
  - Calendar → agent busy/free (when enabled)
- Connectors live in a future `packages/integrations` or `apps/integration-hub` module.
- Credentials stored **per organization**, encrypted at rest.

---

## 2. Connector interface (stub)

```typescript
interface IntegrationConnector {
  name: string;
  orgId: number;

  healthCheck(): Promise<{ ok: boolean; message?: string }>;

  // Listings
  syncListings?(since?: Date): Promise<SyncResult>;
  pushListing?(listing: ListingExport): Promise<ExternalRef>;

  // CRM / leads
  pullContacts?(since?: Date): Promise<ContactImport[]>;
  pushLead?(lead: LeadExport): Promise<ExternalRef>;
  pushActivity?(activity: ActivityExport): Promise<void>;

  // Calendar
  pullBusySlots?(agentId: number, range: DateRange): Promise<BusySlot[]>;
  createCalendarEvent?(showing: ShowingExport): Promise<ExternalRef>;
  updateCalendarEvent?(externalId: string, showing: ShowingExport): Promise<void>;
  deleteCalendarEvent?(externalId: string): Promise<void>;

  // PM
  pullWorkOrders?(since?: Date): Promise<WorkOrderImport[]>;
  pushWorkOrder?(request: ServiceRequestExport): Promise<ExternalRef>;

  // E-sign
  sendEnvelope?(document: DocumentExport): Promise<ExternalRef>;
  getEnvelopeStatus?(externalId: string): Promise<EnvelopeStatus>;
}

interface SyncResult {
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ externalId: string; message: string }>;
}

interface ExternalRef {
  externalId: string;
  externalSource: string;
}
```

---

## 3. Priority connectors

| Priority | Connector | Phase | Direction |
| --- | --- | --- | --- |
| P0 | Google Calendar | 8 | Bi-directional showings |
| P0 | Microsoft 365 Calendar | 8 | Bi-directional showings |
| P0 | CSV / manual listing import | 1–2 | Inbound |
| P1 | Follow Up Boss | 8 | Bi-directional leads |
| P1 | HubSpot | 8 | Bi-directional leads |
| P1 | RESO Web API (MLS) | 8 | Inbound listings |
| P2 | Salesforce | 8 | Bi-directional |
| P2 | AppFolio | 8 | PM units + work orders |
| P2 | Buildium | 8 | PM units + work orders |
| P3 | DocuSign | 8 | Outbound + webhook |
| P3 | Mapbox / Google Maps | 4 or 8 | Display geocoding |

---

## 4. Event bus (internal)

Webhooks and sync jobs emit internal events for audit and downstream actions:

| Event | Payload keys | Triggers |
| --- | --- | --- |
| `lead.created` | `lead_id`, `tenant_id`, `source` | CRM push, agent notify |
| `lead.stage_changed` | `lead_id`, `from`, `to` | CRM update, nurture rules |
| `showing.created` | `showing_id`, `client_id`, `listing_id` | Calendar create, SMS reminder |
| `showing.updated` | `showing_id`, `status` | Calendar update, client notify |
| `listing.synced` | `listing_id`, `external_id` | RAG re-index |
| `offer.submitted` | `offer_id`, `deal_id` | Agent notify, CRM activity |
| `service_request.created` | `request_id`, `category` | PM push, AppFolio work order |
| `integration.sync_failed` | `connector`, `error` | Operator alert |

Delivery: Phase 8 — start with orchestration HTTP webhooks + job queue; no new infra in Phase 0.

---

## 5. Webhook ingress (external → AURIXA)

| Source | Path (target) | Purpose |
| --- | --- | --- |
| DocuSign | `POST /api/v1/webhooks/docusign` | Envelope signed / declined |
| CRM (generic) | `POST /api/v1/webhooks/crm/:provider` | Lead/contact update |
| MLS feed | Job poll (no webhook) | Scheduled RESO sync |
| GitHub Actions | existing deployment callback | Unchanged |

All webhooks: HMAC signature verification, idempotency key, audit log entry.

---

## 6. Sync rules

### 6.1 Listings (MLS inbound)

1. Match on `external_id` + `external_source`.
2. If new → create `property` + `listing`.
3. If exists → update price, status, description; trigger RAG re-embed.
4. Never delete listing without operator confirmation (soft-delete → `status: withdrawn`).

### 6.2 Leads (CRM bi-directional)

- **AURIXA → CRM:** on `lead.created`, `showing.created`, `lead.stage_changed`
- **CRM → AURIXA:** on contact create/update, match email/phone; merge or create lead
- **Conflict:** CRM wins on contact fields; AURIXA wins on showing/conv history

### 6.3 Calendar

- Showing created in AURIXA → create calendar event with client + listing in description
- External calendar block → reduce `availability_slots` for agent
- Cancel in either system → sync cancel to other (last-writer-wins with audit)

---

## 7. Credential model (per org)

```json
{
  "tenant_id": 1,
  "connector": "follow_up_boss",
  "credentials_ref": "vault://org-1/fub",
  "config": {
    "sync_interval_minutes": 15,
    "default_pipeline_id": 1
  },
  "enabled": true,
  "last_sync_at": "2026-08-11T12:00:00Z",
  "last_sync_status": "ok"
}
```

Stored in new `integration_connections` table (Phase 8).

---

## 8. Operator console surfaces (Phase 8)

- Integration list per org: status, last sync, error count
- Manual “Sync now” trigger
- Mapping config: CRM stage ↔ AURIXA pipeline stage
- MLS field mapping (RESO → AURIXA listing fields)

---

## 9. Failure handling

| Failure | Behavior |
| --- | --- |
| Transient API error | Retry 3x exponential backoff |
| Auth failure | Disable connector; alert operator |
| Partial sync | Log per-record errors; continue batch |
| Rate limit | Respect Retry-After; queue remainder |

Dead-letter records in `integration_sync_errors` table (Phase 8).

---

## 10. Security

- OAuth where available (Google, M365, HubSpot, Salesforce)
- API keys in secrets manager; never in repo or logs
- Minimal scopes: calendar read/write, CRM contacts/activities only
- Webhook secrets rotated per org

---

## 11. Phase 0 exit

This document defines **contracts and boundaries** only. Implementation deferred to Phase 8 after core RE APIs and portals exist.
