"use client";

import Link from "next/link";
import { Alert, Button } from "@aurixa/ui-kit";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col justify-center py-12">
      <p className="eyebrow">We hit a snag</p>
      <h1 className="font-display text-4xl font-medium tracking-[-0.04em] text-ui-ink">
        This page needs another try.
      </h1>
      <Alert title="This view did not finish loading" tone="warning" className="mt-6">
        We couldn’t finish loading this view. Try it again, or return home and choose another path.
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
