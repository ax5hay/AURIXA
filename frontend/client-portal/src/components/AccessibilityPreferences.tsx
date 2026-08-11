"use client";

import { useEffect, useState } from "react";
import { Alert, Card, SectionHeader } from "@aurixa/ui-kit";
import {
  applyClientPreference,
  CLIENT_PREFERENCE_KEYS,
  preferenceEnabled,
  type ClientPreference,
} from "@/lib/client-preferences";

const OPTIONS: Array<{
  id: ClientPreference;
  label: string;
  description: string;
}> = [
  {
    id: "largerText",
    label: "Use larger text",
    description: "Increase the portal’s base text size on this device.",
  },
  {
    id: "highContrast",
    label: "Increase contrast",
    description: "Sharpen borders and text contrast for readability.",
  },
  {
    id: "reduceMotion",
    label: "Reduce motion",
    description: "Minimize non-essential animation on this device.",
  },
];

export function AccessibilityPreferences() {
  const [preferences, setPreferences] = useState<Record<ClientPreference, boolean>>({
    largerText: false,
    highContrast: false,
    reduceMotion: false,
  });

  useEffect(() => {
    setPreferences(
      Object.fromEntries(
        OPTIONS.map(({ id }) => [
          id,
          preferenceEnabled(window.localStorage.getItem(CLIENT_PREFERENCE_KEYS[id])),
        ]),
      ) as Record<ClientPreference, boolean>,
    );
  }, []);

  const update = (id: ClientPreference, enabled: boolean) => {
    setPreferences((current) => ({ ...current, [id]: enabled }));
    window.localStorage.setItem(CLIENT_PREFERENCE_KEYS[id], String(enabled));
    applyClientPreference(document.documentElement, id, enabled);
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Display preferences"
        description="These settings apply only on this device and browser."
      />
      <div className="space-y-3">
        {OPTIONS.map((option) => (
          <Card key={option.id} padding="md">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-ui-border-strong"
                checked={preferences[option.id]}
                onChange={(event) => update(option.id, event.target.checked)}
              />
              <span>
                <span className="block font-semibold text-ui-ink">{option.label}</span>
                <span className="mt-1 block text-sm leading-6 text-ui-muted">
                  {option.description}
                </span>
              </span>
            </label>
          </Card>
        ))}
      </div>
      <Alert title="Need accommodation support?" tone="info">
        Contact your agent or property manager before a showing for interpreter services or
        accessibility assistance at a property.
      </Alert>
    </div>
  );
}
