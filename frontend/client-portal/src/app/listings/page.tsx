"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Alert,
  Button,
  Card,
  EmptyState,
  PageHeader,
  PageLoader,
  SectionHeader,
} from "@aurixa/ui-kit";
import { getListings, type Listing } from "../api";

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
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getListings()
      .then(setListings)
      .catch(() => setError("Listings could not be loaded."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader label="Loading listings" />;

  return (
    <div className="space-y-10 py-8 sm:py-10">
      <PageHeader
        eyebrow="Market"
        title="Listings"
        description="Active properties from your brokerage or property manager."
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
          {listings.map((listing) => (
            <Card key={listing.id} variant="interactive">
              <SectionHeader
                title={listing.marketingTitle || `Listing #${listing.id}`}
                description={formatPrice(listing)}
              />
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
              <Button asChild variant="secondary" size="sm" className="mt-4">
                <Link href="/chat">Ask about this listing</Link>
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
