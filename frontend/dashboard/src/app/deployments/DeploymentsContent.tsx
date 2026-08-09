"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  DataTable,
  Dialog,
  EmptyState,
  ErrorSummary,
  FieldShell,
  Input,
  PageHeader,
  PageLoader,
  ProgressBar,
  SectionHeader,
  Select,
  useToast,
} from "@aurixa/ui-kit";
import { SignInActions } from "@/app/auth/AuthActions";
import {
  createDeployment,
  DeploymentApiError,
  getDeploymentOverview,
  type CreateDeploymentInput,
  type DeploymentEnvironment,
  type DeploymentOverview,
} from "./api";
import { PageShell, StatusBadge } from "@/components/OperatorCompositions";

const PRODUCTION_CONFIRMATION = "DEPLOY PRODUCTION";

function formatFreshness(value: string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "Freshness unknown";
  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60_000));
  if (minutes < 1) return "Checked just now";
  return `Checked ${minutes}m ago`;
}

function stateLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function DeploymentSignInPrompt({
  callbackUrl,
  githubEnabled,
  developmentEnabled,
}: {
  callbackUrl: string;
  githubEnabled: boolean;
  developmentEnabled: boolean;
}) {
  const signInHref = `/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  return (
    <Alert title="Sign in to manage deployments" tone="warning" className="mb-6">
      <p className="text-sm leading-6 text-ui-muted">
        Deployment data and write actions require an administrator session.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {(githubEnabled || developmentEnabled) && (
          <SignInActions
            callbackUrl={callbackUrl}
            githubEnabled={githubEnabled}
            developmentEnabled={developmentEnabled}
          />
        )}
        <Button asChild variant="secondary">
          <Link href={signInHref}>Open sign-in page</Link>
        </Button>
      </div>
    </Alert>
  );
}

function EnvironmentCard({ environment }: { environment: DeploymentEnvironment }) {
  return (
    <article className="surface-card min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">{environment.name}</p>
          <h2 className="text-xl font-semibold capitalize text-ui-ink">{environment.name}</h2>
        </div>
        <StatusBadge status={environment.health} label={stateLabel(environment.health)} />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 border-y border-ui-border py-4 text-sm">
        <div>
          <p className="text-xs text-ui-faint">Configuration drift</p>
          <p className="mt-1 font-semibold text-ui-ink">
            {environment.drift ? "Detected" : "In sync"}
          </p>
        </div>
        <div>
          <p className="text-xs text-ui-faint">Freshness</p>
          <p className="mt-1 font-semibold text-ui-ink">
            {formatFreshness(environment.checkedAt)}
          </p>
        </div>
      </div>
      {environment.activeDeployment ? (
        <div className="mt-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-ui-faint">Active rollout</p>
              <Link
                href={`/deployments/${environment.activeDeployment.id}`}
                className="mt-1 block font-mono text-sm font-semibold text-ui-accent hover:underline"
              >
                {environment.activeDeployment.release}
              </Link>
            </div>
            <StatusBadge status={environment.activeDeployment.state} />
          </div>
          <ProgressBar progress={environment.activeDeployment.progress} label="Rollout progress" />
        </div>
      ) : (
        <p className="mt-5 text-sm text-ui-muted">No active rollout.</p>
      )}
      <div className="mt-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ui-faint">
          Service revisions
        </p>
        <ul className="divide-y divide-ui-border">
          {environment.services.map((service) => (
            <li
              key={service.service}
              className="flex items-center justify-between gap-3 py-2.5 text-sm"
            >
              <span className="min-w-0 truncate text-ui-ink">{service.service}</span>
              <span className="flex shrink-0 items-center gap-2">
                {service.desiredRevision && service.desiredRevision !== service.revision && (
                  <Badge tone="warning">Drift</Badge>
                )}
                <code className="text-xs text-ui-muted">{service.revision}</code>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

function EnvironmentComparison({ environments }: { environments: DeploymentEnvironment[] }) {
  const staging = environments.find((environment) => environment.name === "staging");
  const production = environments.find((environment) => environment.name === "production");
  if (!staging || !production) return null;

  const stagingServices = new Map(staging.services.map((service) => [service.service, service]));
  const productionServices = new Map(
    production.services.map((service) => [service.service, service]),
  );
  const serviceNames = [
    ...new Set([...stagingServices.keys(), ...productionServices.keys()]),
  ].sort();
  const mismatches = serviceNames.filter((name) => {
    const left = stagingServices.get(name)?.revision;
    const right = productionServices.get(name)?.revision;
    return left && right && left !== right;
  });

  const risks = [
    staging.drift || production.drift
      ? "Configuration drift is present in at least one environment."
      : null,
    staging.activeDeployment || production.activeDeployment
      ? "An active rollout is in progress."
      : null,
    mismatches.length
      ? `${mismatches.length} service revision${mismatches.length === 1 ? "" : "s"} differ between staging and production.`
      : null,
    production.health !== "healthy" && production.health !== "unknown"
      ? `Production health is currently ${production.health}.`
      : null,
  ].filter(Boolean) as string[];

  return (
    <section className="mt-8" aria-labelledby="comparison-heading">
      <SectionHeader
        title="Environment comparison"
        description="Revision and risk summary before promoting a release."
      />
      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <article className="surface-card overflow-x-auto">
          <DataTable
            caption="Staging versus production revisions"
            headers={["Service", "Staging", "Production", "Delta"]}
          >
            {serviceNames.length ? (
              serviceNames.map((name) => {
                const left = stagingServices.get(name)?.revision ?? "—";
                const right = productionServices.get(name)?.revision ?? "—";
                const delta = left !== "—" && right !== "—" && left !== right ? "Mismatch" : "Match";
                return (
                  <tr key={name}>
                    <td className="table-cell font-medium text-ui-ink">{name}</td>
                    <td className="table-cell font-mono text-xs">{left}</td>
                    <td className="table-cell font-mono text-xs">{right}</td>
                    <td className="table-cell">
                      <Badge tone={delta === "Mismatch" ? "warning" : "success"}>{delta}</Badge>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="table-cell" colSpan={4}>
                  No service revisions reported yet.
                </td>
              </tr>
            )}
          </DataTable>
        </article>
        <article className="surface-card">
          <h3 className="text-sm font-semibold text-ui-ink">Risk summary</h3>
          {risks.length ? (
            <ul className="mt-4 space-y-3 text-sm text-ui-muted">
              {risks.map((risk) => (
                <li key={risk} className="rounded-ui-md border border-ui-border px-3 py-2">
                  {risk}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-ui-muted">
              No active drift, mismatched revisions, or unhealthy production signals were reported.
            </p>
          )}
        </article>
      </div>
    </section>
  );
}

function DeploymentComposer({
  open,
  onOpenChange,
  services,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  services: string[];
  onCreated: (id: string) => void;
}) {
  const { toast } = useToast();
  const [version, setVersion] = useState("");
  const [gitSha, setGitSha] = useState("");
  const [ref, setRef] = useState("main");
  const [environment, setEnvironment] = useState<CreateDeploymentInput["environment"]>("staging");
  const [strategy, setStrategy] = useState<CreateDeploymentInput["strategy"]>("rolling");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = [
      ...(!version.trim() ? ["Enter a release version."] : []),
      ...(!/^[0-9a-f]{7,64}$/i.test(gitSha.trim())
        ? ["Enter a Git commit SHA containing 7 to 64 hexadecimal characters."]
        : []),
      ...(!ref.trim() ? ["Enter a Git ref."] : []),
      ...(!selectedServices.length ? ["Select at least one service."] : []),
      ...(environment === "production" && confirmation !== PRODUCTION_CONFIRMATION
        ? [`Type “${PRODUCTION_CONFIRMATION}” exactly to confirm.`]
        : []),
    ];
    setErrors(nextErrors);
    if (nextErrors.length) return;

    setSubmitting(true);
    try {
      const job = await createDeployment({
        environment,
        version: version.trim(),
        gitSha: gitSha.trim(),
        ref: ref.trim(),
        services: selectedServices,
        strategy,
        productionConfirmation: environment === "production" ? PRODUCTION_CONFIRMATION : undefined,
      });
      toast({
        title: "Deployment request created",
        description:
          job.state === "awaiting_approval"
            ? "The production approval gate is pending."
            : `${job.release} is ${stateLabel(job.state).toLowerCase()}.`,
        tone: "success",
      });
      onOpenChange(false);
      onCreated(job.id);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Deployment could not be created.";
      setErrors([message]);
      toast({ title: "Deployment request failed", description: message, tone: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Compose deployment"
      description="Create an auditable release request. The server applies authorization and environment policy."
      size="lg"
    >
      <form onSubmit={submit} noValidate>
        <ErrorSummary errors={errors} />
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <FieldShell label="Version" required hint="Human-readable immutable release version.">
            <Input
              value={version}
              onChange={(event) => setVersion(event.target.value)}
              placeholder="v2.4.1"
              autoComplete="off"
            />
          </FieldShell>
          <FieldShell label="Git SHA" required hint="Full or abbreviated commit SHA.">
            <Input
              value={gitSha}
              onChange={(event) => setGitSha(event.target.value)}
              placeholder="a1b2c3d"
              autoComplete="off"
              spellCheck={false}
            />
          </FieldShell>
          <FieldShell label="Git ref" required hint="Branch or tag used for workflow dispatch.">
            <Input
              value={ref}
              onChange={(event) => setRef(event.target.value)}
              placeholder="main"
              autoComplete="off"
              spellCheck={false}
            />
          </FieldShell>
          <FieldShell label="Environment" required>
            <Select
              value={environment}
              onChange={(event) => {
                setEnvironment(event.target.value as CreateDeploymentInput["environment"]);
                setConfirmation("");
              }}
            >
              <option value="staging">Staging</option>
              <option value="production">Production</option>
            </Select>
          </FieldShell>
          <FieldShell label="Strategy" required>
            <Select
              value={strategy}
              onChange={(event) =>
                setStrategy(event.target.value as CreateDeploymentInput["strategy"])
              }
            >
              <option value="rolling">Rolling</option>
              <option value="canary">Canary</option>
            </Select>
          </FieldShell>
        </div>
        <fieldset className="mt-5">
          <legend className="text-sm font-semibold text-ui-ink">Services</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {services.map((service) => (
              <label
                key={service}
                className="flex min-h-11 cursor-pointer items-center gap-3 rounded-ui-md border border-ui-border px-3 text-sm hover:bg-ui-tint"
              >
                <input
                  type="checkbox"
                  checked={selectedServices.includes(service)}
                  onChange={(event) =>
                    setSelectedServices((current) =>
                      event.target.checked
                        ? [...current, service]
                        : current.filter((item) => item !== service),
                    )
                  }
                  className="h-4 w-4 accent-[rgb(var(--ui-accent-rgb))]"
                />
                {service}
              </label>
            ))}
          </div>
        </fieldset>
        <Alert
          title={environment === "production" ? "Production gate" : "Staging first"}
          tone={environment === "production" ? "warning" : "info"}
          className="mt-5"
        >
          {environment === "production"
            ? "Verify the same release succeeded in staging. Server policy may hold this request for independent approval."
            : "Promote this exact release through staging checks before requesting production."}
        </Alert>
        {environment === "production" && (
          <FieldShell
            className="mt-5"
            label={`Type ${PRODUCTION_CONFIRMATION} to continue`}
            required
          >
            <Input
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </FieldShell>
        )}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="quiet" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            Create deployment
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export function DeploymentsContent({
  githubAuthConfigured,
  developmentAuthEnabled,
}: {
  githubAuthConfigured: boolean;
  developmentAuthEnabled: boolean;
}) {
  const [overview, setOverview] = useState<DeploymentOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setOverview(await getDeploymentOverview());
      setError(null);
      setAuthRequired(false);
    } catch (reason) {
      const unauthorized = reason instanceof DeploymentApiError && reason.status === 401;
      setAuthRequired(unauthorized);
      setError(
        unauthorized
          ? "Sign in to load deployment data."
          : reason instanceof Error
            ? reason.message
            : "Deployments could not be loaded.",
      );
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const history = useMemo(() => overview?.recentDeployments ?? [], [overview]);

  if (loading) return <PageLoader label="Loading deployment control plane" />;

  return (
    <PageShell>
      <PageHeader
        eyebrow="System · administrator"
        title="Deployment command center"
        description="Coordinate staged releases, inspect environment state, and follow auditable rollout activity."
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={load}>
              Refresh
            </Button>
            <Button onClick={() => setComposerOpen(true)} disabled={authRequired}>
              New deployment
            </Button>
          </div>
        }
      />
      {authRequired && (
        <DeploymentSignInPrompt
          callbackUrl="/deployments"
          githubEnabled={githubAuthConfigured}
          developmentEnabled={developmentAuthEnabled}
        />
      )}
      {error && !authRequired && (
        <Alert title="Deployment data unavailable" tone="danger" className="mb-6">
          <span>{error} </span>
          <button type="button" onClick={load} className="font-semibold underline">
            Try again
          </button>
        </Alert>
      )}
      {!overview ? (
        <EmptyState
          title={authRequired ? "Deployment sign-in required" : "No deployment data available"}
          description={
            authRequired
              ? "Use the sign-in options above to open an administrator session."
              : "The administrator deployment endpoint did not return a command-center snapshot."
          }
          action={
            authRequired ? (
              <Button asChild>
                <Link href="/auth/signin?callbackUrl=/deployments">Open sign-in page</Link>
              </Button>
            ) : (
              <Button onClick={load}>Retry</Button>
            )
          }
        />
      ) : (
        <>
          <section aria-labelledby="environment-heading">
            <SectionHeader
              title="Environments"
              description="Health, drift, freshness, active rollouts, and deployed revisions."
            />
            {overview.environments.length ? (
              <div className="grid gap-5 xl:grid-cols-2">
                {overview.environments.map((environment) => (
                  <EnvironmentCard key={environment.name} environment={environment} />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No environments configured"
                description="Deployment environments will appear after the server reports them."
              />
            )}
          </section>
          <EnvironmentComparison environments={overview.environments} />
          <section className="mt-8">
            <SectionHeader
              title="Recent deployment history"
              description="Release requests and their approval state."
              count={history.length}
            />
            {history.length ? (
              <DataTable
                caption="Recent deployments"
                headers={["Release", "Environment", "State", "Approval", "Created", ""]}
              >
                {history.map((deployment) => (
                  <tr key={deployment.id}>
                    <td className="table-cell">
                      <span className="block font-mono font-semibold text-ui-ink">
                        {deployment.release}
                      </span>
                      <span className="text-xs text-ui-muted">
                        {deployment.services.join(", ")}
                      </span>
                    </td>
                    <td className="table-cell capitalize">{deployment.environment}</td>
                    <td className="table-cell">
                      <StatusBadge status={deployment.state} label={stateLabel(deployment.state)} />
                    </td>
                    <td className="table-cell">
                      {deployment.approval ? stateLabel(deployment.approval.state) : "Not required"}
                    </td>
                    <td className="table-cell">
                      <time dateTime={deployment.createdAt}>
                        {new Date(deployment.createdAt).toLocaleString()}
                      </time>
                    </td>
                    <td className="table-cell text-right">
                      <Button asChild variant="quiet" size="sm">
                        <Link href={`/deployments/${deployment.id}`}>View job</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </DataTable>
            ) : (
              <EmptyState
                title="No deployment history"
                description="Create a staging deployment when a release is ready."
                action={<Button onClick={() => setComposerOpen(true)}>New deployment</Button>}
              />
            )}
          </section>
        </>
      )}
      <DeploymentComposer
        open={composerOpen}
        onOpenChange={setComposerOpen}
        services={overview?.availableServices ?? []}
        onCreated={(id) => {
          window.location.href = `/deployments/${encodeURIComponent(id)}`;
        }}
      />
    </PageShell>
  );
}
