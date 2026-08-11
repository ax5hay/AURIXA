import { UnavailableSection } from "@/components/UnavailableSection";

export default function MedicationsPage() {
  return (
    <UnavailableSection
      eyebrow="Maintenance"
      title="Property services"
      description="This legacy route redirects to maintenance for rental and managed-property workflows."
      unavailableTitle="Use the maintenance page"
      unavailableBody="Work-order and vendor status are not connected yet. For urgent property emergencies, contact on-call maintenance or call 911 for life-safety issues."
      steps={[
        {
          title: "Describe the issue",
          body: "Include location in the unit, severity, and whether access is needed.",
          icon: "info",
        },
      ]}
      related={[
        { href: "/maintenance", label: "Maintenance" },
        { href: "/chat", label: "Messages" },
      ]}
    />
  );
}
