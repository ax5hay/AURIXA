import { describe, expect, it } from "vitest";
import { applyPatientPreference, preferenceEnabled } from "./patient-preferences";
import { isSectionActive, PATIENT_SECTIONS } from "./patient-sections";

describe("patient expansion navigation", () => {
  it("includes every expanded patient area without duplicate routes", () => {
    const routes = PATIENT_SECTIONS.map((section) => section.href);
    expect(routes).toEqual([
      "/records",
      "/results",
      "/documents",
      "/medications",
      "/refills",
      "/billing",
      "/insurance",
      "/notifications",
    ]);
    expect(new Set(routes).size).toBe(routes.length);
  });

  it("keeps related routes active in their navigation group", () => {
    expect(isSectionActive("/results", "/records", ["/results", "/documents"])).toBe(true);
    expect(isSectionActive("/insurance", "/billing", ["/insurance"])).toBe(true);
    expect(isSectionActive("/appointments", "/records", ["/results"])).toBe(false);
  });
});

describe("local patient preferences", () => {
  it("only treats an explicit true value as enabled", () => {
    expect(preferenceEnabled("true")).toBe(true);
    expect(preferenceEnabled("false")).toBe(false);
    expect(preferenceEnabled(null)).toBe(false);
  });

  it("maps preferences to portal data attributes", () => {
    const root = { dataset: {} } as unknown as HTMLElement;
    applyPatientPreference(root, "highContrast", true);
    applyPatientPreference(root, "reduceMotion", false);
    expect(root.dataset.patientHighContrast).toBe("true");
    expect(root.dataset.patientReduceMotion).toBe("false");
  });
});
