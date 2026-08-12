"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Alert,
  Button,
  Card,
  EmptyState,
  PageHeader,
  PageLoader,
  SectionHeader,
} from "@aurixa/ui-kit";
import { getListings, type Listing } from "../../api";

function formatPrice(listing: Listing) {
  const amount = listing.rentAmount ?? listing.listPrice;
  if (amount == null) return "Price on request";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function CompareRow({
  label,
  values,
}: {
  label: string;
  values: [string, string];
}) {
  return (
    <div className="grid gap-3 border-b border-ui-border py-4 sm:grid-cols-[10rem_1fr_1fr]">
      <dt className="text-xs font-semibold uppercase tracking-wide text-ui-faint">{label}</dt>
      {values.map((value, index) => (
        <dd key={`${label}-${index}`} className="text-sm text-ui-ink">
          {value}
        </dd>
      ))}
    </div>
  );
}

export default function CompareListingsPage() {
  const searchParams = useSearchParams();
  const ids = useMemo(
    () =>
      (searchParams.get("ids") ?? "")
        .split(",")
        .map((value) => Number(value))
        .filter((value) => Number.isSafeInteger(value) && value > 0)
        .slice(0, 2),
    [searchParams],
  );
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getListings()
      .then((records) => setListings(records.filter((listing) => ids.includes(listing.id))))
      .catch(() => setError("Listings could not be loaded."))
      .finally(() => setLoading(false));
  }, [ids]);

  if (loading) return <PageLoader label="Loading comparison" />;

  const pair: [Listing | undefined, Listing | undefined] = [
    listings.find((listing) => listing.id === ids[0]),
    listings.find((listing) => listing.id === ids[1]),
  ];

  if (error || ids.length !== 2 || !pair[0] || !pair[1]) {
    return (
      <div className="space-y-6 py-8 sm:py-10">
        <PageHeader eyebrow="Market" title="Compare listings" />
        <EmptyState
          title="Select two listings to compare"
          description="Choose two properties on the listings page, then open compare."
          action={
            <Button asChild>
              <Link href="/listings">Back to listings</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const [left, right] = pair as [Listing, Listing];

  return (
    <div className="space-y-8 py-8 sm:py-10">
      <PageHeader
        eyebrow="Market"
        title="Compare listings"
        description="Side-by-side view of two active properties."
        aside={
          <Button asChild variant="secondary">
            <Link href="/listings">Back to listings</Link>
          </Button>
        }
      />

      <Card padding="lg">
        <div className="hidden sm:grid sm:grid-cols-[10rem_1fr_1fr] sm:gap-3 sm:border-b sm:border-ui-border sm:pb-4">
          <span />
          {[left, right].map((listing) => (
            <SectionHeader
              key={listing.id}
              title={listing.marketingTitle || `Listing #${listing.id}`}
              description={formatPrice(listing)}
            />
          ))}
        </div>

        <dl>
          <CompareRow
            label="Price"
            values={[formatPrice(left), formatPrice(right)]}
          />
          <CompareRow
            label="Beds"
            values={[
              left.beds != null ? String(left.beds) : "—",
              right.beds != null ? String(right.beds) : "—",
            ]}
          />
          <CompareRow
            label="Baths"
            values={[
              left.baths != null ? String(left.baths) : "—",
              right.baths != null ? String(right.baths) : "—",
            ]}
          />
          <CompareRow
            label="Address"
            values={[
              [left.address?.line1, left.address?.city, left.address?.state]
                .filter(Boolean)
                .join(", ") || "—",
              [right.address?.line1, right.address?.city, right.address?.state]
                .filter(Boolean)
                .join(", ") || "—",
            ]}
          />
          <CompareRow
            label="Type"
            values={[left.listingType ?? "—", right.listingType ?? "—"]}
          />
          <CompareRow
            label="Summary"
            values={[
              left.marketingDescription?.slice(0, 180) ?? "—",
              right.marketingDescription?.slice(0, 180) ?? "—",
            ]}
          />
        </dl>

        <div className="mt-6 flex flex-wrap gap-2">
          {[left, right].map((listing) => (
            <Button key={listing.id} asChild variant="secondary" size="sm">
              <Link href={`/chat?listing=${listing.id}`}>
                Ask about {listing.marketingTitle || `listing #${listing.id}`}
              </Link>
            </Button>
          ))}
        </div>
      </Card>

      <Alert title="Compare with your agent" tone="info">
        Use objective criteria such as price, beds, commute, and condition. Your agent can help
        interpret disclosures and neighborhood fit under Fair Housing guidelines.
      </Alert>
    </div>
  );
}
