"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Alert,
  AsyncBoundary,
  Avatar,
  Button,
  Card,
  EmptyState,
  Metric,
  PageLoader,
  SectionHeader,
} from "@aurixa/ui-kit";
import { RealEstateDisclaimer } from "@aurixa/ui-kit";
import {
  getClient,
  getShowings,
  getListings,
  getKnowledgeArticles,
  getConversations,
  type ClientProfile,
  type Showing,
  type Listing,
  type KnowledgeArticle,
  type ConversationSummary,
} from "./api";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export default function DashboardPage() {
  return (
    <AsyncBoundary loadingLabel="Preparing your property overview" resetKeys={["client-home"]}>
      <DashboardContent />
    </AsyncBoundary>
  );
}

function DashboardContent() {
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [showings, setShowings] = useState<Showing[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.allSettled([
      getClient().then(setClient),
      getShowings().then(setShowings),
      getListings().then(setListings),
      getKnowledgeArticles().then(setArticles),
      getConversations().then(setConversations),
    ]).then((results) => {
      const failures = results.filter((result) => result.status === "rejected").length;
      if (failures === results.length) {
        setError("Your overview could not be loaded. Check your connection and try again.");
      } else if (failures > 0) {
        setError("Some property information is temporarily unavailable.");
      }
      setLastUpdated(new Date());
      setLoading(false);
    });
  }, [reloadKey]);

  const upcomingShowings = showings
    .filter((s) => s.status === "confirmed" && new Date(s.startTime) > new Date())
    .slice(0, 5);

  if (loading) {
    return <PageLoader label="Preparing your property overview" />;
  }

  const firstName = client?.fullName?.split(" ")[0] || "";
  const nextShowing = upcomingShowings[0];
  const agentName = nextShowing?.agentName || nextShowing?.providerName || "your agent";

  return (
    <div className="space-y-10 py-8 sm:py-10">
      {error && (
        <Alert
          title={client ? "Some information is unavailable" : "We couldn’t load your overview"}
          tone={client ? "warning" : "danger"}
        >
          <p>{error}</p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={() => setReloadKey((key) => key + 1)}
          >
            Try again
          </Button>
        </Alert>
      )}
      {lastUpdated && (
        <p className="text-xs text-ui-faint">
          Updated {lastUpdated.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
        </p>
      )}
      <header className="max-w-3xl">
        <p className="eyebrow">{firstName ? `Welcome back, ${firstName}` : "Your client portal"}</p>
        <h1 className="font-display text-[clamp(2.7rem,7vw,5.5rem)] font-medium leading-[0.92] tracking-[-0.05em] text-ui-ink">
          What do you need today?
        </h1>
        <p className="page-description">
          Check your next showing, browse listings, or ask a practical question.
        </p>
      </header>

      <section aria-label="Your next step">
        <SectionHeader
          title="Your next step"
          description="The most useful detail from your schedule, up front."
        />
        {nextShowing ? (
          <Card variant="feature" padding="lg">
            <p className="text-xs font-semibold tracking-wide text-ui-accent">Next showing</p>
            <h2 className="mt-3 max-w-2xl font-display text-3xl font-medium tracking-[-0.035em] text-ui-ink sm:text-4xl">
              Tour with {agentName}
            </h2>
            <p className="mt-3 text-base leading-7 text-ui-muted">
              {formatDate(nextShowing.startTime)}. Note any questions about the property, HOA rules,
              or financing before you arrive.
            </p>
            <Button asChild className="mt-6">
              <Link href={`/showings/${nextShowing.id}`}>See showing details</Link>
            </Button>
          </Card>
        ) : (
          <EmptyState
            title="Nothing scheduled right now"
            description="Browse active listings or contact your agent to schedule a tour."
            compact
          />
        )}
      </section>

      <section aria-label="Choose what you need">
        <SectionHeader title="Choose what you need" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              href: "/chat",
              title: "Ask a question",
              text: "Get help with showings, listings, applications, or next steps.",
            },
            {
              href: "/showings",
              title: "My showings",
              text: "Review upcoming tours and past property visits.",
            },
            {
              href: "/listings",
              title: "Browse listings",
              text: "See active properties from your organization.",
            },
            {
              href: "/applications",
              title: "Applications",
              text: "Check rental or buyer application requirements.",
            },
            {
              href: "/financing",
              title: "Financing",
              text: "Prepare for pre-approval and closing costs.",
            },
            {
              href: "/help",
              title: "Find support",
              text: "Read guides and see when to reach your agent.",
            },
          ].map((action) => (
            <Link key={action.href} href={action.href} className="group block rounded-ui-lg">
              <Card variant="interactive" className="h-full">
                <h3 className="font-display text-2xl font-medium text-ui-ink">{action.title}</h3>
                <p className="mt-2 text-sm leading-6 text-ui-muted">{action.text}</p>
                <span className="mt-5 inline-block text-sm font-semibold text-ui-accent">
                  Open <span aria-hidden="true">→</span>
                </span>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.35fr_1fr]" aria-label="Property summary">
        <Card>
          <SectionHeader title="Property summary" description="A quick overview." />
          <div className="grid grid-cols-2 gap-5">
            <Metric
              label="Upcoming showings"
              value={upcomingShowings.length}
              detail="Confirmed tours"
            />
            <Metric label="Active listings" value={listings.length} detail="From your org" />
          </div>
          {conversations.length > 0 && (
            <p className="mt-6 border-t border-ui-border pt-4 text-sm text-ui-muted">
              {conversations.length} saved{" "}
              {conversations.length === 1 ? "conversation" : "conversations"}. Open Messages to
              continue.
            </p>
          )}
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <Avatar name={client?.fullName || "Client"} size="lg" />
            <div>
              <h2 className="font-display text-2xl font-medium text-ui-ink">Your account</h2>
              <p className="text-sm text-ui-muted">{client?.fullName || "Profile unavailable"}</p>
            </div>
          </div>
          {client ? (
            <dl className="mt-5 space-y-3 text-sm">
              {client.email && (
                <div>
                  <dt className="font-semibold text-ui-ink">Email</dt>
                  <dd className="mt-0.5 break-all text-ui-muted">{client.email}</dd>
                </div>
              )}
              {client.phoneNumber && (
                <div>
                  <dt className="font-semibold text-ui-ink">Phone</dt>
                  <dd className="mt-0.5 text-ui-muted">{client.phoneNumber}</dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="mt-4 text-sm text-ui-muted">
              We couldn’t load your profile details. Your other portal tools are still available.
            </p>
          )}
          <Button asChild variant="secondary" size="sm" className="mt-5">
            <Link href="/account">Open account</Link>
          </Button>
        </Card>
      </section>

      {articles.length > 0 && (
        <section aria-label="Guides">
          <SectionHeader title="Guides" description={`${articles.length} articles available`} />
        </section>
      )}

      <RealEstateDisclaimer variant="fair-housing" />
    </div>
  );
}
