import Link from "next/link";
import { Button, EmptyState } from "@aurixa/ui-kit";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center py-12">
      <EmptyState
        eyebrow="Page not found"
        title="That page isn’t here"
        description="The link may be out of date. Return home to find appointments, messages, and support."
        action={
          <Button asChild>
            <Link href="/">Return home</Link>
          </Button>
        }
      />
    </div>
  );
}
