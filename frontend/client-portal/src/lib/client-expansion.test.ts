import { describe, expect, it } from "vitest";
import { applyClientPreference, preferenceEnabled } from "./client-preferences";
import { isSectionActive, CLIENT_SECTIONS } from "./client-sections";

describe("client expansion navigation", () => {
  it("includes every expanded client area without duplicate routes", () => {
    const routes = CLIENT_SECTIONS.map((section) => section.href);
    expect(routes).toEqual([
      "/listings",
      "/documents",
      "/applications",
      "/financing",
      "/maintenance",
      "/notifications",
    ]);
    expect(new Set(routes).size).toBe(routes.length);
  });

  it("keeps related routes active in their navigation group", () => {
    expect(isSectionActive("/applications", "/documents", ["/applications"])).toBe(true);
    expect(isSectionActive("/maintenance", "/financing", ["/maintenance"])).toBe(true);
    expect(isSectionActive("/showings", "/listings", ["/documents"])).toBe(false);
  });
});

describe("local client preferences", () => {
  it("only treats an explicit true value as enabled", () => {
    expect(preferenceEnabled("true")).toBe(true);
    expect(preferenceEnabled("false")).toBe(false);
    expect(preferenceEnabled(null)).toBe(false);
  });

  it("maps preferences to portal data attributes", () => {
    const root = { dataset: {} } as unknown as HTMLElement;
    applyClientPreference(root, "highContrast", true);
    applyClientPreference(root, "reduceMotion", false);
    expect(root.dataset.clientHighContrast).toBe("true");
    expect(root.dataset.clientReduceMotion).toBe("false");
  });
});
