"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans bg-[#0a0a0f] text-white min-h-screen antialiased flex flex-col items-center justify-center px-4">
        <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
        <p className="text-white/60 text-sm mb-6 text-center max-w-md">
          {error.message || "An unexpected error occurred."}
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 rounded-lg bg-[#4c6ef5] hover:bg-[#4263eb] text-white font-medium transition-colors"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
