import type { IconName } from "@aurixa/ui-kit";

export interface PatientSection {
  href: string;
  label: string;
  description: string;
  icon: IconName;
  capability: "available" | "limited" | "local";
}

export const PATIENT_SECTIONS: PatientSection[] = [
  {
    href: "/records",
    label: "Records",
    description: "Review visit history and understand what clinical information is connected.",
    icon: "calendar",
    capability: "limited",
  },
  {
    href: "/results",
    label: "Results",
    description: "Learn how to get verified test and imaging results.",
    icon: "check",
    capability: "limited",
  },
  {
    href: "/documents",
    label: "Documents",
    description: "Find safe next steps for forms, letters, and visit documents.",
    icon: "info",
    capability: "limited",
  },
  {
    href: "/medications",
    label: "Medications",
    description: "Medication safety guidance without an incomplete medicine list.",
    icon: "info",
    capability: "limited",
  },
  {
    href: "/refills",
    label: "Refills",
    description: "Prepare a refill request through your verified pharmacy or care team.",
    icon: "refresh",
    capability: "limited",
  },
  {
    href: "/billing",
    label: "Billing",
    description: "Understand where to get an authoritative balance or itemized statement.",
    icon: "info",
    capability: "limited",
  },
  {
    href: "/insurance",
    label: "Insurance",
    description: "Review what to have ready when confirming coverage.",
    icon: "check",
    capability: "limited",
  },
  {
    href: "/notifications",
    label: "Notifications",
    description: "See notification availability and device-level portal preferences.",
    icon: "bell",
    capability: "local",
  },
];

export const isSectionActive = (pathname: string, href: string, related: string[] = []) =>
  pathname === href ||
  pathname.startsWith(`${href}/`) ||
  related.some((path) => pathname === path || pathname.startsWith(`${path}/`));
