"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Patient portal error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-background">
      <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
      <p className="text-white/60 text-sm mb-6 text-center max-w-md">
        {error.message || "An unexpected error occurred."}
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 rounded-lg bg-aurixa-500 hover:bg-aurixa-600 text-white font-medium transition-colors"
      >
        Try again
      </button>
      <a
        href="/"
        className="mt-4 text-white/50 hover:text-white text-sm underline"
      >
        Go to Patient Portal
      </a>
    </div>
  );
}
