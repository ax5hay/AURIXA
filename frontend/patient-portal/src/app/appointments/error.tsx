"use client";

import Link from "next/link";
import { Alert, Button } from "@aurixa/ui-kit";

export default function AppointmentsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-xl flex-col justify-center py-12">
      <h1 className="font-display text-4xl font-medium tracking-[-0.04em] text-ui-ink">
        Your appointments aren’t available yet.
      </h1>
      <Alert title="Please try again" tone="warning" className="mt-6">
        We couldn’t load your schedule. Try again, or contact your care team through their usual
        channel if you need to confirm a visit.
      </Alert>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button asChild variant="secondary">
          <Link href="/">Return home</Link>
        </Button>
      </div>
    </div>
  );
}
