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
  HealthcareDisclaimer,
  Metric,
  PageLoader,
  SectionHeader,
} from "@aurixa/ui-kit";
import {
  getPatient,
  getAppointments,
  getKnowledgeArticles,
  getConversations,
  type Patient,
  type Appointment,
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
    <AsyncBoundary loadingLabel="Preparing your care overview" resetKeys={["patient-home"]}>
      <DashboardContent />
    </AsyncBoundary>
  );
}

function DashboardContent() {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
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
      getPatient().then(setPatient),
      getAppointments().then(setAppointments),
      getKnowledgeArticles().then(setArticles),
      getConversations().then(setConversations),
    ]).then((results) => {
      const failures = results.filter((result) => result.status === "rejected").length;
      if (failures === results.length) {
        setError("Your care overview could not be loaded. Check your connection and try again.");
      } else if (failures > 0) {
        setError("Some of your care information is temporarily unavailable.");
      }
      setLastUpdated(new Date());
      setLoading(false);
    });
  }, [reloadKey]);

  const upcomingAppointments = appointments
    .filter((a) => a.status === "confirmed" && new Date(a.startTime) > new Date())
    .slice(0, 5);

  if (loading) {
    return <PageLoader label="Preparing your care overview" />;
  }

  const firstName = patient?.fullName?.split(" ")[0] || "";
  const nextAppointment = upcomingAppointments[0];

  return (
    <div className="space-y-10 py-8 sm:py-10">
      {error && (
        <Alert
          title={patient ? "Some information is unavailable" : "We couldn’t load your overview"}
          tone={patient ? "warning" : "danger"}
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
        <p className="eyebrow">{firstName ? `Welcome back, ${firstName}` : "Your care portal"}</p>
        <h1 className="font-display text-[clamp(2.7rem,7vw,5.5rem)] font-medium leading-[0.92] tracking-[-0.05em] text-ui-ink">
          What do you need today?
        </h1>
        <p className="page-description">
          Check your next visit, ask a practical question, or find the right kind of support.
        </p>
      </header>

      <section aria-label="Your next step">
        <SectionHeader
          title="Your next step"
          description="The most useful detail from your care schedule, up front."
        />
        {nextAppointment ? (
          <Card variant="feature" padding="lg">
            <p className="text-xs font-semibold tracking-wide text-ui-accent">Next appointment</p>
            <h2 className="mt-3 max-w-2xl font-display text-3xl font-medium tracking-[-0.035em] text-ui-ink sm:text-4xl">
              You’re seeing {nextAppointment.providerName}
            </h2>
            <p className="mt-3 text-base leading-7 text-ui-muted">
              {formatDate(nextAppointment.startTime)}. Take a moment beforehand to note any
              questions, symptoms, or medication changes you want to discuss.
            </p>
            <Button asChild className="mt-6">
              <Link href={`/appointments/${nextAppointment.id}`}>See visit details</Link>
            </Button>
          </Card>
        ) : (
          <EmptyState
            title="Nothing scheduled right now"
            description="If you expected to see a visit here, contact your care team to confirm."
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
              text: "Get help with appointments, billing, refills, or understanding next steps.",
            },
            {
              href: "/appointments",
              title: "Check my visits",
              text: "Review upcoming appointments and your recent care history.",
            },
            {
              href: "/help",
              title: "Find support",
              text: "Read care guidance and see where to turn when you need a person.",
            },
            {
              href: "/records",
              title: "Review my records",
              text: "See connected visit history and guidance for results and documents.",
            },
            {
              href: "/medications",
              title: "Medicines and refills",
              text: "Find medication safety and refill guidance without an incomplete list.",
            },
            {
              href: "/billing",
              title: "Billing and insurance",
              text: "Prepare for balance, statement, coverage, or authorization questions.",
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

      <section className="grid gap-6 lg:grid-cols-[1.35fr_1fr]" aria-label="Care summary">
        <Card>
          <SectionHeader title="Care summary" description="A quick, privacy-minded overview." />
          <div className="grid grid-cols-2 gap-5">
            <Metric
              label="Upcoming visits"
              value={upcomingAppointments.length}
              detail="Confirmed appointments"
            />
            <Metric label="Care guides" value={articles.length} detail="Available to read" />
          </div>
          {conversations.length > 0 && (
            <p className="mt-6 border-t border-ui-border pt-4 text-sm text-ui-muted">
              {conversations.length} saved{" "}
              {conversations.length === 1 ? "conversation" : "conversations"}. Details stay hidden
              here for privacy. Open Messages to continue.
            </p>
          )}
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <Avatar name={patient?.fullName || "Patient"} size="lg" />
            <div>
              <h2 className="font-display text-2xl font-medium text-ui-ink">Your account</h2>
              <p className="text-sm text-ui-muted">{patient?.fullName || "Profile unavailable"}</p>
            </div>
          </div>
          {patient ? (
            <dl className="mt-5 space-y-3 text-sm">
              {patient.email && (
                <div>
                  <dt className="font-semibold text-ui-ink">Email</dt>
                  <dd className="mt-0.5 break-all text-ui-muted">{patient.email}</dd>
                </div>
              )}
              {patient.phoneNumber && (
                <div>
                  <dt className="font-semibold text-ui-ink">Phone</dt>
                  <dd className="mt-0.5 text-ui-muted">{patient.phoneNumber}</dd>
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

      <HealthcareDisclaimer variant="emergency" />
    </div>
  );
}
