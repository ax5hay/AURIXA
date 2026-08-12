"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge, Button, Card } from "@aurixa/ui-kit";
import type { Listing, Showing } from "@/app/api";
import {
  downloadShowingCalendar,
  formatAddressLine,
  mapsDirectionsUrl,
} from "@/lib/showing-calendar";

const PREP_BULLETS = [
  "Confirm the property address and any access instructions with your agent.",
  "Bring photo ID; buyers should bring pre-approval or proof of funds if requested.",
  "Note questions about HOA rules, utilities, and timeline before you arrive.",
];

function formatTourDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function countdownLabel(startTime: string) {
  const ms = new Date(startTime).getTime() - Date.now();
  if (ms <= 0) return "Tour time";
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  if (hours >= 48) {
    const days = Math.ceil(ms / 86_400_000);
    return `In ${days} day${days === 1 ? "" : "s"}`;
  }
  if (hours >= 1) return `In ${hours}h ${minutes}m`;
  return `In ${minutes} minute${minutes === 1 ? "" : "s"}`;
}

export function TourDayCard({
  showing,
  listing,
}: {
  showing: Showing;
  listing?: Listing | null;
}) {
  const [countdown, setCountdown] = useState(() => countdownLabel(showing.startTime));

  useEffect(() => {
    const tick = () => setCountdown(countdownLabel(showing.startTime));
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [showing.startTime]);

  const agentName = showing.agentName || showing.providerName || "your agent";
  const propertyTitle =
    listing?.marketingTitle || (listing ? `Listing #${listing.id}` : "Property tour");
  const addressLine = formatAddressLine(listing?.address);
  const directionsUrl = mapsDirectionsUrl(listing?.address);

  const calendarLocation = useMemo(
    () => (addressLine ? addressLine : undefined),
    [addressLine],
  );

  return (
    <Card variant="feature" padding="lg" className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-wide text-ui-accent">Tour day</p>
          <Badge tone="accent" dot className="mt-3">
            {countdown}
          </Badge>
        </div>
        <Badge tone="success" dot>
          Confirmed
        </Badge>
      </div>

      <h2 className="mt-4 max-w-2xl font-display text-3xl font-medium tracking-[-0.035em] text-ui-ink sm:text-4xl">
        {propertyTitle}
      </h2>
      <p className="mt-3 text-base leading-7 text-ui-muted">
        {formatTourDate(showing.startTime)} with {agentName}.
        {addressLine ? ` ${addressLine}.` : ""}
      </p>

      {addressLine && (
        <p className="mt-2 text-sm text-ui-faint">{addressLine}</p>
      )}

      <ul className="mt-6 space-y-2 text-sm leading-6 text-ui-ink">
        {PREP_BULLETS.map((bullet) => (
          <li key={bullet} className="flex gap-2">
            <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ui-accent" />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button asChild>
          <Link href={`/showings/${showing.id}`}>Tour details</Link>
        </Button>
        {directionsUrl && (
          <Button asChild variant="secondary">
            <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
              Get directions
            </a>
          </Button>
        )}
        <Button
          variant="secondary"
          onClick={() =>
            downloadShowingCalendar(showing, {
              propertyTitle,
              location: calendarLocation,
            })
          }
        >
          Add to calendar
        </Button>
      </div>
    </Card>
  );
}
