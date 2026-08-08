"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Accordion,
  Alert,
  Badge,
  Button,
  DataTable,
  DiagnosticBundle,
  Dialog,
  EmptyState,
  FieldShell,
  Input,
  PageHeader,
  PageLoader,
  ProgressBar,
  SectionHeader,
  Timeline,
  useToast,
} from "@aurixa/ui-kit";
import { PageShell, StatusBadge } from "@/components/OperatorCompositions";
import { cancelDeployment, getDeployment, rollbackDeployment, type DeploymentJob } from "../api";

function stateLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function ConfirmationDialog({
  action,
  release,
  open,
  busy,
  onOpenChange,
  onConfirm,
}: {
  action: "cancel" | "rollback";
  release: string;
  open: boolean;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  const phrase = action === "cancel" ? "CANCEL" : "ROLLBACK";
  const [confirmation, setConfirmation] = useState("");

  useEffect(() => {
    if (!open) setConfirmation("");
  }, [open]);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={`${stateLabel(action)} deployment`}
      description={
        action === "cancel"
          ? `Stop remaining work for ${release}. Already-applied changes may remain.`
          : `Create a rollback job for ${release}. Server policy and checks still apply.`
      }
      size="sm"
      footer={
        <>
          <Button variant="quiet" onClick={() => onOpenChange(false)}>
            Keep deployment
          </Button>
          <Button
            variant="danger"
            loading={busy}
            disabled={confirmation !== phrase}
            onClick={onConfirm}
          >
            Confirm {action}
          </Button>
        </>
      }
    >
      <Alert title="This action is audited" tone="warning">
        The deployment API must independently verify your administrator session and whether this
        transition is allowed.
      </Alert>
      <FieldShell className="mt-5" label={`Type ${phrase} to continue`} required>
        <Input
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
      </FieldShell>
    </Dialog>
  );
}

function JobContent({ id }: { id: string }) {
  const { toast } = useToast();
  const [job, setJob] = useState<DeploymentJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<"cancel" | "rollback" | null>(null);
  const [mutating, setMutating] = useState(false);

  const load = useCallback(
    async (showLoader = true) => {
      if (showLoader) setLoading(true);
      try {
        setJob(await getDeployment(id));
        setError(null);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Deployment job could not be loaded.");
      } finally {
        if (showLoader) setLoading(false);
      }
    },
    [id],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!job || !["pending", "queued", "running", "rolling_back"].includes(job.state)) return;
    const timer = window.setInterval(() => void load(false), 10_000);
    return () => window.clearInterval(timer);
  }, [job, load]);

  const executeMutation = async () => {
    if (!job || !confirmation) return;
    setMutating(true);
    try {
      const updated =
        confirmation === "cancel"
          ? await cancelDeployment(job.id)
          : await rollbackDeployment(job.id);
      setJob(updated);
      toast({
        title: confirmation === "cancel" ? "Cancellation requested" : "Rollback requested",
        description: `${updated.release} is ${stateLabel(updated.state).toLowerCase()}.`,
        tone: "success",
      });
      setConfirmation(null);
    } catch (reason) {
      const message =
        reason instanceof Error ? reason.message : "The request could not be applied.";
      toast({ title: `${stateLabel(confirmation)} failed`, description: message, tone: "error" });
    } finally {
      setMutating(false);
    }
  };

  const currentStep = useMemo(() => {
    if (!job) return 0;
    const active = job.steps.findIndex((step) => step.state === "running");
    if (active >= 0) return active;
    return job.steps.filter((step) => step.state === "succeeded").length;
  }, [job]);

  if (loading) return <PageLoader label="Loading deployment job" />;

  if (!job) {
    return (
      <PageShell>
        <Alert title="Deployment job unavailable" tone="danger" className="mb-5">
          {error ?? "No deployment job was returned."}
        </Alert>
        <EmptyState
          title="Job could not be displayed"
          description="Check the job identifier and your administrator session."
          action={
            <Button asChild variant="secondary">
              <Link href="/deployments">Back to deployments</Link>
            </Button>
          }
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow={`${job.environment} · deployment job`}
        title={job.release}
        description={`Requested by ${job.createdBy} · ${job.strategy} strategy · ${job.services.join(", ")}`}
        actions={
          <div className="flex flex-wrap gap-2">
            {job.githubUrl && (
              <Button asChild variant="secondary">
                <a href={job.githubUrl} target="_blank" rel="noreferrer">
                  View release on GitHub ↗
                </a>
              </Button>
            )}
            {job.canCancel && (
              <Button variant="secondary" onClick={() => setConfirmation("cancel")}>
                Cancel rollout
              </Button>
            )}
            {job.canRollback && (
              <Button variant="danger" onClick={() => setConfirmation("rollback")}>
                Roll back
              </Button>
            )}
          </div>
        }
      />
      {error && (
        <Alert title="Live refresh failed" tone="warning" className="mb-5">
          {error} Showing the latest available job snapshot.
        </Alert>
      )}
      <div className="mb-7 grid gap-4 rounded-ui-lg border border-ui-border bg-ui-surface p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <ProgressBar
          progress={job.progress}
          label={stateLabel(job.state)}
          steps={job.steps.map((step) => step.name)}
          currentStep={Math.min(currentStep, Math.max(job.steps.length - 1, 0))}
        />
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <StatusBadge status={job.state} label={stateLabel(job.state)} />
          <Badge tone={job.approval?.state === "approved" ? "success" : "warning"}>
            Approval: {stateLabel(job.approval?.state ?? "not_required")}
          </Badge>
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]">
        <div className="space-y-8">
          <section>
            <SectionHeader
              title="Execution steps"
              description="Status and bounded log excerpts returned by the deployment API."
            />
            {job.steps.length ? (
              <Accordion
                items={job.steps.map((step) => ({
                  id: step.id,
                  title: `${step.name} — ${stateLabel(step.state)}`,
                  content: (
                    <div>
                      <p className="mb-3 text-xs text-ui-faint">
                        {step.startedAt
                          ? `Started ${new Date(step.startedAt).toLocaleString()}`
                          : "Not started"}
                        {step.finishedAt
                          ? ` · Finished ${new Date(step.finishedAt).toLocaleString()}`
                          : ""}
                      </p>
                      <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-ui-md border border-ui-border bg-ui-surface-inset p-4 font-mono text-xs leading-5 text-ui-muted">
                        {step.logExcerpt ?? "No log excerpt was provided."}
                      </pre>
                    </div>
                  ),
                }))}
              />
            ) : (
              <EmptyState
                compact
                title="No execution steps"
                description="Steps will appear after orchestration begins."
              />
            )}
          </section>
          <section>
            <SectionHeader
              title="Checks"
              description="Release gates and post-deploy verification."
            />
            {job.checks.length ? (
              <DataTable
                caption="Deployment checks"
                headers={["Check", "Status", "Detail", "Link"]}
              >
                {job.checks.map((check) => (
                  <tr key={check.id}>
                    <td className="table-cell font-semibold text-white">{check.name}</td>
                    <td className="table-cell">
                      <StatusBadge status={check.status} label={stateLabel(check.status)} />
                    </td>
                    <td className="table-cell">{check.detail ?? "No detail"}</td>
                    <td className="table-cell">
                      {check.url ? (
                        <a
                          href={check.url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-ui-accent hover:underline"
                        >
                          Open ↗
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </DataTable>
            ) : (
              <EmptyState
                compact
                title="No checks reported"
                description="No checks are available yet."
              />
            )}
          </section>
        </div>
        <aside className="space-y-8">
          <section>
            <SectionHeader title="Timeline" description="Audited job events." />
            {job.timeline.length ? (
              <div className="surface-card">
                <Timeline
                  items={job.timeline.map((event) => ({
                    id: event.id,
                    title: event.title,
                    description: (
                      <>
                        {event.detail}
                        {event.actor && <span className="block text-xs">Actor: {event.actor}</span>}
                      </>
                    ),
                    time: new Date(event.occurredAt).toLocaleString(),
                  }))}
                />
              </div>
            ) : (
              <EmptyState
                compact
                title="No timeline events"
                description="Events have not been reported."
              />
            )}
          </section>
          <section>
            <SectionHeader title="Job references" />
            <dl className="surface-card space-y-4 text-sm">
              <div>
                <dt className="text-xs text-ui-faint">Job ID</dt>
                <dd className="mt-1 break-all font-mono">{job.id}</dd>
              </div>
              <div>
                <dt className="text-xs text-ui-faint">Commit</dt>
                <dd className="mt-1 font-mono">{job.commitSha ?? "Not reported"}</dd>
              </div>
              {job.workflowUrl && (
                <div>
                  <dt className="text-xs text-ui-faint">GitHub workflow</dt>
                  <dd className="mt-1">
                    <a
                      href={job.workflowUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-ui-accent hover:underline"
                    >
                      Open workflow ↗
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </section>
          <DiagnosticBundle
            title="Redacted diagnostic bundle"
            description="Copy a sanitized job snapshot. Secret-like fields and values are redacted."
            data={() => ({ job, serverDiagnostic: job.diagnostic })}
            context={{ deploymentId: job.id, environment: job.environment }}
          />
        </aside>
      </div>
      <ConfirmationDialog
        action={confirmation ?? "cancel"}
        release={job.release}
        open={confirmation !== null}
        busy={mutating}
        onOpenChange={(open) => {
          if (!open) setConfirmation(null);
        }}
        onConfirm={executeMutation}
      />
    </PageShell>
  );
}

export default function DeploymentJobPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  return <JobContent id={id} />;
}
