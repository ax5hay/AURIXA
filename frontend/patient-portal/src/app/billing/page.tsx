import { UnavailableCareSection } from "@/components/UnavailableCareSection";

export default function BillingPage() {
  return (
    <UnavailableCareSection
      eyebrow="Costs and coverage"
      title="Billing"
      description="Practical guidance for balances, statements, payment questions, and financial help."
      unavailableTitle="Balances and payments are not connected"
      unavailableBody="The current patient API does not provide charges, statements, payment history, or a payment processor. This portal cannot quote a balance or accept payment."
      checklist={[
        "Gather the patient name, date of service, and provider from your visit.",
        "Keep the official statement number handy if you already received one.",
        "Ask billing for an itemized bill before disputing or paying an unclear charge.",
      ]}
      steps={[
        {
          title: "Review an official statement",
          icon: "info",
          body: "Match the patient name, date of service, provider, charge, insurance adjustment, and amount due. Use only contact details printed on a statement you trust.",
        },
        {
          title: "Ask for a clear explanation",
          icon: "message",
          body: "Request an itemized bill, coding review, payment-plan information, or financial-assistance policy from the billing office.",
        },
      ]}
      related={[
        { href: "/insurance", label: "Insurance guidance" },
        { href: "/appointments", label: "Visit history" },
        { href: "/help", label: "Support" },
      ]}
    />
  );
}
