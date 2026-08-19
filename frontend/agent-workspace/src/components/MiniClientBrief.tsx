import Link from "next/link";
import { Badge } from "@aurixa/ui-kit";
import type { Client, Showing } from "../app/api";

function formatPreferenceSummary(preferences?: Client["preferences"]) {
  if (!preferences || Object.keys(preferences).length === 0) return null;
  const parts: string[] = [];
  if (preferences.budget_max != null) {
    parts.push(
      `Budget ≤ ${new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(preferences.budget_max)}`,
    );
  }
  if (preferences.beds_min != null) parts.push(`${preferences.beds_min}+ beds`);
  if (preferences.areas?.length) parts.push(preferences.areas.slice(0, 2).join(", "));
  return parts.join(" · ");
}

/** Compact client brief for Today queue cards. */
export function MiniClientBrief({
  client,
  upcoming,
}: {
  client: Client;
  upcoming?: Showing;
}) {
  const prefs = formatPreferenceSummary(client.preferences);
  return (
    <div className="mt-2 space-y-1 rounded-ui-md bg-ui-surface-inset px-3 py-2 text-xs text-ui-muted">
      {prefs && <p>{prefs}</p>}
      {upcoming ? (
        <p>
          Next tour{" "}
          {new Date(upcoming.startTime).toLocaleString("en-US", {
            weekday: "short",
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
      ) : (
        <p>No upcoming tour — consider scheduling.</p>
      )}
      <Link
        href={`/clients/${client.id}`}
        className="inline-block font-semibold text-ui-accent hover:underline"
      >
        Full brief →
      </Link>
    </div>
  );
}

export function StaleBadge({ days }: { days: number }) {
  return (
    <Badge tone={days >= 14 ? "danger" : "warning"}>
      {days}d stale
    </Badge>
  );
}
