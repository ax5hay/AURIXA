import Link from "next/link";
import { Button, EmptyState } from "@aurixa/ui-kit";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl py-10">
      <EmptyState
        eyebrow="404 · Page not found"
        title="This page is unavailable"
        description="The address may have changed. This message does not indicate whether a record exists or whether you have access."
        action={
          <Button asChild>
            <Link href="/">Return to today</Link>
          </Button>
        }
      />
    </div>
  );
}
