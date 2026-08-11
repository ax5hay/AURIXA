import React from "react";
import clsx from "clsx";

export type PortalDensity = "comfortable" | "compact";

export interface PortalShellProps {
  children: React.ReactNode;
  /** Product mark or tenant identity shown at the start of the header. */
  brand?: React.ReactNode;
  /** Primary navigation. On narrow viewports prefer bottomNavigation. */
  navigation?: React.ReactNode;
  /** Optional desktop navigation or contextual rail. */
  sidebar?: React.ReactNode;
  /** Mobile primary navigation, anchored above the device safe area. */
  bottomNavigation?: React.ReactNode;
  /** Persistent header actions such as search, alerts, and account controls. */
  actions?: React.ReactNode;
  /** Context shown before the page content, such as a patient banner. */
  context?: React.ReactNode;
  header?: React.ReactNode;
  density?: PortalDensity;
  mainId?: string;
  skipLabel?: string;
  className?: string;
  contentClassName?: string;
}

/**
 * Shared responsive application frame. Slots deliberately accept product-owned
 * content while the shell owns landmarks, focus order, safe areas, and density.
 */
export function PortalShell({
  children,
  brand,
  navigation,
  sidebar,
  bottomNavigation,
  actions,
  context,
  header,
  density = "comfortable",
  mainId = "main-content",
  skipLabel = "Skip to main content",
  className,
  contentClassName,
}: PortalShellProps) {
  const hasHeader = Boolean(header || brand || navigation || actions);

  return (
    <div
      className={clsx(
        "ui-re-backdrop min-h-dvh bg-ui-canvas text-ui-ink",
        bottomNavigation && "pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0",
        className,
      )}
      data-density={density}
    >
      <a
        href={`#${mainId}`}
        className="sr-only z-[200] rounded-ui-md bg-ui-accent px-4 py-3 font-semibold text-ui-accent-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        {skipLabel}
      </a>

      {hasHeader &&
        (header ?? (
          <header className="ui-re-header-accent sticky top-0 z-40 border-b border-ui-border bg-ui-canvas/95 backdrop-blur supports-[backdrop-filter]:bg-ui-canvas/85">
            <div
              className={clsx(
                "mx-auto flex w-full items-center gap-4 px-ui-gutter",
                density === "compact" ? "min-h-14" : "min-h-16",
              )}
            >
              {brand && <div className="shrink-0">{brand}</div>}
              {navigation && (
                <nav aria-label="Primary" className="hidden min-w-0 flex-1 lg:block">
                  {navigation}
                </nav>
              )}
              {actions && <div className="ml-auto flex shrink-0 items-center gap-2">{actions}</div>}
            </div>
          </header>
        ))}

      <div
        className={clsx(
          "mx-auto grid w-full",
          sidebar && "lg:grid-cols-[var(--ui-shell-sidebar)_minmax(0,1fr)]",
        )}
      >
        {sidebar && (
          <aside
            aria-label="Workspace navigation"
            className="hidden border-r border-ui-border bg-ui-canvas-subtle lg:block"
          >
            <div className="sticky top-16 max-h-[calc(100dvh-4rem)] overflow-y-auto p-ui-gutter">
              {sidebar}
            </div>
          </aside>
        )}
        <div className="min-w-0">
          {context && (
            <section aria-label="Current context" className="border-b border-ui-border">
              {context}
            </section>
          )}
          <main
            id={mainId}
            tabIndex={-1}
            className={clsx(
              "mx-auto w-full max-w-[var(--ui-shell-content)] px-ui-gutter py-ui-section",
              density === "compact" && "py-5",
              contentClassName,
            )}
          >
            {children}
          </main>
        </div>
      </div>

      {bottomNavigation && (
        <nav
          aria-label="Primary"
          className="ui-re-mobile-nav fixed inset-x-0 bottom-0 z-50 border-t border-ui-border pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
        >
          <div className="mx-auto min-h-16 max-w-lg">{bottomNavigation}</div>
        </nav>
      )}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  aside,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  aside?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={clsx(
        "ui-re-page-header grid gap-6 border-b border-ui-border pb-7 md:grid-cols-[minmax(0,1fr)_auto] md:items-end",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <>
            <p className="ui-re-eyebrow mb-3 text-xs font-semibold tracking-[0.08em] text-ui-muted">
              {eyebrow}
            </p>
            <div className="ui-re-section-rule" aria-hidden="true" />
          </>
        )}
        <h1 className="font-display text-[clamp(2.25rem,5vw,4.5rem)] font-medium leading-[0.94] tracking-[-0.045em] text-ui-ink">
          {title}
        </h1>
        {description && (
          <div className="mt-4 max-w-2xl text-base leading-7 text-ui-muted">{description}</div>
        )}
        {actions && <div className="mt-6 flex flex-wrap gap-3">{actions}</div>}
      </div>
      {aside && <div className="md:justify-self-end">{aside}</div>}
    </header>
  );
}

export function SectionHeader({
  title,
  description,
  action,
  count,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  count?: number;
}) {
  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="font-display text-2xl font-medium tracking-[-0.025em] text-ui-ink">
          {title}
          {count != null && (
            <span className="ml-2 font-sans text-sm font-medium text-ui-faint">{count}</span>
          )}
        </h2>
        {description && <p className="mt-1 text-sm leading-6 text-ui-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function AppFrame({
  navigation,
  children,
  context,
}: {
  navigation: React.ReactNode;
  children: React.ReactNode;
  context?: React.ReactNode;
}) {
  return (
    <PortalShell navigation={navigation} context={context}>
      {children}
    </PortalShell>
  );
}

export function Avatar({
  name,
  src,
  size = "md",
  status,
}: {
  name: string;
  src?: string;
  size?: "sm" | "md" | "lg";
  status?: "online" | "away" | "offline";
}) {
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const accessibleLabel = status ? `${name}, ${status}` : name;

  return (
    <span
      className={clsx(
        "ui-re-avatar relative inline-flex shrink-0 items-center justify-center overflow-hidden border border-ui-border-strong font-semibold text-ui-accent",
        size === "sm" && "h-8 w-8 text-[10px]",
        size === "md" && "h-10 w-10 text-xs",
        size === "lg" && "h-14 w-14 text-sm",
      )}
      role="img"
      aria-label={accessibleLabel}
    >
      {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : initials}
      {status && (
        <span
          aria-hidden="true"
          className={clsx(
            "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-ui-surface",
            status === "online" && "bg-ui-success",
            status === "away" && "bg-ui-warning",
            status === "offline" && "bg-ui-faint",
          )}
        />
      )}
    </span>
  );
}
