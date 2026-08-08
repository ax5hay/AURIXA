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
    <div className="page-container flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-xl space-y-5">
        <Alert title="This view could not be loaded" tone="danger">
          Try again. If the problem continues, note which page you were using and contact support.
        </Alert>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => reset()}>Try again</Button>
          <Button asChild variant="secondary">
            <Link href="/">Back to overview</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
