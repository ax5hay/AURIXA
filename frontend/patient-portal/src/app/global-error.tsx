"use client";

import { Button } from "@aurixa/ui-kit";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" data-theme="patient">
      <body className="flex min-h-screen flex-col items-center justify-center bg-ui-canvas px-4 font-sans text-ui-ink antialiased">
        <main className="w-full max-w-lg rounded-ui-xl border border-ui-border bg-ui-surface p-7 shadow-ui-soft sm:p-9">
          <p className="text-xs font-semibold tracking-wide text-ui-muted">AURIXA patient portal</p>
          <h1 className="mt-3 font-display text-4xl font-medium tracking-[-0.04em]">
            We couldn’t open the portal.
          </h1>
          <p className="mt-4 text-sm leading-6 text-ui-muted">
            Please try once more. If the portal still won’t open, contact your care team through
            their usual channel.
          </p>
          <Button onClick={reset} className="mt-6">
            Try again
          </Button>
        </main>
      </body>
    </html>
  );
}
