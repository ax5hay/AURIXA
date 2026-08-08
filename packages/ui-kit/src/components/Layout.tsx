import React from "react";
import clsx from "clsx";

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
        "grid gap-6 border-b border-ui-border pb-7 md:grid-cols-[minmax(0,1fr)_auto] md:items-end",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-3 text-xs font-semibold tracking-[0.08em] text-ui-muted">{eyebrow}</p>
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
    <div className="min-h-screen bg-ui-canvas text-ui-ink">
      {navigation}
      <div className="min-w-0">
        {context}
        {children}
      </div>
    </div>
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
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-ui-border-strong bg-ui-tint font-semibold text-ui-accent",
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
