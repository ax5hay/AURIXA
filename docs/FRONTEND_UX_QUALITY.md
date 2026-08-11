# Frontend UX quality gates

This document defines how AURIXA’s client portal, agent workspace, and operator
frontends stay production-grade: accessible, measurable, privacy-safe, and visually
consistent.

## Product themes

| Product | Theme | Primary users |
|---|---|---|
| Client portal | `client` | Clients and prospects |
| Agent workspace | `workspace` | Agents, coordinators, operations |
| Operator dashboard | `operator` | Platform administrators |

All products consume `@aurixa/ui-kit` tokens and `PortalShell` landmarks. Prefer
semantic `ui-*` utilities over product-specific hex colors.

## Acceptance criteria for every flow

Before marking a journey complete:

1. **Completion:** a first-time user can finish the primary task without dead ends.
2. **Recovery:** loading, empty, offline, and error states are explicit and retryable.
3. **Keyboard:** the flow is completable with keyboard only.
4. **Responsive:** usable at 320px, tablet, laptop, 1440px, and wide agent workstations.
5. **Zoom:** content remains usable at 200% browser zoom.
6. **Motion:** `prefers-reduced-motion` disables nonessential animation.
7. **Contrast/focus:** WCAG 2.2 AA contrast and visible focus are preserved.
8. **Safety:** consequential production actions require confirmation.

## Automated gates

Run locally:

```sh
pnpm --filter @aurixa/ui-kit test
pnpm --filter @aurixa/ui-kit typecheck
pnpm --filter @aurixa/dashboard lint
pnpm --filter @aurixa/client-portal lint
pnpm --filter @aurixa/agent-workspace lint
pnpm exec playwright test --config=e2e/playwright.config.ts
```

CI enforces lint, typecheck, unit tests, optional Playwright smoke, and frontend
bundle budgets. Visual baselines live under `e2e/visual`.

## Component workbench

Use the operator dashboard foundations route as the in-repo workbench until a
dedicated Storybook package is published:

- `/playground/foundations` — themes, icons, status vocabulary, SearchSelect, DateTime

Storybook configuration for `@aurixa/ui-kit` also lives under
`packages/ui-kit/.storybook` for local component review.

## Privacy-safe product analytics

Allowed:

- Route names and funnel step IDs without patient identifiers
- Feature flags, UI version, locale, and viewport class
- Aggregate counts of retries, empty states, and failed actions

Forbidden:

- Names, emails, phone numbers, MRNs, appointment reasons, chat content
- Raw request payloads, auth tokens, or diagnostic bundles containing PHI
- Session replay that captures form fields with care data

When instrumentation is added, route events through a privacy review checklist
and redact before transport. Prefer server-side aggregation over client-side
replay.

## Manual validation matrix

- Screen readers: VoiceOver / NVDA on primary patient and hospital journeys
- Keyboard-only: command palette, schedule wizard, deployment composer
- Mobile thumb reach: patient bottom navigation and appointment detail actions
- Clinical density: hospital day board and patient chart tabs at 2K width
- Operator incident mode: deployment job detail with active polling
