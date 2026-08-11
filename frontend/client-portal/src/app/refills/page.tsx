import { UnavailableSection } from "@/components/UnavailableSection";

export default function RefillsPage() {
  return (
    <UnavailableSection
      eyebrow="Maintenance"
      title="Service requests"
      description="This legacy route redirects to maintenance. Use maintenance for property service follow-up."
      unavailableTitle="Use the maintenance page"
      unavailableBody="Service request status will sync from your property manager in a later phase. For urgent property emergencies, contact on-call maintenance or call 911 for life-safety issues."
      steps={[
        {
          title: "Open maintenance",
          icon: "refresh",
          body: "Report maintenance issues for rental or managed properties from the maintenance section.",
        },
      ]}
      related={[
        { href: "/maintenance", label: "Maintenance" },
        { href: "/help", label: "Help" },
      ]}
    />
  );
}
