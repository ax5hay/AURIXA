import Link from "next/link";
import { Badge, Button, Card, SectionHeader } from "@aurixa/ui-kit";
import type { Client, Showing } from "../app/api";

function formatPreferenceSummary(preferences?: Client["preferences"]) {
  if (!preferences || Object.keys(preferences).length === 0) {
    return "No saved search preferences on file.";
  }
  const parts: string[] = [];
  if (preferences.budget_max != null) {
    parts.push(
      `Budget up to ${new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(preferences.budget_max)}`,
    );
  }
  if (preferences.beds_min != null) {
    parts.push(`${preferences.beds_min}+ beds`);
  }
  if (preferences.areas?.length) {
    parts.push(`Areas: ${preferences.areas.join(", ")}`);
  }
  if (preferences.pets) {
    parts.push("Pet-friendly required");
  }
  return parts.join(" · ");
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Sixty-second briefing card for agent coordination. */
export function ClientBrief({
  client,
  upcoming,
  showingCount,
}: {
  client: Client;
  upcoming: Showing[];
  showingCount: number;
}) {
  const next = upcoming[0];
  const talkingPoints = [
    formatPreferenceSummary(client.preferences),
    next
      ? `Next tour ${formatWhen(next.startTime)} with ${next.agentName ?? next.providerName ?? "assigned agent"}.`
      : "No upcoming tour scheduled — confirm whether they want to book one.",
    showingCount > 0
      ? `${showingCount} showing${showingCount === 1 ? "" : "s"} on record — review feedback and follow-ups.`
      : "No showing history yet — set expectations for first tour prep.",
  ];

  return (
    <Card variant="feature" padding="lg">
      <SectionHeader
        title="60-second client brief"
        description="Verified identity, preferences, and the next operational move."
      />
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge tone="info">{client.clientType ?? "client"}</Badge>
        {client.preferences?.areas?.map((area) => (
          <Badge key={area} tone="accent">
            {area}
          </Badge>
        ))}
      </div>
      <ul className="mt-5 space-y-3 text-sm leading-6 text-ui-ink">
        {talkingPoints.map((point) => (
          <li key={point} className="flex gap-2">
            <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ui-accent" />
            <span>{point}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex flex-wrap gap-2">
        <Button asChild variant="secondary" size="sm">
          <Link href={`/chat?clientId=${client.id}`}>Open assistant</Link>
        </Button>
        <Button asChild size="sm">
          <Link href={`/schedule?clientId=${client.id}`}>Schedule showing</Link>
        </Button>
      </div>
    </Card>
  );
}
