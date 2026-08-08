# AURIXA UI kit

Shared foundations for the patient, clinical, and operator products. Components
are theme-aware and use semantic `ui-*` Tailwind utilities rather than product
colors.

## Themes and tokens

Import `@aurixa/ui-kit/src/styles/themes.css` once in each frontend and set one
of these themes on the document root:

- `patient` — warm, editorial, mobile-first
- `clinical` — crisp, dense, task-oriented
- `operator` — dark, technical, status-led (also the default)

The CSS contract covers canvas/surface/ink, borders, brand and status colors,
chart colors, typography, spacing, radii, elevation, focus, motion, shell
dimensions, and safe reduced-motion/high-contrast behavior. Consume it through
the shared Tailwind preset wherever possible (`bg-ui-surface`,
`text-ui-muted`, `px-ui-gutter`, `shadow-ui`).

Do not map a business state directly to a color. Use `StatusBadge` and the
shared status vocabulary so state always has a text equivalent.

## Responsive shell

`PortalShell` owns the skip link, page landmarks, sticky header, desktop
sidebar, mobile bottom navigation, content width, device safe area, and
comfortable/compact density. Products supply navigation content:

```tsx
<PortalShell
  brand={<Logo />}
  navigation={<PrimaryNavigation />}
  sidebar={<WorkspaceNavigation />}
  bottomNavigation={<MobileNavigation />}
  actions={<AccountMenu />}
  context={<PatientBanner />}
  density="compact"
>
  {children}
</PortalShell>
```

`AppFrame` remains exported for compatibility and delegates to `PortalShell`.

## Production primitives

- `Icon`: shared, current-color SVG icons. Icons are decorative by default;
  provide `label` only when no visible text conveys the same meaning.
- `AsyncBoundary`: combines Suspense loading and recoverable render errors.
  Use `resetKeys` when route/query identity changes.
- `SearchSelect`: keyboard-operable local or abortable async option search.
- `DateTime` / `formatDateTime`: locale and timezone-aware absolute or
  relative display with valid machine-readable `<time>` output.
- `StatusBadge` / `productStatus`: consistent text and tone mappings.

## Interaction and accessibility rules

1. Keep visible focus and a logical DOM order; do not rely on color alone.
2. Use at least 44px targets for primary controls and mobile navigation.
3. Announce loading/errors, keep retry near the failed region, and preserve
   entered values across retries.
4. Confirm consequential clinical/production actions explicitly. Optimistic
   updates are for safely reversible actions only.
5. Test keyboard-only, reduced motion, forced colors, 200% zoom, and widths
   from 320px through wide workstations.

## Validation and component workbench

Pure behavior is covered by the package's Vitest suite. Interactive review can
use either:

- Dashboard workbench: `/playground/foundations`
- Storybook: `pnpm --filter @aurixa/ui-kit storybook`

Cross-product quality gates, privacy-safe analytics rules, and acceptance
criteria live in `docs/FRONTEND_UX_QUALITY.md`. Auth readiness is documented in
`docs/FRONTEND_AUTH.md`.

```sh
pnpm --filter @aurixa/ui-kit test
pnpm --filter @aurixa/ui-kit typecheck
pnpm --filter @aurixa/ui-kit build
pnpm --filter @aurixa/ui-kit storybook
```

Shared healthcare helpers:

- `HealthcareDisclaimer` — emergency / assistant-limits / not-diagnosis copy
- `resolveProductStatus` / `humanizeStatus` — map free-form API statuses
- `AsyncBoundary` — Suspense + recoverable render errors
