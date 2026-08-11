import React from "react";
import {
  RealEstateDisclaimer,
  type RealEstateDisclaimerVariant,
} from "./RealEstate";

/** @deprecated Use RealEstateDisclaimerVariant */
export type HealthcareDisclaimerVariant = "emergency" | "assistant-limits" | "not-diagnosis";

const LEGACY_VARIANT_MAP: Record<HealthcareDisclaimerVariant, RealEstateDisclaimerVariant> = {
  emergency: "fair-housing",
  "assistant-limits": "assistant-limits",
  "not-diagnosis": "not-legal",
};

/** @deprecated Use RealEstateDisclaimer from @aurixa/ui-kit */
export function HealthcareDisclaimer({
  variant = "assistant-limits",
  className,
}: {
  variant?: HealthcareDisclaimerVariant;
  className?: string;
}) {
  return (
    <RealEstateDisclaimer variant={LEGACY_VARIANT_MAP[variant]} className={className} />
  );
}
