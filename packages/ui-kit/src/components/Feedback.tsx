import React from "react";
import clsx from "clsx";

export type FeedbackTone = "neutral" | "info" | "success" | "warning" | "danger";

const toneClasses: Record<FeedbackTone, string> = {
  neutral: "border-ui-border bg-ui-surface-inset text-ui-ink",
  info: "border-ui-info/25 bg-ui-info/10 text-ui-info",
  success: "border-ui-success/25 bg-ui-success/10 text-ui-success",
  warning: "border-ui-warning/25 bg-ui-warning/10 text-ui-warning",
  danger: "border-ui-danger/25 bg-ui-danger/10 text-ui-danger",
};

export function Alert({
  title,
  children,
  tone = "neutral",
  className,
}: {
  title: string;
  children?: React.ReactNode;
  tone?: FeedbackTone;
  className?: string;
}) {
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={clsx("rounded-ui-md border p-4", toneClasses[tone], className)}
    >
      <p className="text-sm font-semibold">{title}</p>
      {children && <div className="mt-1 text-sm leading-6 text-ui-muted">{children}</div>}
    </div>
  );
}

export function Banner({
  title,
  children,
  action,
  tone = "neutral",
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  tone?: FeedbackTone;
}) {
  return (
    <aside
      className={clsx(
        "flex flex-col gap-4 rounded-ui-lg border p-5 sm:flex-row sm:items-center sm:justify-between",
        toneClasses[tone],
      )}
    >
      <div>
        <p className="font-display text-lg font-medium text-ui-ink">{title}</p>
        <div className="mt-1 text-sm leading-6 text-ui-muted">{children}</div>
      </div>
      {action}
    </aside>
  );
}

export function EmptyState({
  eyebrow,
  title,
  description,
  action,
  icon,
  compact = false,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-center rounded-ui-lg border border-dashed border-ui-border-strong bg-ui-surface-inset/50 px-6 text-center",
        compact ? "py-8" : "py-14",
      )}
    >
      {icon && (
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-ui-tint text-ui-accent">
          {icon}
        </span>
      )}
      {eyebrow && (
        <p className="mb-2 text-xs font-semibold tracking-wide text-ui-muted">{eyebrow}</p>
      )}
      <h3 className="font-display text-2xl font-medium tracking-[-0.025em] text-ui-ink">{title}</h3>
      {description && (
        <p className="mt-2 max-w-md text-sm leading-6 text-ui-muted">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={clsx(
        "animate-[ui-skeleton_1.6s_ease-in-out_infinite] rounded-ui-md bg-ui-surface-inset",
        className,
      )}
      {...props}
    />
  );
}

export function PageLoader({ label = "Preparing your view" }: { label?: string }) {
  return (
    <div role="status" className="space-y-5 py-6">
      <span className="sr-only">{label}</span>
      <Skeleton className="h-28 w-full" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <Skeleton className="h-72 w-full" />
    </div>
  );
}
