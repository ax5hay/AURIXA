import { UnavailableSection } from "@/components/UnavailableSection";

export default function DocumentsPage() {
  return (
    <UnavailableSection
      eyebrow="Transaction documents"
      title="Documents"
      description="Guidance for disclosures, lease packets, closing checklists, and other transaction documents."
      unavailableTitle="Document storage is not connected"
      unavailableBody="The client API does not currently return signed disclosures or secure downloads. No document list is shown, so an empty screen cannot be mistaken for a complete file set."
      checklist={[
        "Name the document type, property address, and relevant date.",
        "Ask how your brokerage securely delivers copies.",
        "Avoid shared devices for any downloaded transaction documents.",
      ]}
      steps={[
        {
          title: "Request the exact document",
          icon: "info",
          body: "Tell your agent or coordinator the document type, property address, relevant date, and how it will be used. Ask how they securely deliver copies.",
        },
        {
          title: "Protect downloaded copies",
          icon: "alert",
          body: "Avoid shared devices and unencrypted email for transaction documents. Sign out when using a public or shared computer.",
        },
      ]}
      related={[
        { href: "/applications", label: "Applications" },
        { href: "/financing", label: "Financing" },
        { href: "/help", label: "Support" },
      ]}
    />
  );
}
