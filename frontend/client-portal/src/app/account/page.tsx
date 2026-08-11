"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Alert,
  Avatar,
  Button,
  Card,
  PageHeader,
  PageLoader,
  SectionHeader,
} from "@aurixa/ui-kit";
import { getPatient, type Patient } from "../api";
import { PATIENT_SECTIONS } from "@/lib/patient-sections";

interface SessionSummary {
  expiresAt: number;
  demo: boolean;
}

export default function AccountPage() {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [session, setSession] = useState<SessionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      getPatient(),
      fetch("/api/patient/session", { cache: "no-store" }).then(async (response) => {
        if (!response.ok) throw new Error("Session unavailable");
        return response.json() as Promise<SessionSummary>;
      }),
    ])
      .then(([profile, sessionSummary]) => {
        setPatient(profile);
        setSession(sessionSummary);
      })
      .catch(() => setError("Your account details could not be loaded."))
      .finally(() => setLoading(false));
  }, [reloadKey]);

  if (loading) return <PageLoader label="Loading your account" />;

  return (
    <div className="space-y-9 py-4 sm:py-8">
      <PageHeader
        eyebrow="Account and privacy"
        title="Your account"
        description="Review the identity connected to this portal and manage device-level display preferences."
      />

      {error && (
        <Alert title="Account unavailable" tone="danger">
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

      {patient && (
        <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
          <Card>
            <div className="flex items-center gap-4">
              <Avatar name={patient.fullName} size="lg" />
              <div>
                <h2 className="font-display text-2xl font-medium text-ui-ink">
                  {patient.fullName}
                </h2>
                <p className="text-sm text-ui-muted">Patient portal profile</p>
              </div>
            </div>
            <dl className="mt-6 divide-y divide-ui-border text-sm">
              <div className="grid gap-1 py-3 sm:grid-cols-[8rem_1fr]">
                <dt className="font-semibold text-ui-ink">Email</dt>
                <dd className="break-all text-ui-muted">{patient.email || "Not provided"}</dd>
              </div>
              <div className="grid gap-1 py-3 sm:grid-cols-[8rem_1fr]">
                <dt className="font-semibold text-ui-ink">Phone</dt>
                <dd className="text-ui-muted">{patient.phoneNumber || "Not provided"}</dd>
              </div>
            </dl>
            <Alert title="Need to correct this information?" tone="info" className="mt-5">
              Profile updates are not supported by the current patient API. Contact your care team
              through a verified channel to make a correction.
            </Alert>
          </Card>

          <Card>
            <SectionHeader title="Session security" />
            <p className="text-sm leading-6 text-ui-muted">
              This browser session is patient-scoped and expires automatically.
            </p>
            {session && (
              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="font-semibold text-ui-ink">Session expires</dt>
                  <dd className="mt-1 text-ui-muted">
                    {new Date(session.expiresAt * 1000).toLocaleString()}
                  </dd>
                </div>
                {session.demo && (
                  <div>
                    <dt className="font-semibold text-ui-warning">Local demo session</dt>
                    <dd className="mt-1 text-ui-muted">Not a production patient identity.</dd>
                  </div>
                )}
              </dl>
            )}
            <form action="/api/auth/logout" method="post" className="mt-6">
              <Button type="submit" variant="secondary">
                Sign out of this device
              </Button>
            </form>
          </Card>
        </div>
      )}

      <section aria-label="Care and account tools">
        <SectionHeader
          title="More portal tools"
          description="Open a care area or review what is currently connected."
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PATIENT_SECTIONS.map((section) => (
            <Link key={section.href} href={section.href} className="group rounded-ui-lg">
              <Card variant="interactive" className="h-full">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-display text-xl font-medium text-ui-ink">{section.label}</h2>
                  <span className="text-ui-accent" aria-hidden="true">
                    →
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-ui-muted">{section.description}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section aria-label="Preferences, privacy, and support">
        <SectionHeader title="Preferences, privacy, and support" />
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              href: "/account/accessibility",
              title: "Accessibility",
              body: "Adjust text, contrast, and motion on this device.",
            },
            {
              href: "/account/privacy",
              title: "Privacy and access",
              body: "Review session protections and unavailable consent controls.",
            },
            {
              href: "/help",
              title: "Support",
              body: "Find provider guidance, urgent-help direction, and support paths.",
            },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="group rounded-ui-lg">
              <Card variant="interactive" className="h-full">
                <h2 className="font-display text-xl font-medium text-ui-ink">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-ui-muted">{item.body}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
