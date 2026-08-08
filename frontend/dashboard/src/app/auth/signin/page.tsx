import { Alert, EmptyState } from "@aurixa/ui-kit";
import { developmentAuthEnabled, githubAuthConfigured } from "@/auth";
import { SignInActions } from "../AuthActions";

function safeCallbackUrl(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate?.startsWith("/") && !candidate.startsWith("//") ? candidate : "/deployments";
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}) {
  const callbackUrl = safeCallbackUrl((await searchParams).callbackUrl);
  const enabled = githubAuthConfigured || developmentAuthEnabled;

  return (
    <div className="page-container max-w-3xl py-16">
      {!enabled && (
        <Alert title="Deployment authentication is not configured" tone="danger" className="mb-5">
          Access is denied until a GitHub OAuth application and organization allowlist are
          configured.
        </Alert>
      )}
      <EmptyState
        title="Sign in to deployment operations"
        description="Use an approved GitHub organization account. If team restrictions are configured, active membership in an allowed team is also required."
        action={
          enabled ? (
            <SignInActions
              callbackUrl={callbackUrl}
              githubEnabled={githubAuthConfigured}
              developmentEnabled={developmentAuthEnabled}
            />
          ) : undefined
        }
      />
    </div>
  );
}
