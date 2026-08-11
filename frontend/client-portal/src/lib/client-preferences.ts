export const PATIENT_PREFERENCE_KEYS = {
  largerText: "aurixa-patient-larger-text",
  highContrast: "aurixa-patient-high-contrast",
  reduceMotion: "aurixa-patient-reduce-motion",
} as const;

export type PatientPreference = keyof typeof PATIENT_PREFERENCE_KEYS;

export const preferenceEnabled = (value: string | null) => value === "true";

export function applyPatientPreference(
  root: HTMLElement,
  preference: PatientPreference,
  enabled: boolean,
) {
  const attribute = {
    largerText: "patientLargeText",
    highContrast: "patientHighContrast",
    reduceMotion: "patientReduceMotion",
  }[preference];
  root.dataset[attribute] = String(enabled);
}
