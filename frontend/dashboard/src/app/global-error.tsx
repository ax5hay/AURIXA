"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#0a0a0f", color: "#fff", fontFamily: "system-ui,sans-serif", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
        <div style={{ maxWidth: 400, textAlign: "center" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: 16 }}>Something went wrong</h1>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.875rem", marginBottom: 24 }}>{error?.message || "An unexpected error occurred"}</p>
          <button
            onClick={() => reset()}
            style={{ padding: "8px 16px", background: "#4c6ef5", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: "0.875rem" }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
