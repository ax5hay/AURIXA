import Link from "next/link";
import { Alert, Button, Card, PageHeader, SectionHeader } from "@aurixa/ui-kit";

export default function PrivacyPage() {
  return (
    <div className="space-y-8 py-8 sm:py-10">
      <PageHeader
        eyebrow="Account and privacy"
        title="Privacy and access"
        description="Understand this portal’s current access boundary and protect your information."
        actions={
          <Button asChild variant="secondary">
            <Link href="/account">Back to account</Link>
          </Button>
        }
      />
      <Alert title="Patient-scoped access" tone="info">
        Portal requests stay on the same origin. Patient identity is resolved from the signed
        server-side session, and inaccessible resources fail closed.
      </Alert>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <SectionHeader title="What is enforced" />
          <ul className="space-y-2 text-sm leading-6 text-ui-muted">
            <li>• Automatic session expiration</li>
            <li>• Server-side patient and tenant scope checks</li>
            <li>• Private, no-store responses for patient data</li>
            <li>• Appointment ownership checks before cancellation</li>
          </ul>
        </Card>
        <Card>
          <SectionHeader title="Not connected yet" />
          <p className="text-sm leading-6 text-ui-muted">
            Consent history, caregiver or proxy access, data-sharing controls, account recovery,
            audit history, and data-export requests require backend identity and consent services.
            No control is presented as active until it can be enforced.
          </p>
        </Card>
      </div>
      <Card>
        <SectionHeader title="Protect this session" />
        <p className="text-sm leading-6 text-ui-muted">
          Sign out on shared devices, keep your device passcode private, and do not share health
          details through unverified email or text links. If you believe someone accessed your
          account, sign out and contact your organization through a known channel.
        </p>
      </Card>
    </div>
  );
}
