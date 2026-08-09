import Link from "next/link";
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
        <Alert title="Deployment authentication is not configured" tone="warning" className="mb-5">
          GitHub OAuth is not configured yet. You can still use local development access when it is
          enabled for this environment.
        </Alert>
      )}
      <EmptyState
        title="Sign in to deployment operations"
        description="Use an approved GitHub organization account, or local development access when enabled."
        action={
          enabled ? (
            <SignInActions
              callbackUrl={callbackUrl}
              githubEnabled={githubAuthConfigured}
              developmentEnabled={developmentAuthEnabled}
            />
          ) : (
            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center rounded-ui-md border border-ui-border px-4 text-sm font-semibold text-ui-ink hover:bg-ui-tint"
            >
              Back to dashboard
            </Link>
          )
        }
      />
    </div>
  );
}
