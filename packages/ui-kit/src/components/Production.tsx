import React from "react";
import clsx from "clsx";
import { Badge, type BadgeTone } from "./DataDisplay";

export type ProductStatus =
  | "neutral"
  | "draft"
  | "pending"
  | "active"
  | "complete"
  | "success"
  | "warning"
  | "attention"
  | "error"
  | "failed"
  | "cancelled"
  | "offline";

export interface StatusDefinition {
  label: string;
  tone: BadgeTone;
}

export const productStatus: Record<ProductStatus, StatusDefinition> = {
  neutral: { label: "Not started", tone: "neutral" },
  draft: { label: "Draft", tone: "neutral" },
  pending: { label: "Pending", tone: "info" },
  active: { label: "Active", tone: "accent" },
  complete: { label: "Complete", tone: "success" },
  success: { label: "Successful", tone: "success" },
  warning: { label: "Needs review", tone: "warning" },
  attention: { label: "Action needed", tone: "warning" },
  error: { label: "Error", tone: "danger" },
  failed: { label: "Failed", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  offline: { label: "Offline", tone: "neutral" },
};

/** Map free-form API/domain statuses onto the shared product vocabulary. */
export function resolveProductStatus(status?: string | null): ProductStatus {
  const normalized = (status ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (!normalized || normalized === "unknown") return "neutral";
  if (
    [
      "healthy",
      "active",
      "pass",
      "approved",
      "succeeded",
      "success",
      "complete",
      "completed",
      "confirmed",
      "rolled_back",
      "in_room",
    ].includes(normalized)
  ) {
    return normalized === "confirmed" || normalized === "in_room" || normalized === "active"
      ? "active"
      : "success";
  }
  if (
    [
      "degraded",
      "pending",
      "queued",
      "running",
      "rolling_back",
      "awaiting_approval",
      "warning",
      "checked_in",
      "attention",
      "draft",
    ].includes(normalized)
  ) {
    if (normalized === "draft") return "draft";
    if (normalized === "attention" || normalized === "checked_in") return "attention";
    return "pending";
  }
  if (
    [
      "down",
      "error",
      "fail",
      "failed",
      "rejected",
      "cancelled",
      "canceled",
      "unavailable",
      "suspended",
      "offline",
    ].includes(normalized)
  ) {
    if (normalized === "cancelled" || normalized === "canceled") return "cancelled";
    if (normalized === "offline" || normalized === "unavailable") return "offline";
    return "failed";
  }
  return "neutral";
}

export function humanizeStatus(status?: string | null): string {
  const resolved = resolveProductStatus(status);
  if (!status) return productStatus[resolved].label;
  const known = productStatus[status as ProductStatus];
  if (known) return known.label;
  return status
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: ProductStatus | string;
  label?: string;
  className?: string;
}) {
  const resolved =
    status in productStatus ? (status as ProductStatus) : resolveProductStatus(status);
  const definition = productStatus[resolved];
  return (
    <Badge tone={definition.tone} dot className={className}>
      {label ?? (status in productStatus ? definition.label : humanizeStatus(status))}
    </Badge>
  );
}

export interface DateTimeFormatOptions {
  locale?: string;
  timeZone?: string;
  includeTime?: boolean;
  includeYear?: boolean;
  relative?: boolean;
  now?: Date;
}

export function toDate(value: Date | string | number): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateTime(
  value: Date | string | number,
  {
    locale,
    timeZone,
    includeTime = true,
    includeYear = true,
    relative = false,
    now = new Date(),
  }: DateTimeFormatOptions = {},
): string {
  const date = toDate(value);
  if (!date) return "Date unavailable";

  if (relative) {
    const deltaSeconds = Math.round((date.getTime() - now.getTime()) / 1000);
    const intervals: [Intl.RelativeTimeFormatUnit, number][] = [
      ["year", 31_536_000],
      ["month", 2_592_000],
      ["week", 604_800],
      ["day", 86_400],
      ["hour", 3_600],
      ["minute", 60],
    ];
    const interval = intervals.find(([, seconds]) => Math.abs(deltaSeconds) >= seconds);
    if (interval) {
      return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
        Math.round(deltaSeconds / interval[1]),
        interval[0],
      );
    }
    return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(deltaSeconds, "second");
  }

  return new Intl.DateTimeFormat(locale, {
    timeZone,
    month: "short",
    day: "numeric",
    year: includeYear ? "numeric" : undefined,
    hour: includeTime ? "numeric" : undefined,
    minute: includeTime ? "2-digit" : undefined,
  }).format(date);
}

export function DateTime({
  value,
  locale,
  timeZone,
  includeTime,
  includeYear,
  relative,
  now,
  className,
}: DateTimeFormatOptions & {
  value: Date | string | number;
  className?: string;
}) {
  const date = toDate(value);
  const label = formatDateTime(value, {
    locale,
    timeZone,
    includeTime,
    includeYear,
    relative,
    now,
  });

  return (
    <time
      dateTime={date?.toISOString()}
      title={
        relative && date
          ? formatDateTime(date, { locale, timeZone, includeTime: true, includeYear: true })
          : undefined
      }
      className={clsx("tabular-nums", className)}
    >
      {label}
    </time>
  );
}
