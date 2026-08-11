# AURIXA Healthcare → Real Estate Rename Inventory (Phase 0)

**Status:** Reference for Phases 1–12  
**Parent:** [`REAL_ESTATE_DOMAIN.md`](./REAL_ESTATE_DOMAIN.md)

This inventory maps healthcare-specific names across the repo to their real estate targets. Use as a checklist during implementation.

---

## 1. Database (`packages/db`)

| File | Healthcare terms | Target |
| --- | --- | --- |
| `src/aurixa_db/models.py` | `Patient`, `PatientInsurance`, `Prescription`, `Appointment`, `patients`, clinical staff docstrings | `Client`, `ClientFinancing`, `ServiceRequest`, `Showing`, RE roles |
| `seed.py` | General Hospital, Dr. Adams, John Doe patient, Lisinopril, Aetna | RE orgs, agents, clients, listings |
| Alembic migrations | — | New migration chain Phase 1 |

---

## 2. Backend services

### API Gateway (`apps/api-gateway`)

| File | Terms |
| --- | --- |
| `src/routes/admin.ts` | `/patients`, `/appointments`, `/patients/:id/appointments` |

### Orchestration (`apps/orchestration-engine`)

| File | Terms |
| --- | --- |
| `src/orchestration_engine/main.py` | patient routes, CreateApptIn, patient_id in pipeline |
| `src/orchestration_engine/models.py` | patient_id fields |
| `src/orchestration_engine/clients.py` | "healthcare assistant" system prompt |

### Execution engine (`apps/execution-engine`)

| File | Terms |
| --- | --- |
| `src/execution_engine/main.py` | `_get_appointments`, `_check_insurance`, `_request_prescription_refill`, patient_id params |

### LLM router (`apps/llm-router`)

| File | Terms |
| --- | --- |
| `src/llm_router/main.py` | intents: appointment, billing/insurance, prescription |

### Agent runtime (`apps/agent-runtime`)

| File | Terms |
| --- | --- |
| `src/agent_runtime/main.py` | patient context parsing, healthcare tools |

### RAG service (`apps/rag-service`)

| File | Terms |
| --- | --- |
| `src/rag_service/documents.py` | healthcare fallback documents, nurse/pharmacy content |

### Safety guardrails (`apps/safety-guardrails`)

| File | Terms |
| --- | --- |
| `src/safety_guardrails/main.py` | emergency_triage, clinical_escalation keywords |
| `src/safety_guardrails/models.py` | clinical triage field descriptions |

### Streaming voice (`apps/streaming-voice`)

| File | Terms |
| --- | --- |
| `src/streaming_voice/main.py` | patient_id in pipeline forward |

---

## 3. Frontends

### Patient portal → Client portal (`frontend/patient-portal`)

| Area | Files / terms |
| --- | --- |
| Package | `@aurixa/patient-portal` → `@aurixa/client-portal` |
| Layout | "Patient Portal", "My care", theme `patient` |
| Nav | `PatientNav.tsx`, visits, medicines, refills, insurance |
| Sections | `patient-sections.ts` — Records, Results, Medications, Refills |
| Auth | `PATIENT_*` env, `patient-session`, `patient-oidc` |
| API | `/api/patient/[...path]` |
| Pages | appointments, medications, refills, insurance, billing, records, results |
| Components | `HealthcareDisclaimer`, `UnavailableCareSection` |
| Copy | diagnosis, emergency, care team, clinical |

### Hospital portal → Agent workspace (`frontend/hospital-portal`)

| Area | Files / terms |
| --- | --- |
| Package | `@aurixa/hospital-portal` → `@aurixa/agent-workspace` |
| Layout | "Hospital Portal", "Clinical workspace", theme `clinical` |
| Nav | `StaffNav.tsx` — Patients, Appointments, clinical roles |
| Pages | `/patients`, `/patients/[id]`, patient chart tabs |
| Context | `StaffContext.tsx` — clinical/coordination categories, doctor/nurse |
| API | `/api/hospital/[...path]` |
| Chat | "Clinical assistant", clinical judgment disclaimer |

### Dashboard (`frontend/dashboard`)

| Area | Files / terms |
| --- | --- |
| `playground/page.tsx` | get_appointments, check_insurance, prescription_refill, patient_id |
| `guide/page.tsx` | hospitals, clinics, patients |
| Analytics | patient/appointment labels |

---

## 4. Shared packages

### UI kit (`packages/ui-kit`)

| File | Terms |
| --- | --- |
| `src/components/Healthcare.tsx` | medical help, clinical diagnosis |
| `src/components/Domain.tsx` | patient/clinical domain cards |
| `src/styles/themes.css` | `--theme-patient`, `--theme-clinical` |
| `README.md` | healthcare helpers |
| `.storybook/preview.tsx` | patient/clinical themes |

### Auth (`packages/auth`)

| Terms | Check env var references in docs |

---

## 5. Infrastructure

| File | Terms |
| --- | --- |
| `infra/docker/docker-compose.yml` | patient-portal, hospital-portal, PATIENT_DEMO_*, STAFF_DEMO_* |
| `infra/helm/aurixa/values*.yaml` | patient/hospital hostnames, service names |
| `.github/workflows/*.yml` | patient-portal, hospital-portal image names |
| `pnpm-workspace.yaml` | patient-portal, hospital-portal paths |

---

## 6. Environment variables (`.env.example`)

| Current | Target |
| --- | --- |
| `PATIENT_SESSION_SECRET` | `CLIENT_SESSION_SECRET` |
| `PATIENT_DEMO_AUTH_ENABLED` | `CLIENT_DEMO_AUTH_ENABLED` |
| `PATIENT_DEMO_PATIENT_ID` | `CLIENT_DEMO_CLIENT_ID` |
| `PATIENT_DEMO_TENANT_ID` | `CLIENT_DEMO_TENANT_ID` |
| `PATIENT_OIDC_*` | `CLIENT_OIDC_*` |
| `NEXT_PUBLIC_PATIENT_OIDC_READY` | `NEXT_PUBLIC_CLIENT_OIDC_READY` |
| `HOSPITAL_OIDC_*` | `WORKSPACE_OIDC_*` |
| `NEXT_PUBLIC_HOSPITAL_OIDC_READY` | `NEXT_PUBLIC_WORKSPACE_OIDC_READY` |
| `STAFF_DEMO_FULL_NAME=Demo Clinician` | `Demo Agent` or similar |
| `DEPLOYMENT_ALLOWED_SERVICES=…patient-portal,hospital-portal` | `client-portal,agent-workspace` |

---

## 7. Documentation

| File | Action |
| --- | --- |
| `README.md` | Full RE rewrite (Phase 12); mark healthcare sections deprecated |
| `docs/FRONTEND_AUTH.md` | Update PATIENT/HOSPITAL → CLIENT/WORKSPACE |
| `docs/FRONTEND_UX_QUALITY.md` | Personas: client/agent |
| `docs/END_USER_FLOW_AND_TELEPHONY.md` | Patient → client channels |
| `docs/STREAMING_AND_END_USER_FLOWS.md` | RE voice flows |
| `docs/TECHNICAL_DOCUMENTATION.md` | Entity rename |
| `docs/ARCHITECTURE_AUDIT.md` | Tool names |
| `docs/FEATURE_GAP_ANALYSIS.md` | RE gap analysis (later) |
| `docs/DEPLOYMENT_RUNBOOK.md` | Service names |
| `infra/DEPLOYMENT.md` | Demo auth labels |

**New (Phase 0):**

- `docs/REAL_ESTATE_DOMAIN.md`
- `docs/REAL_ESTATE_API_CONVENTIONS.md`
- `docs/REAL_ESTATE_INTEGRATIONS.md`
- `docs/REAL_ESTATE_RENAME_INVENTORY.md` (this file)

---

## 8. Tests

| File | Terms |
| --- | --- |
| `e2e/smoke/portals.spec.ts` | patient-portal, hospital-portal sign-in |
| `frontend/patient-portal/src/lib/patient-session.test.ts` | patient session |
| `frontend/patient-portal/src/lib/patient-expansion.test.ts` | patient sections |
| `apps/orchestration-engine/tests/live/*` | healthcare prompts |

---

## 9. Scripts

| File | Terms |
| --- | --- |
| `scripts/run-stack.sh` | patient-portal, hospital-portal paths |
| `scripts/kill-stack.sh` | port labels |
| `scripts/e2e-check.sh` | `/patients`, patient profile |
| `scripts/e2e-detailed.sh` | healthcare API paths |
| `scripts/verify-stack.sh` | Patient Portal, Hospital Portal labels |

---

## 10. CI grep gate (recommended Phase 12)

Block user-facing paths containing (case-insensitive), with allowlist for this inventory and migration docs:

```
patient portal, hospital portal, clinical workspace, healthcare assistant,
prescription, refill, diagnosis, clinician, HIPAA, medication
```

Allowed in: `docs/REAL_ESTATE_*`, git history, migration scripts.

---

## 11. Estimated touch count

| Category | ~Files |
| --- | --- |
| Python backend | 15–20 |
| Frontend patient portal | 40+ |
| Frontend hospital portal | 35+ |
| Dashboard | 10+ |
| UI kit | 8+ |
| Infra / CI | 12+ |
| Docs | 15+ |
| Tests | 10+ |

**Total:** ~150+ files across Phases 1–12 (many are copy-only in Phases 4–5).

---

## 12. Rename sequence (recommended)

1. **Phase 1:** DB models + seed (internal; no folder renames yet)
2. **Phase 2:** API paths + execution tools + orchestration
3. **Phase 3:** AI prompts, intents, safety, RAG
4. **Phase 4:** Rename patient-portal folder + package + env
5. **Phase 5:** Rename hospital-portal folder + package + env
6. **Phase 6–7:** Dashboard + ui-kit
7. **Phase 12:** README + remaining docs + CI gate

Do **not** rename Docker service folders until Phases 4–5 complete to avoid broken compose mid-migration.
