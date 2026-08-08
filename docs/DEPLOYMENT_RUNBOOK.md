# Deployment runbook

Operational procedure for provisioning and running the AURIXA deployment
control plane. Architecture and configuration reference:
[Deployment infrastructure](../infra/DEPLOYMENT.md).

> [!CAUTION]
> No AWS apply is automatic. Treat every Terraform apply, production approval,
> and rollback as a deliberate operator action. Never place private keys,
> database URLs, or application secrets in Git, Terraform variables, Helm
> values, workflow inputs, or diagnostic bundles.

## First-time provisioning

### 1. Prepare AWS and remote state

1. Select separate AWS accounts or appropriately isolated boundaries for
   staging and production. Establish operator access and GitHub OIDC trust.
2. From `infra/terraform/bootstrap`, run `terraform init`, then plan and
   explicitly apply with a globally unique state bucket:

   ```bash
   terraform plan -var='state_bucket_name=<unique-bucket>'
   terraform apply -var='state_bucket_name=<unique-bucket>'
   ```

3. Copy `infra/terraform/backend.hcl.example` outside the repository, fill in
   the S3 bucket, DynamoDB lock table, key, and region, then initialize the main
   stack:

   ```bash
   cd infra/terraform
   terraform init -backend-config=/secure/path/backend.hcl
   ```

4. Replace the example CIDRs and sizing in
   `environments/{staging,prod}.tfvars`. Plan, review, and explicitly apply each
   environment:

   ```bash
   terraform plan -var-file=environments/staging.tfvars -out=staging.tfplan
   terraform apply staging.tfplan
   ```

5. Record the EKS cluster name, ECR repository URLs, and External Secrets role
   ARN from Terraform outputs. Sensitive database and Redis endpoints must go
   into the approved secret-management path.

### 2. Prepare Kubernetes

1. Configure cluster access and install the ingress controller, metrics
   support, External Secrets Operator, and a `ClusterSecretStore`.
2. Create the referenced AWS Secrets Manager application secret. At minimum it
   must provide the runtime database and Redis URLs plus any required provider
   credentials.
3. Replace all `aurixa.example` hosts, ingress CIDRs, secret keys, and frontend
   gateway URLs in the environment-specific Helm values. Configure DNS and TLS.
4. Confirm ECR contains immutable, scan-on-push repositories for all 13
   applications and `db-migrations`.

### 3. Configure GitHub

1. Create AWS IAM roles trusted only for the repository's GitHub OIDC subjects:
   an image-publish role for ECR and environment-specific deploy roles for
   EKS/Helm.
2. Add the repository/environment variables listed in
   [Required configuration](../infra/DEPLOYMENT.md#required-configuration).
3. Create `staging` and `production` GitHub Environments. Add required
   reviewers and branch restrictions to production.
4. Create and install a GitHub App with repository metadata read and Actions
   read/write. Store its app ID, installation ID, and private key in the
   controller's secret store.
5. Create a GitHub OAuth App. Set its callback URL to
   `<dashboard-origin>/api/auth/callback/github`; configure allowed
   organizations and optional `org/team-slug` entries.
6. Set exact `owner/repository` entries in `GITHUB_OIDC_REPOSITORIES`. Keep
   promotion targets non-production (normally only `staging`).
7. Generate independent high-entropy values for `AUTH_SECRET` and
   `DEPLOYMENT_JWT_SECRET`. Keep `DEPLOYMENT_WRITES_ENABLED=false` until
   connectivity, OAuth, callback policy, and environment records are verified.

### 4. Bring up the control plane

1. Publish a release from `main` or manually run **Image Build & Publish**.
2. Deploy the chart once with the resulting manifest/digests. A first install
   must deploy all services; a scoped deploy requires an existing Helm release.
3. Create controller environment records for staging and production with exact
   repository and GitHub Environment names. Mark production as requiring
   approval if controller-side approval is desired.
4. Verify dashboard sign-in, `/deployments`, environment health, GitHub App
   dispatch, OIDC callbacks, and database audit records.
5. Enable `DEPLOYMENT_WRITES_ENABLED=true`, then push a harmless commit to
   `main` and observe automatic staging promotion end to end.

## Routine deployment

### Staging

1. Merge to `main`.
2. Confirm all images and `db-migrations` were scanned and published with the
   same immutable SHA, and the digest manifest completed.
3. Confirm the automatic OIDC promotion created a staging job.
4. Watch `/deployments/<job-id>` and the linked Actions run through preflight,
   migration, rollout, Helm test, and smoke check.
5. Verify environment health, deployed digest references, drift, and key
   application paths.

### Production

1. Select the exact manifest run or full 40-character SHA that passed staging.
   Never rebuild a production-only artifact.
2. In `/deployments`, choose production and the intended services/strategy,
   type `DEPLOY PRODUCTION`, and submit.
3. Complete controller approval if configured, then have an authorized reviewer
   approve the `production` GitHub Environment.
4. Monitor migration, rollout, health, Helm test, and smoke checks. Record the
   controller job ID and Helm revision in the change record.

## Failure and incident response

1. **Stop new changes.** Do not approve another production job. Cancel an
   active job from the dashboard when cancellation is safer than completion.
2. **Assess impact.** Check `/deployments`, the Actions run, public health,
   application telemetry, and Kubernetes events. Determine whether the issue is
   configuration, migration, capacity, networking, or application behavior.
3. **Preserve evidence.** Download the 14-day deployment diagnostics artifact:
   resources/events, pod descriptions, recent logs, and Helm history. Capture
   the controller job ID, commit, image digests, environment, and timestamps.
4. **Use automatic recovery first.** A failed rollout or smoke check attempts
   rollback to the prior deployed Helm revision after collecting diagnostics.
   Verify that rollback rather than assuming it succeeded.
5. **Escalate.** If data integrity, credentials, patient safety, or unauthorized
   access may be involved, disable writes or public traffic as appropriate,
   rotate affected credentials, and engage the designated incident owners.

## Manual rollback

There are two deliberate rollback paths:

- **Dashboard rollback** creates an audited rollback release for the selected
  successful deployment and dispatches the normal deployment workflow at that
  release's Git SHA. Environment approvals and all normal migration, rollout,
  Helm test, and smoke gates still apply.
- **Production Rollback workflow** restores a selected existing Helm revision,
  waits for rollouts, runs `helm test`, and calls the smoke URL. Use it when the
  incident commander specifically chooses revision restoration.

Neither path erases a database migration; schema changes must therefore be
backward compatible or have a separately reviewed recovery procedure.

Preferred procedure:

1. Identify the last known-good controller release and Helm revision.
2. Request rollback from that successful dashboard job and complete production
   approvals. If revision restoration is required instead, dispatch
   **Production Rollback** with the revision, controller job ID, and incident
   reason.
3. Confirm the workflow assumed the production role, deployed the intended
   release or revision, and passed rollout, Helm test, and smoke verification.
4. Verify service image digests and user-visible behavior. Download rollback
   diagnostics if the workflow fails.

Emergency CLI use, only under the organization's break-glass policy:

```bash
helm history <release> --namespace <namespace>
helm rollback <release> <revision> \
  --namespace <namespace> --wait --timeout 15m
helm test <release> --namespace <namespace> --timeout 5m
```

Record and reconcile any break-glass action in the controller/audit system.

## Disaster recovery

1. Declare the recovery point and freeze deployments.
2. Restore Terraform state from S3 version history if state—not infrastructure—
   is damaged; use DynamoDB locking and do not run concurrent applies.
3. Recreate infrastructure from reviewed Terraform plans in the recovery
   account/region. Restore RDS from the approved snapshot/PITR point and
   repopulate Redis rather than treating it as the source of truth.
4. Restore Secrets Manager entries, External Secrets, DNS/TLS, ingress, and
   GitHub OIDC trust. Rotate credentials if compromise is possible.
5. Republish or replicate the exact known-good ECR digests, including
   `db-migrations`; do not substitute mutable tags.
6. Deploy the known-good release with Helm, verify migration compatibility,
   rollouts, in-cluster tests, smoke checks, audit callbacks, and critical
   patient/staff/operator journeys.
7. Shift traffic gradually, monitor, close the deployment freeze, and document
   actual RPO/RTO against organizational targets.

## Local demonstration

Local auth is deliberately unavailable in production:

```dotenv
NODE_ENV=development
AUTH_SECRET=<high-entropy-session-secret>
DEPLOYMENT_JWT_SECRET=<different-secret-at-least-32-characters>
DEPLOYMENT_DEV_AUTH_ENABLED=true
DEPLOYMENT_WRITES_ENABLED=false
```

Run `pnpm run deploy up`, choose **Local development** at the dashboard sign-in,
and open `http://localhost:3100/deployments`. Enable writes only when intentionally
demonstrating mutations and when the local controller database is disposable.
