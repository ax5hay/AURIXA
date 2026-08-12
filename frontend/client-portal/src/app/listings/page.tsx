"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  PageLoader,
  SectionHeader,
} from "@aurixa/ui-kit";
import { getClient, getListings, type ClientProfile, type Listing } from "../api";
import { scoreListingMatch, sortListingsByMatch } from "@/lib/listing-match";

function formatPrice(listing: Listing) {
  const amount = listing.rentAmount ?? listing.listPrice;
  if (amount == null) return "Price on request";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function ListingsPage() {
  const searchParams = useSearchParams();
  const comparePrefill = searchParams.get("compare")?.split(",").map(Number).filter(Boolean) ?? [];
  const [listings, setListings] = useState<Listing[]>([]);
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number[]>(comparePrefill.slice(0, 2));

  useEffect(() => {
    Promise.all([getListings(), getClient().catch(() => null)])
      .then(([listingRecords, profile]) => {
        setListings(listingRecords);
        setClient(profile);
      })
      .catch(() => setError("Listings could not be loaded."))
      .finally(() => setLoading(false));
  }, []);

  const preferences = client?.preferences;
  const sortedListings = useMemo(
    () => sortListingsByMatch(listings, preferences),
    [listings, preferences],
  );

  function toggleSelected(listingId: number) {
    setSelected((current) => {
      if (current.includes(listingId)) return current.filter((id) => id !== listingId);
      if (current.length >= 2) return [current[1]!, listingId];
      return [...current, listingId];
    });
  }

  if (loading) return <PageLoader label="Loading listings" />;

  const compareHref =
    selected.length === 2 ? `/listings/compare?ids=${selected.join(",")}` : null;

  return (
    <div className="space-y-10 py-8 sm:py-10">
      <PageHeader
        eyebrow="Market"
        title="Listings"
        description="Active properties from your brokerage or property manager."
        aside={
          compareHref ? (
            <Button asChild>
              <Link href={compareHref}>Compare selected</Link>
            </Button>
          ) : selected.length === 1 ? (
            <p className="text-sm text-ui-muted">Select one more listing to compare.</p>
          ) : undefined
        }
      />

      {error && (
        <Alert title="Listings unavailable" tone="danger">
          {error}
        </Alert>
      )}

      {!error && listings.length === 0 ? (
        <EmptyState
          title="No active listings"
          description="Check back later or ask your agent about upcoming inventory."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {sortedListings.map((listing) => {
            const match = scoreListingMatch(listing, preferences);
            const isSelected = selected.includes(listing.id);
            return (
              <Card key={listing.id} variant="interactive">
                <div className="flex items-start justify-between gap-3">
                  <SectionHeader
                    title={listing.marketingTitle || `Listing #${listing.id}`}
                    description={formatPrice(listing)}
                  />
                  <label className="flex min-h-11 shrink-0 items-center gap-2 text-xs font-semibold text-ui-muted">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[rgb(var(--ui-accent-rgb))]"
                      checked={isSelected}
                      onChange={() => toggleSelected(listing.id)}
                      aria-label={`Select listing ${listing.marketingTitle || listing.id} for compare`}
                    />
                    Compare
                  </label>
                </div>
                {match.matchesYou && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge tone="accent" dot>
                      Matches you
                    </Badge>
                    {match.reasons.map((reason) => (
                      <Badge key={reason} tone="success">
                        {reason}
                      </Badge>
                    ))}
                  </div>
                )}
                {!match.matchesYou && match.reasons.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {match.reasons.map((reason) => (
                      <Badge key={reason} tone="info">
                        {reason}
                      </Badge>
                    ))}
                  </div>
                )}
                {listing.address && (
                  <p className="text-sm text-ui-muted">
                    {[listing.address.line1, listing.address.city, listing.address.state]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                )}
                {(listing.beds != null || listing.baths != null) && (
                  <p className="mt-2 text-sm text-ui-muted">
                    {listing.beds != null && `${listing.beds} bed`}
                    {listing.beds != null && listing.baths != null && " · "}
                    {listing.baths != null && `${listing.baths} bath`}
                  </p>
                )}
                {listing.marketingDescription && (
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-ui-ink">
                    {listing.marketingDescription}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button asChild variant="secondary" size="sm">
                    <Link href={`/chat?listing=${listing.id}`}>Ask about this listing</Link>
                  </Button>
                  {compareHref && isSelected && (
                    <Button asChild size="sm">
                      <Link href={compareHref}>Open compare</Link>
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
