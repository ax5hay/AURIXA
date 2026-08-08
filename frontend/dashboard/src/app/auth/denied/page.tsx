import { Alert, EmptyState } from "@aurixa/ui-kit";
import { SignOutAction } from "../AuthActions";

export default function AccessDeniedPage() {
  return (
    <div className="page-container max-w-3xl py-16">
      <Alert title="Deployment access denied" tone="warning" className="mb-5">
        Your GitHub account is not an active member of an allowed organization and, when required,
        an allowed team.
      </Alert>
      <EmptyState
        title="This account cannot manage deployments"
        description="Sign out and use an authorized account, or ask a platform administrator to review the deployment access policy."
        action={<SignOutAction />}
      />
    </div>
  );
}
