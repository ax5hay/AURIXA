import React from "react";
import clsx from "clsx";

export type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger" | "info";

const badgeClasses: Record<BadgeTone, string> = {
  neutral: "border-ui-border bg-ui-surface-inset text-ui-muted",
  accent: "border-ui-accent/20 bg-ui-tint text-ui-accent",
  success: "border-ui-success/25 bg-ui-success/10 text-ui-success",
  warning: "border-ui-warning/25 bg-ui-warning/10 text-ui-warning",
  danger: "border-ui-danger/25 bg-ui-danger/10 text-ui-danger",
  info: "border-ui-info/25 bg-ui-info/10 text-ui-info",
};

export function Badge({
  children,
  tone = "neutral",
  dot = false,
  className,
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "ui-re-badge inline-flex min-h-7 items-center gap-1.5 border px-2.5 text-xs font-semibold",
        badgeClasses[tone],
        className,
      )}
    >
      {dot && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function Metric({
  label,
  value,
  detail,
  trend,
  tone = "neutral",
}: {
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
  trend?: React.ReactNode;
  tone?: BadgeTone;
}) {
  return (
    <div className="ui-re-metric first:border-l-0 first:pl-0">
      <p className="text-xs font-semibold text-ui-muted">{label}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="font-display text-3xl font-medium tracking-[-0.04em] text-ui-ink">{value}</p>
        {trend && <Badge tone={tone}>{trend}</Badge>}
      </div>
      {detail && <p className="mt-1 text-xs leading-5 text-ui-faint">{detail}</p>}
    </div>
  );
}

export function DataTable({
  caption,
  headers,
  children,
  className,
}: {
  caption: string;
  headers: React.ReactNode[];
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "ui-re-table overflow-x-auto rounded-ui-lg border border-ui-border",
        className,
      )}
    >
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b border-ui-border bg-ui-surface-inset/65">
          <tr>
            {headers.map((header, index) => (
              <th
                key={
                  typeof header === "string" || typeof header === "number"
                    ? String(header)
                    : React.isValidElement(header) && header.key != null
                      ? header.key
                      : index
                }
                scope="col"
                className="px-4 py-3 text-xs font-semibold text-ui-muted"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ui-border">{children}</tbody>
      </table>
    </div>
  );
}

export function WorkQueue({
  items,
  empty,
}: {
  items: {
    id: string | number;
    title: string;
    description?: string;
    meta?: React.ReactNode;
    leading?: React.ReactNode;
    action?: React.ReactNode;
    urgent?: boolean;
  }[];
  empty?: React.ReactNode;
}) {
  if (!items.length) return <>{empty}</>;
  return (
    <div className="ui-re-table divide-y divide-ui-border rounded-ui-lg border border-ui-border">
      {items.map((item) => (
        <div
          key={item.id}
          className={clsx(
            "grid min-h-20 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3",
            item.urgent && "ui-re-queue-row-urgent",
          )}
        >
          {item.leading ?? <span className="h-2 w-2 rounded-full bg-ui-faint" aria-hidden="true" />}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ui-ink">{item.title}</p>
            {item.description && (
              <p className="mt-0.5 truncate text-xs text-ui-muted">{item.description}</p>
            )}
            {item.meta && <div className="mt-1 text-xs text-ui-faint">{item.meta}</div>}
          </div>
          {item.action}
        </div>
      ))}
    </div>
  );
}

export function Timeline({
  items,
}: {
  items: {
    id: string | number;
    title: string;
    description?: React.ReactNode;
    time?: string;
    icon?: React.ReactNode;
  }[];
}) {
  return (
    <ol className="relative space-y-6 before:absolute before:bottom-3 before:left-[0.95rem] before:top-3 before:w-px before:bg-ui-border-strong">
      {items.map((item) => (
        <li key={item.id} className="relative grid grid-cols-[2rem_minmax(0,1fr)] gap-3">
          <span className="ui-re-timeline-node z-10 flex h-8 w-8 items-center justify-center border border-ui-border-strong text-xs text-ui-accent">
            {item.icon ?? <span className="h-1.5 w-1.5 rounded-sm bg-ui-accent" aria-hidden="true" />}
          </span>
          <div className="pt-1">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-semibold text-ui-ink">{item.title}</p>
              {item.time && (
                <time className="font-mono text-[11px] text-ui-faint">{item.time}</time>
              )}
            </div>
            {item.description && (
              <div className="mt-1 text-sm leading-6 text-ui-muted">{item.description}</div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
