export const CLIENT_PREFERENCE_KEYS = {
  largerText: "aurixa-client-larger-text",
  highContrast: "aurixa-client-high-contrast",
  reduceMotion: "aurixa-client-reduce-motion",
} as const;

export type ClientPreference = keyof typeof CLIENT_PREFERENCE_KEYS;

export const preferenceEnabled = (value: string | null) => value === "true";

export function applyClientPreference(
  root: HTMLElement,
  preference: ClientPreference,
  enabled: boolean,
) {
  const datasetKey = {
    largerText: "clientLargeText",
    highContrast: "clientHighContrast",
    reduceMotion: "clientReduceMotion",
  }[preference] as keyof DOMStringMap;
  root.dataset[datasetKey] = String(enabled);
}
