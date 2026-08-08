const BASE_PATH = "/api/deployments";

export type DeploymentEnvironmentName = "staging" | "production";
export type DeploymentHealth = "healthy" | "degraded" | "unavailable" | "unknown";
export type DeploymentState =
  | "pending"
  | "awaiting_approval"
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "rolling_back"
  | "rolled_back";
export type DeploymentStrategy = "rolling" | "canary";

export interface ServiceRevision {
  service: string;
  revision: string;
  desiredRevision?: string;
  status: DeploymentHealth;
}

export interface DeploymentEnvironment {
  name: DeploymentEnvironmentName;
  health: DeploymentHealth;
  drift: boolean;
  checkedAt: string;
  activeDeployment?: DeploymentSummary;
  services: ServiceRevision[];
}

export interface DeploymentSummary {
  id: string;
  release: string;
  environment: DeploymentEnvironmentName;
  services: string[];
  strategy: DeploymentStrategy;
  state: DeploymentState;
  progress: number;
  createdAt: string;
  createdBy: string;
  approval?: {
    required: boolean;
    state: "not_required" | "pending" | "approved" | "rejected";
    approvedBy?: string;
    approvedAt?: string;
  };
  githubUrl?: string;
}

export interface DeploymentOverview {
  environments: DeploymentEnvironment[];
  recentDeployments: DeploymentSummary[];
  availableServices: string[];
}

export interface DeploymentStep {
  id: string;
  name: string;
  state: DeploymentState | "skipped";
  startedAt?: string;
  finishedAt?: string;
  logExcerpt?: string;
}

export interface DeploymentCheck {
  id: string;
  name: string;
  status: "pending" | "pass" | "warning" | "fail";
  detail?: string;
  url?: string;
}

export interface DeploymentEvent {
  id: string;
  title: string;
  detail?: string;
  occurredAt: string;
  actor?: string;
}

export interface DeploymentJob extends DeploymentSummary {
  updatedAt: string;
  commitSha?: string;
  workflowUrl?: string;
  steps: DeploymentStep[];
  checks: DeploymentCheck[];
  timeline: DeploymentEvent[];
  canCancel: boolean;
  canRollback: boolean;
  diagnostic?: Record<string, unknown>;
}

export interface CreateDeploymentInput {
  environment: DeploymentEnvironmentName;
  version: string;
  gitSha: string;
  ref: string;
  services: string[];
  strategy: DeploymentStrategy;
  productionConfirmation?: string;
}

export class DeploymentApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "DeploymentApiError";
  }
}

async function request<T>(path = "", init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE_PATH}${path}`, {
    ...init,
    cache: "no-store",
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    let detail = "The deployment service could not complete the request.";
    try {
      const body = (await response.json()) as { detail?: string; message?: string; error?: string };
      detail = body.detail ?? body.message ?? body.error ?? detail;
    } catch {
      // Keep a non-sensitive generic message when the response is not JSON.
    }
    throw new DeploymentApiError(detail, response.status);
  }
  return response.json() as Promise<T>;
}

export function getDeploymentOverview() {
  return request<DeploymentOverview>();
}

export function getDeployment(id: string) {
  return request<DeploymentJob>(`/${encodeURIComponent(id)}`);
}

export function createDeployment(input: CreateDeploymentInput) {
  return request<DeploymentJob>("", {
    method: "POST",
    body: JSON.stringify(input),
    headers: { "Idempotency-Key": crypto.randomUUID() },
  });
}

export function cancelDeployment(id: string) {
  return request<DeploymentJob>(`/${encodeURIComponent(id)}/cancel`, {
    method: "POST",
    headers: { "Idempotency-Key": crypto.randomUUID() },
  });
}

export function rollbackDeployment(id: string) {
  return request<DeploymentJob>(`/${encodeURIComponent(id)}/rollback`, {
    method: "POST",
    headers: { "Idempotency-Key": crypto.randomUUID() },
  });
}
