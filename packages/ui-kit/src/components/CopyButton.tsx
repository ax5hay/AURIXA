"use client";

import React, { useState } from "react";
import clsx from "clsx";
import { useToast } from "./Toast";

export interface CopyButtonProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "onClick" | "value"
> {
  value: string | (() => string);
  label?: string;
  copiedLabel?: string;
  toastTitle?: string;
}

export function CopyButton({
  value,
  label = "Copy",
  copiedLabel = "Copied",
  toastTitle = "Copied to clipboard",
  className,
  ...props
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      const text = typeof value === "function" ? value() : value;
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({ title: toastTitle, tone: "success" });
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast({
        title: "Could not copy",
        description: "Select the content manually and copy it.",
        tone: "error",
      });
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={clsx(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-ui-md border border-ui-border bg-ui-surface px-3.5 py-2 text-xs font-semibold text-ui-muted transition hover:border-ui-border-strong hover:bg-ui-surface-raised hover:text-ui-ink",
        className,
      )}
      {...props}
    >
      <svg
        aria-hidden="true"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={1.7}
      >
        {copied ? (
          <path strokeLinecap="round" strokeLinejoin="round" d="m5 12 4 4L19 6" />
        ) : (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.25 7.5V6A2.25 2.25 0 0 1 10.5 3.75H18A2.25 2.25 0 0 1 20.25 6v7.5A2.25 2.25 0 0 1 18 15.75h-1.5m-8.25-8.25h-2.25A2.25 2.25 0 0 0 3.75 9.75v8.25a2.25 2.25 0 0 0 2.25 2.25h8.25a2.25 2.25 0 0 0 2.25-2.25v-2.25m-8.25-8.25h6A2.25 2.25 0 0 1 16.5 9.75v6"
          />
        )}
      </svg>
      {copied ? copiedLabel : label}
    </button>
  );
}

export interface DiagnosticBundleProps {
  title?: string;
  description?: string;
  data: unknown | (() => unknown);
  context?: Record<string, unknown>;
  className?: string;
}

const sensitiveKeyFragments = [
  "password",
  "secret",
  "token",
  "apikey",
  "accesskey",
  "privatekey",
  "credential",
  "sessionid",
  "csrf",
  "authorization",
  "cookie",
  "email",
  "phone",
  "address",
  "content",
  "detail",
  "message",
  "prompt",
  "transcript",
  "requestbody",
  "responsebody",
  "fullname",
  "firstname",
  "lastname",
  "patientname",
  "patientid",
  "userid",
  "accountid",
  "dateofbirth",
  "birthdate",
  "dob",
  "medicalrecord",
  "mrn",
  "ssn",
  "insurance",
];

function isSensitiveKey(key: string) {
  const normalized = key.replace(/[^a-z0-9]/gi, "").toLowerCase();
  return sensitiveKeyFragments.some((fragment) => normalized.includes(fragment));
}

function sanitizeDiagnosticString(value: string) {
  return value
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [Redacted]")
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[Redacted token]")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[Redacted email]")
    .replace(/\b(?:\+?\d[\d\s().-]{7,}\d)\b/g, "[Redacted phone]");
}

function sanitizeDiagnosticPath(path: string) {
  return path.replace(/\/(?:\d+|[0-9a-f]{8}-[0-9a-f-]{27,})\b/gi, "/[id]");
}

function sanitizeDiagnostics(value: unknown, seen = new WeakSet<object>()): unknown {
  if (typeof value === "string") return sanitizeDiagnosticString(value);
  if (value == null || typeof value !== "object") return value;
  if (seen.has(value)) return "[Circular]";
  seen.add(value);

  if (Array.isArray(value)) {
    return value.slice(0, 100).map((item) => sanitizeDiagnostics(item, seen));
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      isSensitiveKey(key) ? "[Redacted]" : sanitizeDiagnostics(item, seen),
    ]),
  );
}

export function DiagnosticBundle({
  title = "Diagnostic bundle",
  description = "Copy a privacy-conscious snapshot for support or debugging.",
  data,
  context,
  className,
}: DiagnosticBundleProps) {
  const createBundle = () => {
    const resolved = typeof data === "function" ? data() : data;
    return JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        page:
          typeof window === "undefined"
            ? undefined
            : sanitizeDiagnosticPath(window.location.pathname),
        userAgent: typeof navigator === "undefined" ? undefined : navigator.userAgent,
        context: sanitizeDiagnostics(context),
        diagnostics: sanitizeDiagnostics(resolved),
      },
      null,
      2,
    );
  };

  return (
    <section
      className={clsx(
        "rounded-ui-lg border border-ui-border bg-ui-surface-inset p-4 sm:flex sm:items-center sm:justify-between sm:gap-5",
        className,
      )}
    >
      <div>
        <p className="text-sm font-semibold text-ui-ink">{title}</p>
        <p className="mt-1 text-xs leading-5 text-ui-muted">{description}</p>
      </div>
      <CopyButton
        value={createBundle}
        label="Copy debug bundle"
        copiedLabel="Bundle copied"
        toastTitle="Debug bundle copied"
        className="mt-3 w-full sm:mt-0 sm:w-auto"
      />
    </section>
  );
}
