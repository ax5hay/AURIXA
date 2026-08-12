import type { ConversationSummary, Listing, Showing } from "@/app/api";
import { scoreListingMatch, type ClientSearchPreferences } from "./listing-match";

export type NotificationTone = "info" | "warning" | "success";

export interface ClientNotification {
  id: string;
  title: string;
  body: string;
  href: string;
  tone: NotificationTone;
  at: string;
  category: "showing" | "listing" | "message";
}

function hoursUntil(iso: string) {
  return (new Date(iso).getTime() - Date.now()) / 3_600_000;
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

/** Build an in-app notification feed from live portal data (no push delivery). */
export function buildClientNotifications(input: {
  showings: Showing[];
  listings: Listing[];
  conversations: ConversationSummary[];
  preferences?: ClientSearchPreferences | null;
}): ClientNotification[] {
  const items: ClientNotification[] = [];
  const now = new Date();

  const upcoming = input.showings
    .filter((showing) => showing.status === "confirmed" && new Date(showing.startTime) > now)
    .sort((left, right) => left.startTime.localeCompare(right.startTime));

  for (const showing of upcoming.slice(0, 3)) {
    const hours = hoursUntil(showing.startTime);
    const agent = showing.agentName || showing.providerName || "your agent";
    if (hours <= 24) {
      items.push({
        id: `showing-soon-${showing.id}`,
        title: hours <= 2 ? "Tour starting soon" : "Tour within 24 hours",
        body: `${formatWhen(showing.startTime)} with ${agent}.`,
        href: `/showings/${showing.id}`,
        tone: hours <= 2 ? "warning" : "info",
        at: showing.startTime,
        category: "showing",
      });
    } else if (hours <= 168) {
      items.push({
        id: `showing-week-${showing.id}`,
        title: "Upcoming property tour",
        body: `${formatWhen(showing.startTime)} with ${agent}.`,
        href: `/showings/${showing.id}`,
        tone: "info",
        at: showing.startTime,
        category: "showing",
      });
    }
  }

  const matching = input.listings.filter(
    (listing) => scoreListingMatch(listing, input.preferences).matchesYou,
  );
  if (matching.length > 0) {
    items.push({
      id: "listings-match",
      title: `${matching.length} listing${matching.length === 1 ? "" : "s"} match your preferences`,
      body: "Review homes that fit your saved budget, beds, and area criteria.",
      href: "/listings",
      tone: "success",
      at: now.toISOString(),
      category: "listing",
    });
  } else if (input.listings.length > 0) {
    items.push({
      id: "listings-active",
      title: `${input.listings.length} active listing${input.listings.length === 1 ? "" : "s"}`,
      body: "Browse current inventory from your organization.",
      href: "/listings",
      tone: "info",
      at: now.toISOString(),
      category: "listing",
    });
  }

  const recentConversation = [...input.conversations]
    .filter((entry) => entry.createdAt)
    .sort((left, right) => (right.createdAt ?? "").localeCompare(left.createdAt ?? ""))[0];
  if (recentConversation?.createdAt) {
    items.push({
      id: `conversation-${recentConversation.id}`,
      title: "Continue your conversation",
      body: recentConversation.prompt
        ? `Last topic: “${recentConversation.prompt.slice(0, 72)}${recentConversation.prompt.length > 72 ? "…" : ""}”`
        : "Pick up where you left off in Messages.",
      href: "/chat",
      tone: "info",
      at: recentConversation.createdAt,
      category: "message",
    });
  }

  return items.sort((left, right) => right.at.localeCompare(left.at));
}
