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
import { getShowings, type Showing } from "../api";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

export default function RecordsPage() {
  const [showings, setShowings] = useState<Showing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    getShowings()
      .then(setShowings)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader label="Loading your transaction overview" />;

  const pastShowings = showings
    .filter(
      (showing) => showing.status === "completed" || new Date(showing.startTime) < new Date(),
    )
    .sort((a, b) => Date.parse(b.startTime) - Date.parse(a.startTime));

  return (
    <div className="space-y-9 py-8 sm:py-10">
      <PageHeader
        eyebrow="Your transaction"
        title="Records"
        description="Review the showing history currently connected to this portal and find safe paths to other document types."
      />

      <Alert title="What this overview includes" tone="info">
        Only showing history is available from the current client API. This is not a complete
        transaction file and does not include contracts, disclosures, or inspection reports.
      </Alert>

      <section aria-label="Record categories">
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            {
              href: "/documents",
              title: "Documents",
              body: "Disclosures and closing checklists are not connected. See safe next steps.",
            },
            {
              href: "/applications",
              title: "Applications",
              body: "Application status is limited. Learn how to follow up with your agent.",
            },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="group block rounded-ui-lg">
              <Card variant="interactive" className="h-full">
                <h2 className="font-display text-2xl font-medium text-ui-ink">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-ui-muted">{item.body}</p>
                <span className="mt-4 inline-block text-sm font-semibold text-ui-accent">
                  Open guidance <span aria-hidden="true">→</span>
                </span>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="showing-history-heading">
        <SectionHeader
          title="Showing history"
          count={pastShowings.length}
          description="Past and completed showings returned for your client session."
        />
        {error ? (
          <Alert title="Showing history is unavailable" tone="warning">
            We could not load the connected showing data. Try again from the Showings page.
          </Alert>
        ) : pastShowings.length === 0 ? (
          <EmptyState
            title="No showing history is available"
            description="This means no past showings were returned. It does not mean your transaction file is empty."
            compact
          />
        ) : (
          <Card padding="none">
            <ul className="divide-y divide-ui-border">
              {pastShowings.map((showing) => (
                <li
                  key={showing.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
                >
                  <div>
                    <p className="font-semibold text-ui-ink">{showing.agentName}</p>
                    <p className="mt-1 text-sm text-ui-muted">
                      {formatDate(showing.startTime)} · {showing.status}
                    </p>
                  </div>
                  <Button asChild variant="quiet" size="sm">
                    <Link href={`/showings/${showing.id}`}>Showing details</Link>
                  </Button>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </div>
  );
}
