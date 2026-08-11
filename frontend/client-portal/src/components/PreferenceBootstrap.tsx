"use client";

import { useEffect } from "react";
import {
  applyPatientPreference,
  PATIENT_PREFERENCE_KEYS,
  preferenceEnabled,
  type PatientPreference,
} from "@/lib/patient-preferences";

export function PreferenceBootstrap() {
  useEffect(() => {
    (Object.keys(PATIENT_PREFERENCE_KEYS) as PatientPreference[]).forEach((preference) => {
      applyPatientPreference(
        document.documentElement,
        preference,
        preferenceEnabled(window.localStorage.getItem(PATIENT_PREFERENCE_KEYS[preference])),
      );
    });
  }, []);

  return null;
}
