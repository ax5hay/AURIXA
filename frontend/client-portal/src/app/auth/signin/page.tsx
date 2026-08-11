"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, Button, Card } from "@aurixa/ui-kit";

const oidcReady = Boolean(
  process.env.NEXT_PUBLIC_CLIENT_OIDC_READY === "true" ||
    process.env.NEXT_PUBLIC_PATIENT_OIDC_READY === "true",
);

export default function ClientSignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signInToLocalDemo() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/local-demo", { method: "POST" });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Client sign-in is unavailable.");
      }
      const returnTo = searchParams.get("returnTo");
      router.replace(returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Client sign-in is unavailable.");
    } finally {
      setLoading(false);
    }
  }

  function beginOidc() {
    window.location.href = "/api/auth/oidc/start";
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg items-center px-4 py-12">
      <Card variant="feature" padding="lg" className="w-full">
        <p className="eyebrow">AURIXA client portal</p>
        <h1 className="font-display text-4xl font-medium tracking-[-0.04em] text-ui-ink">
          Your property journey
        </h1>
        <p className="mt-4 text-base leading-7 text-ui-muted">
          Sign in through your brokerage or property manager to view showings, listings, and
          messages.
        </p>

        {error && (
          <Alert title="Unable to sign in" tone="danger" className="mt-6">
            {error}
          </Alert>
        )}

        <div className="mt-7 space-y-3 border-t border-ui-border pt-6">
          {oidcReady ? (
            <Button className="w-full" onClick={beginOidc}>
              Continue with organization sign-in
            </Button>
          ) : (
            <Alert title="Organization sign-in is not configured" tone="info">
              Production OIDC settings are documented in `docs/FRONTEND_AUTH.md`. Until they are
              connected, only an explicitly enabled local demo can open a session.
            </Alert>
          )}
          <Button
            className="w-full"
            variant={oidcReady ? "secondary" : "primary"}
            loading={loading}
            onClick={signInToLocalDemo}
          >
            Open enabled local demo
          </Button>
        </div>
      </Card>
    </div>
  );
}
