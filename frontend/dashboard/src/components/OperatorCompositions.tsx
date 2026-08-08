import { Badge, Metric, type BadgeTone } from "@aurixa/ui-kit";
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

export function StatusBadge({ status, label }: { status?: string; label?: string }) {
  const normalized = status?.toLowerCase() ?? "unknown";
  const tone: BadgeTone =
    normalized === "healthy" || normalized === "active" || normalized === "pass"
      ? "success"
      : normalized === "degraded" || normalized === "pending" || normalized === "warning"
        ? "warning"
        : normalized === "down" || normalized === "error" || normalized === "suspended"
          ? "danger"
          : "neutral";
  return (
    <Badge tone={tone} dot>
      {label ?? status ?? "Unknown"}
    </Badge>
  );
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
