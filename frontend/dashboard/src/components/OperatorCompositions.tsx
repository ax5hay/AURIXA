import {
  Metric,
  StatusBadge as UiStatusBadge,
  humanizeStatus,
  type BadgeTone,
} from "@aurixa/ui-kit";
import { cn } from "@/lib/utils";

export function PageShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("page-container", className)}>{children}</div>;
}

export function MetricStrip({
  items,
}: {
  items: { label: string; value: React.ReactNode; detail?: React.ReactNode; tone?: BadgeTone }[];
}) {
  return (
    <div className="metric-strip">
      {items.map((item) => (
        <Metric key={item.label} {...item} />
      ))}
    </div>
  );
}

/** Operator-facing status chip using the shared ui-kit vocabulary. */
export function StatusBadge({ status, label }: { status?: string; label?: string }) {
  return <UiStatusBadge status={status ?? "unknown"} label={label ?? humanizeStatus(status)} />;
}

export function FilterBar({
  children,
  result,
}: {
  children: React.ReactNode;
  result?: React.ReactNode;
}) {
  return (
    <div className="filter-bar">
      <div className="flex min-w-0 flex-1 flex-wrap gap-3">{children}</div>
      {result && <div className="text-xs text-ui-muted">{result}</div>}
    </div>
  );
}
