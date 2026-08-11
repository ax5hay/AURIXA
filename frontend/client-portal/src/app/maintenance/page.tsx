import { UnavailableSection } from "@/components/UnavailableSection";

export default function MaintenancePage() {
  return (
    <UnavailableSection
      eyebrow="Maintenance"
      title="Service requests"
      description="Report maintenance issues for rental or managed properties."
      unavailableTitle="Maintenance ticketing not connected yet"
      unavailableBody="Work-order status will sync from your property manager in a later phase. For urgent property emergencies, contact on-call maintenance or call 911 for life-safety issues."
      steps={[
        {
          title: "Describe the issue",
          body: "Include location in the unit, severity, and whether access is needed.",
          icon: "info",
        },
        {
          title: "Check your lease",
          body: "Review who handles HVAC, plumbing, and appliance repairs.",
          icon: "check",
        },
        {
          title: "Message the assistant",
          body: "Ask how to submit a maintenance request through your organization.",
          icon: "message",
        },
      ]}
      related={[
        { href: "/help", label: "Help" },
        { href: "/chat", label: "Messages" },
      ]}
    />
  );
}
