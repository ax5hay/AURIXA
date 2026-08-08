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
      .catch(() => setError("Provider guidance could not be loaded."))
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
        description="Start with the path that fits your need. For questions about your own care, your care team remains the best source."
        actions={
          <Button asChild>
            <Link href="/chat">Open care messages</Link>
          </Button>
        }
      />

      <Alert title="If this may be an emergency" tone="danger">
        Do not wait for a portal response. Contact your local emergency services now. This portal
        cannot monitor urgent symptoms.
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
            <h3 className="font-display text-2xl font-medium text-ui-ink">Care question</h3>
            <p className="mt-2 text-sm leading-6 text-ui-muted">
              Contact your care team through the channel they normally use for personal medical
              advice, results, or medication decisions.
            </p>
          </Card>
          <Card>
            <h3 className="font-display text-2xl font-medium text-ui-ink">Portal guidance</h3>
            <p className="mt-2 text-sm leading-6 text-ui-muted">
              Use the articles below or care messages for general navigation and practical
              questions.
            </p>
          </Card>
          <Card>
            <h3 className="font-display text-2xl font-medium text-ui-ink">Urgent concern</h3>
            <p className="mt-2 text-sm leading-6 text-ui-muted">
              Use local urgent or emergency services based on how serious and immediate the concern
              is.
            </p>
          </Card>
        </div>
      </section>

      <Banner
        title="Need a person?"
        action={
          <Button asChild variant="secondary">
            <Link href="/appointments">Review visit details</Link>
          </Button>
        }
      >
        Contact your care team using the phone number or messaging method they have already
        provided. We do not show an unverified contact number here.
      </Banner>

      <section aria-label="Help articles">
        <SectionHeader
          title="Helpful information"
          count={articles.length}
          description="Plain-language guidance available from your provider."
        />
        {error ? null : articles.length === 0 ? (
          <EmptyState
            title="No articles are available right now"
            description="You can still use care messages for a general question or contact your care team directly."
            action={
              <Button asChild>
                <Link href="/chat">Open care messages</Link>
              </Button>
            }
          />
        ) : (
          <Card>
            <Accordion
              items={articles.map((article) => ({
                id: String(article.id),
                title: article.title,
                content: <p>{article.content}</p>,
              }))}
            />
          </Card>
        )}
      </section>
    </div>
  );
}
