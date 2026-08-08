import { describe, expect, it } from "vitest";
import {
  formatDateTime,
  humanizeStatus,
  productStatus,
  resolveProductStatus,
  toDate,
} from "./Production";

describe("production helpers", () => {
  it("formats an absolute instant in the requested timezone", () => {
    expect(
      formatDateTime("2026-08-08T12:30:00.000Z", {
        locale: "en-US",
        timeZone: "UTC",
      }),
    ).toBe("Aug 8, 2026, 12:30 PM");
  });

  it("formats deterministic relative time", () => {
    expect(
      formatDateTime("2026-08-08T14:00:00.000Z", {
        locale: "en",
        relative: true,
        now: new Date("2026-08-08T12:00:00.000Z"),
      }),
    ).toBe("in 2 hours");
  });

  it("handles invalid input without throwing", () => {
    expect(toDate("not-a-date")).toBeNull();
    expect(formatDateTime("not-a-date")).toBe("Date unavailable");
  });

  it("keeps status meaning independent from presentation", () => {
    expect(productStatus.attention).toEqual({ label: "Action needed", tone: "warning" });
    expect(productStatus.failed).toEqual({ label: "Failed", tone: "danger" });
  });

  it("maps operational API statuses onto the shared vocabulary", () => {
    expect(resolveProductStatus("checked_in")).toBe("attention");
    expect(resolveProductStatus("in_room")).toBe("active");
    expect(resolveProductStatus("cancelled")).toBe("cancelled");
    expect(humanizeStatus("awaiting_approval")).toBe("Awaiting Approval");
  });
});
