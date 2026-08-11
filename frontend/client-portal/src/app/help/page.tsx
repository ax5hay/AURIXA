"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Accordion,
  Alert,
  Banner,
  Button,
  Card,
  EmptyState,
  PageHeader,
  PageLoader,
  SectionHeader,
} from "@aurixa/ui-kit";
import { getKnowledgeArticles, type KnowledgeArticle } from "../api";

export default function HelpPage() {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getKnowledgeArticles()
      .then(setArticles)
      .catch(() => setError("Brokerage guidance could not be loaded."))
      .finally(() => setLoading(false));
  }, [reloadKey]);

  if (loading) {
    return <PageLoader label="Loading support information" />;
  }

  return (
    <div className="space-y-9 py-8 sm:py-10">
      <PageHeader
        eyebrow="Support hub"
        title="How can we help?"
        description="Start with the path that fits your need. For questions about your transaction, your licensed agent remains the best source."
        actions={
          <Button asChild>
            <Link href="/chat">Open messages</Link>
          </Button>
        }
      />

      <Alert title="Fair housing and legal limits" tone="danger">
        This portal provides general transaction guidance only. It does not provide legal, tax, or
        fair housing advice. Contact your agent or qualified professionals for binding decisions.
      </Alert>

      {error && (
        <Alert title="Help articles are unavailable" tone="warning">
          <p>{error} You can still use the support paths below.</p>
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

      <section aria-label="Ways to get support">
        <SectionHeader title="Choose a support path" />
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <h3 className="font-display text-2xl font-medium text-ui-ink">Transaction question</h3>
            <p className="mt-2 text-sm leading-6 text-ui-muted">
              Contact your agent through the channel they normally use for offer, financing, or
              showing decisions.
            </p>
          </Card>
          <Card>
            <h3 className="font-display text-2xl font-medium text-ui-ink">Portal guidance</h3>
            <p className="mt-2 text-sm leading-6 text-ui-muted">
              Use the articles below or messages for general navigation and practical questions.
            </p>
          </Card>
          <Card>
            <h3 className="font-display text-2xl font-medium text-ui-ink">Property emergency</h3>
            <p className="mt-2 text-sm leading-6 text-ui-muted">
              For life-safety issues at a property, call 911. For urgent maintenance, use your
              on-call property manager number.
            </p>
          </Card>
        </div>
      </section>

      <Banner
        title="Need a person?"
        action={
          <Button asChild variant="secondary">
            <Link href="/showings">Review showings</Link>
          </Button>
        }
      >
        Contact your agent using the phone number or messaging method they have already provided. We
        do not show an unverified contact number here.
      </Banner>

      <section aria-label="Help articles">
        <SectionHeader
          title="Helpful information"
          count={articles.length}
          description="Plain-language guidance available from your brokerage."
        />
        {error ? null : articles.length === 0 ? (
          <EmptyState
            title="No articles are available right now"
            description="You can still use messages for a general question or contact your agent directly."
            action={
              <Button asChild>
                <Link href="/chat">Open messages</Link>
              </Button>
            }
          />
        ) : (
          <Accordion
            items={articles.map((article) => ({
              id: String(article.id),
              title: article.title,
              content: article.content,
            }))}
          />
        )}
      </section>
    </div>
  );
}
