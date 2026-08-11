"use client";

import { useEffect, useState } from "react";
import { Alert, Card, SectionHeader } from "@aurixa/ui-kit";
import {
  applyPatientPreference,
  PATIENT_PREFERENCE_KEYS,
  preferenceEnabled,
  type PatientPreference,
} from "@/lib/patient-preferences";

const OPTIONS: Array<{
  id: PatientPreference;
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
    description: "Strengthen borders and text contrast throughout the portal.",
  },
  {
    id: "reduceMotion",
    label: "Reduce motion",
    description: "Minimize transitions even when your device setting allows motion.",
  },
];

export function AccessibilityPreferences() {
  const [preferences, setPreferences] = useState<Record<PatientPreference, boolean>>({
    largerText: false,
    highContrast: false,
    reduceMotion: false,
  });

  useEffect(() => {
    setPreferences(
      Object.fromEntries(
        OPTIONS.map(({ id }) => [
          id,
          preferenceEnabled(window.localStorage.getItem(PATIENT_PREFERENCE_KEYS[id])),
        ]),
      ) as Record<PatientPreference, boolean>,
    );
  }, []);

  const update = (id: PatientPreference, enabled: boolean) => {
    setPreferences((current) => ({ ...current, [id]: enabled }));
    window.localStorage.setItem(PATIENT_PREFERENCE_KEYS[id], String(enabled));
    applyPatientPreference(document.documentElement, id, enabled);
  };

  return (
    <Card>
      <SectionHeader
        title="Display and motion"
        description="These preferences stay in this browser. They do not update your medical record."
      />
      <div className="divide-y divide-ui-border rounded-ui-md border border-ui-border">
        {OPTIONS.map((option) => (
          <label
            key={option.id}
            className="flex min-h-16 cursor-pointer items-center justify-between gap-4 p-4"
          >
            <span>
              <span className="block font-semibold text-ui-ink">{option.label}</span>
              <span className="mt-1 block text-sm leading-5 text-ui-muted">
                {option.description}
              </span>
            </span>
            <input
              type="checkbox"
              checked={preferences[option.id]}
              onChange={(event) => update(option.id, event.target.checked)}
              className="h-6 w-6 shrink-0 rounded border-ui-border-strong text-ui-accent"
            />
          </label>
        ))}
      </div>
      <Alert title="Need another accommodation?" tone="info" className="mt-5">
        Contact your care team before a visit for interpreter services, communication support,
        mobility access, or other care accommodations.
      </Alert>
    </Card>
  );
}
