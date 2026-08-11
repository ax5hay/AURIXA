import { UnavailableSection } from "@/components/UnavailableSection";

export default function ResultsPage() {
  return (
    <UnavailableSection
      eyebrow="Inspections and reports"
      title="Property reports"
      description="Guidance when inspection or appraisal reports are not yet available in the portal."
      unavailableTitle="Reports are not connected"
      unavailableBody="The current client API does not provide inspection summaries, appraisal PDFs, or title updates. We do not display placeholders because they could be mistaken for finalized reports."
      checklist={[
        "Write down the property address, report type, and inspection or due-diligence date.",
        "Ask your agent whether the report needs review before it is shared with you.",
        "Use the secure channel your brokerage provided for document delivery.",
      ]}
      steps={[
        {
          title: "Request the report",
          icon: "info",
          body: "Ask your agent for the report type, date, and expected delivery method. Timing varies by vendor and transaction stage.",
        },
        {
          title: "Review with your agent",
          icon: "check",
          body: "Do not make offer or repair decisions from an unverified draft. Walk through findings with your licensed agent.",
        },
      ]}
      related={[
        { href: "/documents", label: "Documents" },
        { href: "/showings", label: "Showings" },
        { href: "/help", label: "Support" },
      ]}
    />
  );
}
