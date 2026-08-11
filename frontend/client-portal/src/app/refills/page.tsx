import { UnavailableCareSection } from "@/components/UnavailableCareSection";

export default function RefillsPage() {
  return (
    <UnavailableCareSection
      eyebrow="Medicines"
      title="Refills"
      description="Prepare a complete refill request and send it through a verified channel."
      unavailableTitle="Refill requests cannot be submitted here"
      unavailableBody="No prescribing or pharmacy API is connected. This portal will not show a confirmation or imply that a refill request reached your clinician."
      checklist={[
        "Medication name and strength from the label",
        "Prescription number and pharmacy phone number",
        "Days of supply remaining and the prescribing clinician",
      ]}
      steps={[
        {
          title: "Start with your pharmacy",
          icon: "refresh",
          body: "Use the pharmacy named on your medication label. Have the medication name, prescription number, remaining supply, and prescriber ready.",
        },
        {
          title: "Allow time for review",
          icon: "clock",
          body: "Some medicines require a visit, monitoring, or prior authorization. Contact your care team early using their established secure channel.",
        },
      ]}
      related={[
        { href: "/medications", label: "Medication guidance" },
        { href: "/chat", label: "Care messages" },
        { href: "/appointments", label: "Appointments" },
      ]}
    />
  );
}