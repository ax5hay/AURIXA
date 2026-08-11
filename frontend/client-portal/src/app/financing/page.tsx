import { UnavailableSection } from "@/components/UnavailableSection";

export default function FinancingPage() {
  return (
    <UnavailableSection
      eyebrow="Financing"
      title="Mortgage & pre-approval"
      description="Understand financing steps without legal or tax advice."
      unavailableTitle="Financing details are not synced yet"
      unavailableBody="Loan status and lender documents are not available from this portal yet. Your agent can connect you with preferred lenders."
      steps={[
        {
          title: "Get pre-approved",
          body: "Pre-approval clarifies budget and strengthens offers.",
          icon: "check",
        },
        {
          title: "Review closing costs",
          body: "Ask about earnest money, inspections, and title fees.",
          icon: "info",
        },
        {
          title: "Use Messages",
          body: "The assistant can share general buyer-process guidance from the knowledge base.",
          icon: "message",
        },
      ]}
      related={[
        { href: "/showings", label: "Showings" },
        { href: "/applications", label: "Applications" },
      ]}
    />
  );
}
