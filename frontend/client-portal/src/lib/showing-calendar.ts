import type { Showing } from "@/app/api";

function stamp(value: string) {
  return new Date(value)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

function escapeIcs(value: string) {
  return value.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
}

/** Build and download an ICS calendar entry for a property showing. */
export function downloadShowingCalendar(
  showing: Showing,
  options?: { propertyTitle?: string; location?: string },
) {
  const agent = showing.agentName || showing.providerName || "Agent";
  const summary = options?.propertyTitle
    ? escapeIcs(`Tour: ${options.propertyTitle}`)
    : escapeIcs(`Property showing with ${agent}`);
  const location = options?.location ? escapeIcs(options.location) : undefined;
  const calendar = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AURIXA//Client Portal//EN",
    "BEGIN:VEVENT",
    `UID:showing-${showing.id}@aurixa`,
    `DTSTART:${stamp(showing.startTime)}`,
    `DTEND:${stamp(showing.endTime)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${escapeIcs(`Property tour with ${agent}. Confirm address and instructions before you leave.`)}`,
    ...(location ? [`LOCATION:${location}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([calendar], { type: "text/calendar;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `aurixa-showing-${showing.id}.ics`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function formatAddressLine(address?: {
  line1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
}) {
  if (!address) return "";
  return [address.line1, address.city, address.state, address.postalCode].filter(Boolean).join(", ");
}

export function mapsDirectionsUrl(address?: {
  line1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
}) {
  const query = formatAddressLine(address);
  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
