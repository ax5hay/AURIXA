# AURIXA Real Estate API Conventions (Phase 0)

**Status:** Specification — not yet implemented  
**Parent:** [`REAL_ESTATE_DOMAIN.md`](./REAL_ESTATE_DOMAIN.md)

---

## 1. Principles

- **REST nouns** use real estate vocabulary (`clients`, `showings`, `listings`).
- **Internal IDs** are integer PKs; **external IDs** (MLS, CRM) stored in `external_id` + `external_source` fields.
- **Tenant scoping:** every mutating request requires org context (`tenant_id` from auth or query for admin).
- **Client-scoped reads:** client portal BFF passes authenticated `client_id`; never exposes other clients’ data.
- **Breaking change:** healthcare paths (`/patients`, `/appointments`) removed after migration — no long-term aliases.

---

## 2. Base URLs

| Consumer | Base |
| --- | --- |
| Operator / agent (via gateway) | `/api/v1/admin` |
| Orchestration direct (internal) | `/api/v1` |
| Client portal BFF | `/api/client` → proxies to gateway |

---

## 3. Resource conventions

### 3.1 Naming

| Pattern | Example |
| --- | --- |
| Plural collection | `/clients`, `/listings` |
| Nested collection | `/clients/:id/showings` |
| Action on resource | `PATCH /leads/:id/stage` |
| Status transition | `PATCH /showings/:id` body `{ "status": "completed" }` |

### 3.2 Standard query parameters

| Param | Used on | Purpose |
| --- | --- | --- |
| `tenant_id` | most admin lists | Org filter |
| `agent_id` / `staff_id` | showings, leads | Assignment filter |
| `status` | showings, leads, deals, listings | State filter |
| `from`, `to` | showings, audit | Date range |
| `q` | clients, listings, leads | Search |
| `listing_id` | showings, offers | Property context |
| `client_type` | clients | buyer \| renter \| seller \| owner |
| `stage` | leads | Pipeline filter |

### 3.3 Standard response envelope

Existing orchestration patterns retained:

```json
{
  "data": {},
  "meta": { "total": 0, "page": 1 }
}
```

Errors:

```json
{
  "error": "not_found",
  "message": "Listing not found",
  "details": {}
}
```

---

## 4. Route mapping (healthcare → real estate)

### 4.1 Gateway admin routes (`apps/api-gateway/src/routes/admin.ts`)

| Method | Healthcare (current) | Real estate (target) |
| --- | --- | --- |
| GET/POST | `/tenants` | `/tenants` (unchanged) |
| GET/PATCH | `/tenants/:id` | `/tenants/:id` |
| GET | `/audit` | `/audit` |
| GET | `/analytics/summary` | `/analytics/summary` |
| GET/PATCH | `/config/*` | `/config/*` |
| GET/POST | `/patients` | `/clients` |
| GET | `/patients/:id` | `/clients/:id` |
| GET | `/patients/:id/appointments` | `/clients/:id/showings` |
| GET | `/patients/:id/conversations` | `/clients/:id/conversations` |
| GET/POST/PATCH | `/appointments`, `/appointments/:id` | `/showings`, `/showings/:id` |
| GET | `/staff` | `/staff` |
| GET/POST | `/knowledge/articles` | `/knowledge/articles` |

### 4.2 New routes (Phase 2)

| Method | Path | Description |
| --- | --- | --- |
| GET/POST | `/properties` | List/create properties |
| GET/PATCH | `/properties/:id` | Property detail |
| GET/POST | `/listings` | List/create listings |
| GET/PATCH | `/listings/:id` | Listing detail; publish/unpublish |
| GET/POST | `/leads` | Lead list/create |
| GET/PATCH | `/leads/:id` | Lead detail |
| PATCH | `/leads/:id/stage` | Pipeline transition |
| GET/POST | `/applications` | Applications |
| GET/PATCH | `/applications/:id` | Application status |
| GET/POST | `/offers` | Offers |
| GET/PATCH | `/offers/:id` | Offer status |
| GET/POST | `/deals` | Deals |
| GET/PATCH | `/deals/:id` | Deal milestones |
| GET/POST | `/service-requests` | Maintenance, renewals |
| GET/PATCH | `/service-requests/:id` | Request status |
| GET/POST | `/documents` | Document metadata |
| GET | `/availability` | Available slots |

---

## 5. Core payload shapes (target)

### 5.1 Client

```json
{
  "id": 1,
  "full_name": "Jane Smith",
  "email": "jane@example.com",
  "phone_number": "+15551234567",
  "client_type": "buyer",
  "tenant_id": 1,
  "preferences": {
    "areas": ["Downtown", "Westside"],
    "budget_max": 500000,
    "beds_min": 3
  }
}
```

### 5.2 Listing

```json
{
  "id": 10,
  "property_id": 5,
  "tenant_id": 1,
  "listing_type": "sale",
  "status": "active",
  "list_price": 485000,
  "rent_amount": null,
  "marketing_title": "3BR Craftsman near parks",
  "marketing_description": "...",
  "external_id": "MLS-12345",
  "external_source": "reso"
}
```

### 5.3 Showing

```json
{
  "id": 42,
  "client_id": 1,
  "listing_id": 10,
  "agent_name": "Alex Rivera",
  "staff_id": 3,
  "showing_type": "private_tour",
  "start_time": "2026-08-15T14:00:00Z",
  "end_time": "2026-08-15T14:30:00Z",
  "status": "confirmed",
  "notes": "First-time buyer",
  "tenant_id": 1
}
```

### 5.4 Lead

```json
{
  "id": 7,
  "tenant_id": 1,
  "client_id": null,
  "full_name": "John Doe",
  "email": "john@example.com",
  "phone_number": "+15559876543",
  "source": "website",
  "stage": "new",
  "assigned_staff_id": 3,
  "listing_id": 10
}
```

---

## 6. Execution tool contracts

Tools invoked by agent-runtime / execution-engine. All accept `tenant_id` in context.

### 6.1 Read tools

| Tool | Params | Returns |
| --- | --- | --- |
| `get_showings` | `client_id`, optional `status`, `from` | List of showings |
| `get_availability` | `date`, optional `agent_id`, `listing_id` | Available slots |
| `get_listings` | `tenant_id`, optional filters (price, beds, area, status) | Listing summaries |
| `get_listing_detail` | `listing_id` | Full listing + property |
| `get_client_financing` | `client_id` | Financing/pre-approval record |
| `get_client_profile` | `client_id` | Client summary |
| `get_lead_status` | `lead_id` | Stage, assignment |
| `get_deal_status` | `deal_id` or `client_id` + `listing_id` | Deal milestone |
| `get_service_requests` | `client_id`, optional `status` | Open requests |

### 6.2 Write tools

| Tool | Params | Effect |
| --- | --- | --- |
| `create_showing` | `client_id`, `listing_id`, `start_time`, optional `agent_id`, `notes` | Creates showing |
| `update_showing` | `showing_id`, `status` | Status transition |
| `create_lead` | contact fields, `source`, optional `listing_id` | Creates lead |
| `update_lead_stage` | `lead_id`, `stage` | Pipeline update |
| `create_service_request` | `client_id`, `category`, `title`, `description` | Creates ticket |
| `create_application` | `client_id`, `listing_id`, `application_type` | Starts application |
| `submit_offer` | `client_id`, `listing_id`, `amount`, optional contingencies | Creates offer |

### 6.3 Pipeline context fields

Orchestration pipeline metadata (replaces `patient_id`):

```json
{
  "client_id": 1,
  "listing_id": 10,
  "showing_id": 42,
  "lead_id": 7,
  "deal_id": null,
  "channel": "webchat"
}
```

---

## 7. Client portal BFF routes

| BFF path | Proxies to |
| --- | --- |
| `/api/client/profile` | `GET /clients/:id` (session) |
| `/api/client/showings` | `GET /clients/:id/showings` |
| `/api/client/listings` | `GET /listings` (org-scoped, public active) |
| `/api/client/listings/:id` | `GET /listings/:id` |
| `/api/client/applications` | `GET /applications?client_id=` |
| `/api/client/service-requests` | `GET/POST /service-requests` |
| `/api/client/chat` | orchestration pipeline |
| `/api/client/voice` | streaming-voice |

Replace all `/api/patient/*` routes in `frontend/patient-portal`.

---

## 8. Agent workspace BFF routes

Replace `/api/hospital/*` with `/api/workspace/*`:

| BFF path | Proxies to |
| --- | --- |
| `/api/workspace/clients` | `/clients` |
| `/api/workspace/showings` | `/showings` |
| `/api/workspace/leads` | `/leads` |
| `/api/workspace/listings` | `/listings` |
| `/api/workspace/deals` | `/deals` |

---

## 9. Audit event naming

| Healthcare action | Real estate action |
| --- | --- |
| `patient.view` | `client.view` |
| `appointment.create` | `showing.create` |
| `prescription.refill_request` | `service_request.create` |
| `insurance.view` | `client_financing.view` |
| — | `listing.publish` |
| — | `lead.stage_change` |
| — | `offer.submit` |
| — | `fair_housing.flag` |

---

## 10. Versioning

- Path version remains `/api/v1`.
- Healthcare resources removed in a single breaking release tagged `v2.0.0-real-estate` (semver TBD at GA).
- OpenAPI spec generated from orchestration in Phase 2.
