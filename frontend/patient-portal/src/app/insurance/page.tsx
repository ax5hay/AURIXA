import { UnavailableCareSection } from "@/components/UnavailableCareSection";

export default function InsurancePage() {
  return (
    <UnavailableCareSection
      eyebrow="Costs and coverage"
      title="Insurance"
      description="Prepare for coverage, referral, and prior-authorization conversations."
      unavailableTitle="Insurance details are not connected"
      unavailableBody="The patient API does not provide member details, eligibility, claims, referrals, or authorization status. Coverage cannot be verified from this portal."
      checklist={[
        "Have your member ID and group number ready.",
        "Note the provider, service date, and procedure or test description.",
        "Call the member-services number printed on your insurance card.",
      ]}
      steps={[
        {
          title: "Confirm with your insurer",
          icon: "check",
          body: "Use the member-services number on your insurance card. Ask about network status, benefits, deductible, referral rules, and prior authorization.",
        },
        {
          title: "Bring the right details",
          icon: "info",
          body: "Have your member ID, group number, provider name, service date, and procedure or test description ready. Never post card images in an unsecured message.",
        },
      ]}
      related={[
        { href: "/billing", label: "Billing guidance" },
        { href: "/appointments", label: "Appointments" },
        { href: "/help", label: "Support" },
      ]}
    />
  );
}
