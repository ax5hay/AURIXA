import React from "react";
import { Alert } from "./Feedback";

export type RealEstateDisclaimerVariant = "fair-housing" | "assistant-limits" | "not-legal";

const COPY: Record<
  RealEstateDisclaimerVariant,
  { title: string; tone: "danger" | "warning" | "info"; body: string }
> = {
  "fair-housing": {
    title: "Fair housing notice",
    tone: "info",
    body: "Use fair-housing neutral language. Do not filter clients or listings by protected class.",
  },
  "assistant-limits": {
    title: "This assistant has limits",
    tone: "info",
    body: "Responses may be incomplete. Not legal, tax, or investment advice.",
  },
  "not-legal": {
    title: "Not legal or tax advice",
    tone: "warning",
    body: "Confirm contract and financial decisions with licensed professionals.",
  },
};

export function RealEstateDisclaimer({
  variant = "assistant-limits",
  className,
}: {
  variant?: RealEstateDisclaimerVariant;
  className?: string;
}) {
  const copy = COPY[variant];
  return (
    <Alert title={copy.title} tone={copy.tone} className={className}>
      {copy.body}
    </Alert>
  );
}
