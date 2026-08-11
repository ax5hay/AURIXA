import type { IconName } from "@aurixa/ui-kit";

export interface ClientSection {
  href: string;
  label: string;
  description: string;
  icon: IconName;
  capability: "available" | "limited" | "local";
}

export const CLIENT_SECTIONS: ClientSection[] = [
  {
    href: "/listings",
    label: "Listings",
    description: "Browse active properties and open houses from your brokerage.",
    icon: "building",
    capability: "available",
  },
  {
    href: "/documents",
    label: "Documents",
    description: "Find lease packets, disclosures, and closing checklists.",
    icon: "listing",
    capability: "limited",
  },
  {
    href: "/applications",
    label: "Applications",
    description: "Track rental or buyer application status and required items.",
    icon: "check",
    capability: "limited",
  },
  {
    href: "/financing",
    label: "Financing",
    description: "Review pre-approval steps and what to prepare for lenders.",
    icon: "key",
    capability: "limited",
  },
  {
    href: "/maintenance",
    label: "Maintenance",
    description: "Submit or follow up on property maintenance requests.",
    icon: "refresh",
    capability: "limited",
  },
  {
    href: "/notifications",
    label: "Notifications",
    description: "Portal notification preferences on this device.",
    icon: "bell",
    capability: "local",
  },
];

export const isSectionActive = (pathname: string, href: string, related: string[] = []) =>
  pathname === href ||
  pathname.startsWith(`${href}/`) ||
  related.some((path) => pathname === path || pathname.startsWith(`${path}/`));
