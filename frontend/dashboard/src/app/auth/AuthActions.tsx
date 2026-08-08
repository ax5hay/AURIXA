"use client";

import { Button } from "@aurixa/ui-kit";
import { signIn, signOut } from "next-auth/react";

export function SignInActions({
  callbackUrl,
  githubEnabled,
  developmentEnabled,
}: {
  callbackUrl: string;
  githubEnabled: boolean;
  developmentEnabled: boolean;
}) {
  return (
    <div className="flex flex-wrap justify-center gap-3">
      {githubEnabled && (
        <Button onClick={() => void signIn("github", { callbackUrl })}>Continue with GitHub</Button>
      )}
      {developmentEnabled && (
        <Button
          variant={githubEnabled ? "secondary" : "primary"}
          onClick={() => void signIn("development", { callbackUrl })}
        >
          Use local development access
        </Button>
      )}
    </div>
  );
}

export function SignOutAction() {
  return (
    <Button variant="secondary" onClick={() => void signOut({ callbackUrl: "/auth/signin" })}>
      Sign out
    </Button>
  );
}
