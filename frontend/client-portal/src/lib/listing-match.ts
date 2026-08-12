import type { Listing } from "@/app/api";

export interface ClientSearchPreferences {
  budget_max?: number;
  beds_min?: number;
  areas?: string[];
  pets?: boolean;
}

export interface ListingMatchResult {
  score: number;
  reasons: string[];
  matchesYou: boolean;
}

function listingPrice(listing: Listing): number | undefined {
  return listing.rentAmount ?? listing.listPrice;
}

function listingHaystack(listing: Listing): string {
  const parts = [
    listing.marketingTitle,
    listing.marketingDescription,
    listing.address?.line1,
    listing.address?.city,
    listing.address?.state,
  ];
  return parts.filter(Boolean).join(" ").toLowerCase();
}

/** Rule-based match score from saved client preferences vs listing fields. */
export function scoreListingMatch(
  listing: Listing,
  preferences?: ClientSearchPreferences | null,
): ListingMatchResult {
  if (!preferences || Object.keys(preferences).length === 0) {
    return { score: 0, reasons: [], matchesYou: false };
  }

  const reasons: string[] = [];
  let score = 0;

  const price = listingPrice(listing);
  if (preferences.budget_max != null && price != null) {
    if (price <= preferences.budget_max) {
      score += 1;
      reasons.push("Within budget");
    }
  }

  if (preferences.beds_min != null && listing.beds != null) {
    if (listing.beds >= preferences.beds_min) {
      score += 1;
      reasons.push(`${listing.beds}+ beds`);
    }
  }

  if (preferences.areas?.length) {
    const haystack = listingHaystack(listing);
    const matched = preferences.areas.filter((area) => haystack.includes(area.toLowerCase()));
    if (matched.length > 0) {
      score += 1;
      reasons.push(matched.length === 1 ? matched[0] : `${matched.length} preferred areas`);
    }
  }

  if (preferences.pets) {
    const haystack = listingHaystack(listing);
    if (/pet[- ]?friendly|pets allowed|pet friendly/.test(haystack)) {
      score += 1;
      reasons.push("Pet-friendly");
    }
  }

  return {
    score,
    reasons,
    matchesYou: score >= 2,
  };
}

export function sortListingsByMatch<T extends Listing>(
  listings: T[],
  preferences?: ClientSearchPreferences | null,
): T[] {
  return [...listings].sort((left, right) => {
    const leftScore = scoreListingMatch(left, preferences).score;
    const rightScore = scoreListingMatch(right, preferences).score;
    return rightScore - leftScore;
  });
}
