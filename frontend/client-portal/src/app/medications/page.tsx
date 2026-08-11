import { UnavailableCareSection } from "@/components/UnavailableCareSection";

export default function MedicationsPage() {
  return (
    <UnavailableCareSection
      eyebrow="Medicines"
      title="Medications"
      description="Medication safety guidance while a verified medicine list is unavailable."
      unavailableTitle="Your medication list is not connected"
      unavailableBody="The current patient API does not provide prescriptions, dosages, allergies, or dispense history. Showing a partial or sample list would be unsafe, so this page does not claim to be your medication record."
      checklist={[
        "Write every prescription medicine, over-the-counter product, and supplement you take.",
        "Include dose, schedule, and the reason you take each one.",
        "Note allergies and past reactions before your next pharmacy or clinic contact.",
      ]}
      steps={[
        {
          title: "Keep one current list",
          icon: "info",
          body: "Include prescription medicines, over-the-counter products, vitamins, dose, schedule, and the reason you take each one. Bring it to every visit.",
        },
        {
          title: "Confirm before changing anything",
          icon: "alert",
          body: "Ask your prescriber or pharmacist about missed doses, side effects, interactions, or stopping a medicine. For a severe reaction, seek urgent help.",
        },
      ]}
      related={[
        { href: "/refills", label: "Refill guidance" },
        { href: "/appointments", label: "Visit details" },
        { href: "/chat", label: "Care messages" },
      ]}
    />
  );
}
