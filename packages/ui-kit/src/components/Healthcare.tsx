import React from "react";
import { Alert } from "./Feedback";

export type HealthcareDisclaimerVariant = "emergency" | "assistant-limits" | "not-diagnosis";

const COPY: Record<
  HealthcareDisclaimerVariant,
  { title: string; tone: "danger" | "warning" | "info"; body: string }
> = {
  emergency: {
    title: "Need urgent medical help?",
    tone: "danger",
    body: "Do not wait for a portal or assistant response. Contact local emergency services or seek urgent medical care immediately.",
  },
  "assistant-limits": {
    title: "This assistant has limits",
    tone: "info",
    body: "Responses may be incomplete or incorrect. Use them for practical guidance, not diagnosis, treatment decisions, or emergency triage.",
  },
  "not-diagnosis": {
    title: "Not a clinical diagnosis",
    tone: "warning",
    body: "Information here does not replace professional clinical judgment. Confirm care decisions with a qualified clinician.",
  },
};

export function HealthcareDisclaimer({
  variant = "emergency",
  className,
}: {
  variant?: HealthcareDisclaimerVariant;
  className?: string;
}) {
  const copy = COPY[variant];
  return (
    <Alert title={copy.title} tone={copy.tone} className={className}>
      {copy.body}
    </Alert>
  );
}
