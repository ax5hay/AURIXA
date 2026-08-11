import { UnavailableSection } from "@/components/UnavailableSection";

export default function BillingPage() {
  return (
    <UnavailableSection
      eyebrow="Closing costs"
      title="Fees and statements"
      description="Practical guidance for earnest money, closing costs, and payment questions."
      unavailableTitle="Payment details are not connected"
      unavailableBody="The current client API does not provide ledgers, statements, or a payment processor. This portal cannot quote a balance or accept payment."
      checklist={[
        "Gather the property address, transaction milestone, and agent contact.",
        "Keep your official statement or invoice number handy if you already received one.",
        "Ask for an itemized fee sheet before paying an unclear charge.",
      ]}
      steps={[
        {
          title: "Review an official statement",
          icon: "info",
          body: "Match the property, milestone, line items, and amount due. Use only contact details printed on a statement you trust.",
        },
        {
          title: "Ask for a clear explanation",
          icon: "message",
          body: "Request an itemized fee sheet, escrow breakdown, or payment-plan information from your agent or title company.",
        },
      ]}
      related={[
        { href: "/financing", label: "Financing" },
        { href: "/showings", label: "Showings" },
        { href: "/help", label: "Support" },
      ]}
    />
  );
}
