"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, Button, Card } from "@aurixa/ui-kit";

const oidcReady = Boolean(process.env.NEXT_PUBLIC_HOSPITAL_OIDC_READY === "true");

export default function StaffSignInPage() {
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
        throw new Error(body?.error ?? "Staff sign-in is unavailable.");
      }
      const returnTo = searchParams.get("returnTo");
      router.replace(returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Staff sign-in is unavailable.");
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
        <p className="eyebrow">AURIXA clinical workspace</p>
        <h1 className="font-display text-4xl font-medium tracking-[-0.04em] text-ui-ink">
          Authorized staff only
        </h1>
        <p className="mt-4 text-base leading-7 text-ui-muted">
          Sign in through your healthcare organization to access patient and scheduling data.
        </p>
        {error && (
          <Alert title="Unable to sign in" tone="danger" className="mt-6">
            {error}
          </Alert>
        )}
        <div className="mt-7 space-y-3 border-t border-ui-border pt-6">
          {oidcReady ? (
            <Button className="w-full" onClick={beginOidc}>
              Continue with organization SSO
            </Button>
          ) : (
            <Alert title="Production identity is not connected" tone="warning">
              Access remains closed until an identity provider issues a verified staff session. See
              `docs/FRONTEND_AUTH.md` for OIDC configuration.
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
