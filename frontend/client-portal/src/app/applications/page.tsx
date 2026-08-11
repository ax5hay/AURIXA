import { UnavailableSection } from "@/components/UnavailableSection";

export default function ApplicationsPage() {
  return (
    <UnavailableSection
      eyebrow="Applications"
      title="Rental & buyer applications"
      description="Track application status and required documents for your organization."
      unavailableTitle="Application feed not connected yet"
      unavailableBody="The client API will surface application status in a later release. Use Messages to ask about your application or contact your agent directly."
      steps={[
        {
          title: "Prepare documents",
          body: "Photo ID, proof of income, and references are commonly required.",
          icon: "info",
        },
        {
          title: "Ask in Messages",
          body: "Your assistant can explain typical timelines and fees from the knowledge base.",
          icon: "message",
        },
        {
          title: "Contact your agent",
          body: "Use the channel your brokerage or PM team already provided.",
          icon: "calendar",
        },
      ]}
      related={[
        { href: "/documents", label: "Documents" },
        { href: "/financing", label: "Financing" },
      ]}
      checklist={[
        "Government-issued photo ID",
        "Recent pay stubs or proof of income",
        "Rental or employer references",
        "Application fee ready if required",
      ]}
    />
  );
}
