"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  PageHeader,
  SectionHeader,
  StatusBadge,
  useToast,
} from "@aurixa/ui-kit";

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

export default function NotificationsPage() {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(raw) });
    } catch {
      // Keep defaults when local storage is unavailable.
    }
    setLoaded(true);
  }, []);

  function update(key: keyof NotificationPrefs, value: boolean) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      toast({
        title: "Saved on this device",
        description: "Delivery still requires a connected notification service.",
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
        description="Choose device-level preferences while understanding that delivery is not connected yet."
        aside={<StatusBadge status="offline" label="Delivery unavailable" />}
      />
      <Alert title="Notification delivery is not connected" tone="warning">
        The current backend does not provide an alert feed, unread state, or verified email, text,
        and push delivery. Preferences below are stored only in this browser.
      </Alert>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <SectionHeader title="Showings" />
          <p className="text-sm leading-6 text-ui-muted">
            Your connected showing schedule remains available in the portal. Check it directly rather
            than relying on a reminder from this site.
          </p>
          <Button asChild variant="secondary" size="sm" className="mt-5">
            <Link href="/showings">Review showings</Link>
          </Button>
        </Card>
        <Card>
          <SectionHeader title="Messages and listings" />
          <p className="text-sm leading-6 text-ui-muted">
            New listing, message, and financing alerts cannot be verified from the connected APIs.
            Continue using the established channels provided by your agent.
          </p>
        </Card>
      </div>
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
