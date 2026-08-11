import { UnavailableSection } from "@/components/UnavailableSection";

export default function InsurancePage() {
  return (
    <UnavailableSection
      eyebrow="Coverage"
      title="Homeowners and renters insurance"
      description="Prepare for coverage and binder conversations during your transaction."
      unavailableTitle="Insurance details are not connected"
      unavailableBody="The client API does not provide policy details, binders, or claims status. Coverage cannot be verified from this portal."
      checklist={[
        "Have your policy or quote reference number ready.",
        "Note the property address and closing or move-in date.",
        "Call the carrier or agent listed on your policy documents.",
      ]}
      steps={[
        {
          title: "Confirm with your carrier",
          icon: "check",
          body: "Use the number on your policy or quote. Ask about binders, deductibles, and required coverage for your loan or lease.",
        },
        {
          title: "Bring the right details",
          icon: "info",
          body: "Have the property address, effective date, and loan officer requirements ready. Never post policy images in an unsecured message.",
        },
      ]}
      related={[
        { href: "/financing", label: "Financing" },
        { href: "/showings", label: "Showings" },
        { href: "/help", label: "Support" },
      ]}
    />
  );
}
