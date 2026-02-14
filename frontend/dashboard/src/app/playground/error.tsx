"use client";

import Link from "next/link";

export default function PlaygroundError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="glass rounded-xl p-8 text-center space-y-4 max-w-md mx-auto">
        <h1 className="text-xl font-bold text-white">Playground failed to load</h1>
        <p className="text-white/60 text-sm">{error?.message || "An unexpected error occurred"}</p>
        <p className="text-white/40 text-xs">
          The rest of the dashboard is unaffected. You can retry or go back.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-aurixa-600 hover:bg-aurixa-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
