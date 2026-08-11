import { describe, expect, it } from "vitest";
import { findSchedulingConflict } from "./scheduling";
import type { Appointment } from "@/app/api";

const appointment: Appointment = {
  id: 1,
  startTime: "2026-08-10T09:00:00",
  endTime: "2026-08-10T09:30:00",
  providerName: "Dr. Lee",
  status: "confirmed",
};

describe("findSchedulingConflict", () => {
  it("finds active overlapping provider appointments", () => {
    expect(findSchedulingConflict([appointment], "Dr. Lee", "2026-08-10", "09:15")).toEqual(
      appointment,
    );
  });

  it("ignores cancelled, other-provider, and adjacent slots", () => {
    expect(
      findSchedulingConflict([{ ...appointment, status: "cancelled" }], "Dr. Lee", "2026-08-10", "09:00"),
    ).toBeNull();
    expect(findSchedulingConflict([appointment], "Dr. Patel", "2026-08-10", "09:00")).toBeNull();
    expect(findSchedulingConflict([appointment], "Dr. Lee", "2026-08-10", "09:30")).toBeNull();
  });
});
