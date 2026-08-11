import Link from "next/link";
import { Button, PageHeader } from "@aurixa/ui-kit";
import { AccessibilityPreferences } from "@/components/AccessibilityPreferences";

export default function AccessibilityPage() {
  return (
    <div className="space-y-8 py-8 sm:py-10">
      <PageHeader
        eyebrow="Account and accessibility"
        title="Accessibility"
        description="Adjust this portal on your device and find the right path for care accommodations."
        actions={
          <Button asChild variant="secondary">
            <Link href="/account">Back to account</Link>
          </Button>
        }
      />
      <AccessibilityPreferences />
    </div>
  );
}
