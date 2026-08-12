import { describe, expect, it } from "vitest";
import { scoreListingMatch, sortListingsByMatch } from "./listing-match";
import type { Listing } from "@/app/api";

const baseListing: Listing = {
  id: 1,
  listPrice: 480000,
  beds: 3,
  marketingTitle: "Downtown loft with skyline views",
  marketingDescription: "Walkable Westside location.",
};

describe("listing match scoring", () => {
  it("returns no match without preferences", () => {
    expect(scoreListingMatch(baseListing, null).matchesYou).toBe(false);
  });

  it("scores budget, beds, and area together", () => {
    const result = scoreListingMatch(baseListing, {
      budget_max: 500000,
      beds_min: 3,
      areas: ["Downtown", "Westside"],
    });
    expect(result.score).toBeGreaterThanOrEqual(3);
    expect(result.matchesYou).toBe(true);
    expect(result.reasons).toContain("Within budget");
  });

  it("sorts listings by match score", () => {
    const listings: Listing[] = [
      { id: 1, listPrice: 700000, beds: 2 },
      { id: 2, listPrice: 450000, beds: 3 },
    ];
    const sorted = sortListingsByMatch(listings, { budget_max: 500000, beds_min: 3 });
    expect(sorted[0]?.id).toBe(2);
  });
});
