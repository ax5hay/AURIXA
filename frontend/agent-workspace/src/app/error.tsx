"use client";

import { Button, DiagnosticBundle, EmptyState } from "@aurixa/ui-kit";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-xl py-10">
      <EmptyState
        eyebrow="Recovery"
        title="This workspace could not load"
        description="Retry the request. No client details are included in the support bundle."
        action={<Button onClick={reset}>Try again</Button>}
      />
      <DiagnosticBundle
        data={{ digest: error.digest, errorType: error.name }}
        context={{ application: "AURIXA Agent Workspace" }}
        className="mt-6 w-full text-left"
      />
    </div>
  );
}
