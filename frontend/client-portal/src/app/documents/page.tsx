import { UnavailableCareSection } from "@/components/UnavailableCareSection";

export default function DocumentsPage() {
  return (
    <UnavailableCareSection
      eyebrow="Records and results"
      title="Documents"
      description="Guidance for visit summaries, letters, forms, and other care documents."
      unavailableTitle="Document storage is not connected"
      unavailableBody="The patient API does not currently return clinical documents or secure downloads. No document list is shown, so an empty screen cannot be mistaken for a complete chart."
      checklist={[
        "Name the document type, visit date, and clinician.",
        "Ask how your organization securely delivers copies.",
        "Avoid shared devices for any downloaded health documents.",
      ]}
      steps={[
        {
          title: "Request the exact document",
          icon: "info",
          body: "Tell your care team the document type, relevant visit date, clinician, and how it will be used. Ask how they securely deliver copies.",
        },
        {
          title: "Protect downloaded copies",
          icon: "alert",
          body: "Avoid shared devices and unencrypted email for health documents. Sign out when using a public or shared computer.",
        },
      ]}
      related={[
        { href: "/records", label: "Records overview" },
        { href: "/results", label: "Test results" },
        { href: "/help", label: "Support" },
      ]}
    />
  );
}
