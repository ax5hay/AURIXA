"use client";

import { useEffect } from "react";
import {
  applyClientPreference,
  CLIENT_PREFERENCE_KEYS,
  preferenceEnabled,
  type ClientPreference,
} from "@/lib/client-preferences";

export function PreferenceBootstrap() {
  useEffect(() => {
    (Object.keys(CLIENT_PREFERENCE_KEYS) as ClientPreference[]).forEach((preference) => {
      applyClientPreference(
        document.documentElement,
        preference,
        preferenceEnabled(window.localStorage.getItem(CLIENT_PREFERENCE_KEYS[preference])),
      );
    });
  }, []);
  return null;
}
