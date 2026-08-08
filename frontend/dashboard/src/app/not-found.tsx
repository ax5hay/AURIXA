import Link from "next/link";
import { Button, EmptyState } from "@aurixa/ui-kit";

export default function NotFound() {
  return (
    <div className="page-container flex min-h-[60vh] items-center justify-center">
      <EmptyState
        eyebrow="404"
        title="Page not found"
        description="The requested operator view does not exist or has moved."
        action={
          <Button asChild>
            <Link href="/">Back to overview</Link>
          </Button>
        }
      />
    </div>
  );
}
