import Link from "next/link";
import {
  Alert,
  Button,
  Card,
  HealthcareDisclaimer,
  Icon,
  PageHeader,
  SectionHeader,
  StatusBadge,
  type IconName,
} from "@aurixa/ui-kit";

interface UnavailableCareSectionProps {
  eyebrow: string;
  title: string;
  description: string;
  unavailableTitle: string;
  unavailableBody: string;
  steps: Array<{ title: string; body: string; icon?: IconName }>;
  related?: Array<{ href: string; label: string }>;
  checklist?: string[];
}

export function UnavailableCareSection({
  eyebrow,
  title,
  description,
  unavailableTitle,
  unavailableBody,
  steps,
  related = [],
  checklist = [],
}: UnavailableCareSectionProps) {
  return (
    <div className="space-y-8 py-8 sm:py-10">
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        aside={<StatusBadge status="offline" label="Feed unavailable" />}
      />

      <Alert title={unavailableTitle} tone="info">
        {unavailableBody}
      </Alert>

      {checklist.length > 0 && (
        <Card variant="feature" padding="lg">
          <SectionHeader
            title="Bring this to your next contact"
            description="A short preparation list while the clinical feed remains disconnected."
          />
          <ol className="mt-4 space-y-3">
            {checklist.map((item, index) => (
              <li key={item} className="flex gap-3 text-sm leading-6 text-ui-ink">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ui-tint text-xs font-semibold text-ui-accent">
                  {index + 1}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </Card>
      )}

      <section aria-labelledby="next-steps-heading">
        <SectionHeader
          title="What you can do now"
          description="Use a channel you already trust for information tied to your care."
        />
        <div className="grid gap-4 md:grid-cols-2">
          {steps.map((step) => (
            <Card key={step.title}>
              <div className="flex items-start gap-3">
                {step.icon && (
                  <span className="grid h-10 w-10 place-items-center rounded-ui-md bg-ui-tint text-ui-accent">
                    <Icon name={step.icon} />
                  </span>
                )}
                <div>
                  <h2 className="font-display text-xl font-medium text-ui-ink">{step.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-ui-muted">{step.body}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {related.length > 0 && (
        <nav aria-label={`Related ${title.toLowerCase()} pages`}>
          <SectionHeader title="Related pages" />
          <div className="flex flex-wrap gap-3">
            {related.map((item) => (
              <Button key={item.href} asChild variant="secondary">
                <Link href={item.href}>{item.label}</Link>
              </Button>
            ))}
          </div>
        </nav>
      )}

      <HealthcareDisclaimer variant="emergency" />
    </div>
  );
}
