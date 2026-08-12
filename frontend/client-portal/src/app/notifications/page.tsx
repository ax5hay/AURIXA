"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  PageHeader,
  PageLoader,
  SectionHeader,
  StatusBadge,
  useToast,
} from "@aurixa/ui-kit";
import { getNotificationSummary } from "../api";
import { buildClientNotifications } from "@/lib/client-notifications";

const STORAGE_KEY = "aurixa.client.notification-prefs";

type NotificationPrefs = {
  showingReminders: boolean;
  messageAlerts: boolean;
  listingAlerts: boolean;
};

const DEFAULT_PREFS: NotificationPrefs = {
  showingReminders: true,
  messageAlerts: true,
  listingAlerts: false,
};

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function NotificationsPage() {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [loaded, setLoaded] = useState(false);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof getNotificationSummary>> | null>(
    null,
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(raw) });
    } catch {
      // Keep defaults when local storage is unavailable.
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    getNotificationSummary()
      .then(setSummary)
      .catch(() => setFeedError("Live updates could not be loaded from your portal data."))
      .finally(() => setLoadingFeed(false));
  }, []);

  const notifications = useMemo(() => {
    if (!summary) return [];
    return buildClientNotifications({
      showings: summary.showings,
      listings: summary.listings,
      conversations: summary.conversations,
      preferences: summary.preferences,
    }).filter((item) => {
      if (item.category === "showing") return prefs.showingReminders;
      if (item.category === "listing") return prefs.listingAlerts || item.id === "listings-match";
      if (item.category === "message") return prefs.messageAlerts;
      return true;
    });
  }, [summary, prefs]);

  function update(key: keyof NotificationPrefs, value: boolean) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      toast({
        title: "Saved on this device",
        description: "Filters apply to this in-app feed. Push delivery is not connected yet.",
        tone: "info",
      });
    } catch {
      toast({
        title: "Could not save preference",
        description: "Local storage is unavailable in this browser session.",
        tone: "error",
      });
    }
  }

  return (
    <div className="space-y-8 py-8 sm:py-10">
      <PageHeader
        eyebrow="Updates and reminders"
        title="Notifications"
        description="Live updates computed from your showings, listings, and saved messages."
        aside={<StatusBadge status="online" label="In-app feed" />}
      />

      {feedError && (
        <Alert title="Some updates unavailable" tone="warning">
          {feedError}
        </Alert>
      )}

      <Card>
        <SectionHeader
          title="Your updates"
          description={
            loadingFeed
              ? "Loading from your portal data…"
              : `${notifications.length} update${notifications.length === 1 ? "" : "s"} right now`
          }
        />
        {loadingFeed ? (
          <PageLoader label="Loading updates" />
        ) : notifications.length === 0 ? (
          <p className="mt-4 text-sm leading-6 text-ui-muted">
            No updates match your filters. Check showings and listings directly, or adjust device
            preferences below.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {notifications.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="block rounded-ui-md border border-ui-border px-4 py-3 transition-colors hover:bg-ui-surface-inset"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-ui-ink">{item.title}</p>
                    <span className="shrink-0 text-xs text-ui-faint">{formatWhen(item.at)}</span>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-ui-muted">{item.body}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Alert title="Push and email delivery is not connected" tone="info">
        This feed is built from live portal data on each visit. Device preferences below filter what
        you see here; they do not send texts or push notifications yet.
      </Alert>

      <Card>
        <SectionHeader
          title="Device preferences"
          description={loaded ? "Saved locally in this browser." : "Loading saved preferences…"}
        />
        <ul className="mt-4 space-y-3">
          {(
            [
              ["showingReminders", "Showing reminders"],
              ["messageAlerts", "Message alerts"],
              ["listingAlerts", "Listing alerts"],
            ] as const
          ).map(([key, label]) => (
            <li
              key={key}
              className="flex min-h-11 items-center justify-between gap-3 rounded-ui-md border border-ui-border px-3"
            >
              <label htmlFor={key} className="text-sm font-semibold text-ui-ink">
                {label}
              </label>
              <input
                id={key}
                type="checkbox"
                className="h-5 w-5 accent-[rgb(var(--ui-accent-rgb))]"
                checked={prefs[key]}
                onChange={(event) => update(key, event.target.checked)}
              />
            </li>
          ))}
        </ul>
        <Button asChild variant="secondary" size="sm" className="mt-5">
          <Link href="/account/accessibility">Accessibility settings</Link>
        </Button>
      </Card>
    </div>
  );
}
