"use client";

import Link from "next/link";

export default function PlaygroundError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="glass rounded-xl p-8 text-center space-y-4 max-w-md mx-auto">
        <h1 className="text-xl font-bold text-white">Playground failed to load</h1>
        <p className="text-white/60 text-sm">The test workspace did not finish loading.</p>
        <p className="text-white/40 text-xs">
          The rest of the dashboard is unaffected. You can retry or go back.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="min-h-11 px-4 py-2 bg-aurixa-600 hover:bg-aurixa-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
