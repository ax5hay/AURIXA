"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AppointmentsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Appointments error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-16 -mt-6">
      <p className="text-white/60 text-sm mb-4 text-center max-w-md">
        Could not load appointments. The API may be unavailable.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-4 py-2 rounded-lg bg-aurixa-500 hover:bg-aurixa-600 text-white font-medium transition-colors"
        >
          Try again
        </button>
        <Link
          href="/"
          className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
