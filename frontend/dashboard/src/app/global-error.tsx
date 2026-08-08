"use client";

import { useState } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const copyDiagnostics = async () => {
    await navigator.clipboard.writeText(
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          application: "AURIXA Dashboard",
          digest: error?.digest,
          userAgent: navigator.userAgent,
        },
        null,
        2,
      ),
    );
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: "#070f1b",
          color: "#fff",
          fontFamily: "system-ui,sans-serif",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 32,
        }}
      >
        <div style={{ maxWidth: 520, textAlign: "center" }}>
          <div
            style={{
              width: 48,
              height: 48,
              margin: "0 auto 20px",
              borderRadius: 6,
              background: "#0c1828",
              border: "1px solid rgba(94,234,212,.25)",
              display: "grid",
              placeItems: "center",
              color: "#8ce1d4",
              fontWeight: 700,
            }}
          >
            A
          </div>
          <p
            style={{
              color: "#8ce1d4",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: ".18em",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Recovery mode
          </p>
          <h1
            style={{ fontSize: "2rem", fontWeight: 650, marginBottom: 12, letterSpacing: "-.04em" }}
          >
            We hit an unexpected issue.
          </h1>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.875rem", marginBottom: 24 }}>
            Try reloading this workspace. If it continues, copy the diagnostic bundle for support.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                padding: "11px 18px",
                background: "#3eb2a3",
                color: "#061519",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: "0.875rem",
                fontWeight: 600,
              }}
            >
              Reload workspace
            </button>
            <button
              type="button"
              onClick={copyDiagnostics}
              style={{
                padding: "11px 18px",
                background: "rgba(255,255,255,.06)",
                color: "rgba(255,255,255,.75)",
                border: "1px solid rgba(255,255,255,.1)",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: "0.875rem",
                fontWeight: 600,
              }}
            >
              <span aria-live="polite">{copied ? "Bundle copied" : "Copy debug bundle"}</span>
            </button>
          </div>
          {error?.digest && (
            <p
              style={{
                marginTop: 20,
                color: "rgba(255,255,255,.25)",
                fontFamily: "monospace",
                fontSize: 11,
              }}
            >
              Reference: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
