# Cloud Run deployment

GitHub Actions deploys `develop` to the existing backend and frontend Cloud Run
services after the `quality` job in `.github/workflows/ci.yml` succeeds. PRs,
`main`, and tags do not deploy. The reusable `.github/workflows/deploy.yml` builds
its own images from the checked-out CI commit; Lighthouse's mock-API build is
never deployed. The previous Northflank deployment triggers are removed.

Deployment is disabled until the repository variable `GCP_DEPLOY_ENABLED` is
`true`. This lets the workflow merge before cloud authentication is configured.

## Prerequisites

- The two Cloud Run services and Docker Artifact Registry repository already
  exist in the same project and region.
- Both services already allow public invocation. CI does not modify public IAM
  policies, create services, or change CPU, RAM, scaling, or runtime identities.
- Backend runtime configuration is already installed in Cloud Run, including
  `DATABASE_URL`, `AT_SECRET`, `RT_SECRET`, and the Moodle configuration. Ask the
  Project coordinator for private values. Do not put them in GitHub variables,
  image build arguments, or this document.
- An administrator can enable APIs, create service accounts and Workload
  Identity resources, and grant the resource-scoped IAM bindings below. Editor
  and Cloud Run Admin alone are not sufficient for all bootstrap operations.

### Existing data and startup behavior

The backend Dockerfile runs `pnpm db:push` on every container start. CI does not
change this behavior, pass database credentials to the build, or set
`PRISMA_ACCEPT_DATA_LOSS`. Ensure that variable is absent or `false` in the
existing service. Take a database backup and review Prisma schema changes before
merging them. Deployments are **not** database backups or a migration system.

Backend and frontend updates are sequential, not an atomic pair. A failure after
the backend update can leave the old frontend talking to the new backend, so
changes must remain compatible across revisions. Keep persistent uploads in
external storage; a container filesystem is ephemeral.

## 1. Configure GitHub's develop environment

In repository **Settings → Environments**, create `develop`. Restrict deployment
branches to the selected branch `develop`. Configure these **environment
variables**, not secrets:

| Variable                         | Value for the current deployment                               |
| -------------------------------- | -------------------------------------------------------------- |
| `GCP_PROJECT_ID`                 | `project-db5e2681-9284-41b6-8a9`                               |
| `GCP_REGION`                     | `europe-west3`                                                 |
| `GCP_ARTIFACT_REPOSITORY`        | `universe`                                                     |
| `GCP_BACKEND_SERVICE`            | `universe-backend`                                             |
| `GCP_FRONTEND_SERVICE`           | `universe-frontend`                                            |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | Provider resource name printed in step 2                       |
| `GCP_DEPLOY_SERVICE_ACCOUNT`     | Deploy service account email printed in step 2                 |
| `NEXT_PUBLIC_API_URL`            | `https://universe-backend-1038900190823.europe-west3.run.app`  |
| `FRONTEND_URL`                   | `https://universe-frontend-1038900190823.europe-west3.run.app` |
| `GOOGLE_CLIENT_ID`               | Optional web OAuth client ID; ask the Project coordinator      |

Use origins without trailing slashes for both URLs. `NEXT_PUBLIC_API_URL` must
not end in `/api`: that is the backend Swagger route, not an API prefix.

`GCP_DEPLOY_ENABLED` is a **repository** variable under **Settings → Secrets and
variables → Actions → Variables**, not an environment variable. Leave it unset
until bootstrap is complete. The caller evaluates it before entering the
`develop` environment.

The frontend build explicitly enables Opportunities and Feature Panel and
disables Moodle and EDean. Feature Panel lets users override frontend feature
visibility; these flags are not backend authorization controls.

## 2. Bootstrap keyless Google Cloud authentication

Run the following Bash commands in Cloud Shell as an administrator. They create
IAM resources but do not deploy code. Check for existing resources before
rerunning creation commands; do not delete existing pools to clear an error.

Set the deployment resource names:

```bash
PROJECT_ID="project-db5e2681-9284-41b6-8a9"
REGION="europe-west3"
REPOSITORY="universe"
BACKEND_SERVICE="universe-backend"
FRONTEND_SERVICE="universe-frontend"
GITHUB_REPOSITORY="Karazin-UniVerse/uni-verse"
POOL_ID="universe-github"
PROVIDER_ID="develop"
DEPLOY_ACCOUNT_ID="universe-github-deploy"
DEPLOY_ACCOUNT="${DEPLOY_ACCOUNT_ID}@${PROJECT_ID}.iam.gserviceaccount.com"
```

Enable the APIs and read the numeric project/repository/owner identifiers:

```bash
gcloud services enable run.googleapis.com artifactregistry.googleapis.com \
  iam.googleapis.com iamcredentials.googleapis.com sts.googleapis.com \
  --project="$PROJECT_ID"

PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
REPO_METADATA="$(curl --fail --silent --show-error \
  "https://api.github.com/repos/${GITHUB_REPOSITORY}")"
REPO_ID="$(printf '%s' "$REPO_METADATA" | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')"
OWNER_ID="$(printf '%s' "$REPO_METADATA" | python3 -c 'import json,sys; print(json.load(sys.stdin)["owner"]["id"])')"
test -n "$PROJECT_NUMBER" && test -n "$REPO_ID" && test -n "$OWNER_ID"
```

The GitHub metadata request above assumes the repository is public. For a private
repository, obtain its numeric repository and owner IDs using an authenticated
GitHub client instead; never paste an access token into this document.

Create the deploy account and OIDC pool/provider. Numeric IDs protect against
repository/organization name reuse. The provider also restricts tokens to a push
on `develop`, the `develop` environment, and this reusable workflow:

```bash
gcloud iam service-accounts create "$DEPLOY_ACCOUNT_ID" \
  --project="$PROJECT_ID" --display-name="UniVerse GitHub deploy"

gcloud iam workload-identity-pools create "$POOL_ID" \
  --project="$PROJECT_ID" --location=global \
  --display-name="UniVerse GitHub Actions"

gcloud iam workload-identity-pools providers create-oidc "$PROVIDER_ID" \
  --project="$PROJECT_ID" --location=global --workload-identity-pool="$POOL_ID" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository_id=assertion.repository_id" \
  --attribute-condition="assertion.repository_id == '${REPO_ID}' && assertion.repository_owner_id == '${OWNER_ID}' && assertion.ref == 'refs/heads/develop' && assertion.event_name == 'push' && assertion.sub == 'repo:${GITHUB_REPOSITORY}:environment:develop' && assertion.job_workflow_ref == '${GITHUB_REPOSITORY}/.github/workflows/deploy.yml@refs/heads/develop'"

POOL_NAME="$(gcloud iam workload-identity-pools describe "$POOL_ID" \
  --project="$PROJECT_ID" --location=global --format='value(name)')"

gcloud iam service-accounts add-iam-policy-binding "$DEPLOY_ACCOUNT" \
  --project="$PROJECT_ID" --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/${POOL_NAME}/attribute.repository_id/${REPO_ID}"
```

Grant write/read access only to the image repository, and Cloud Run Developer
only to the two existing services. The deployer does not need Cloud Run Admin or
permission to change their public IAM policies:

```bash
gcloud artifacts repositories add-iam-policy-binding "$REPOSITORY" \
  --project="$PROJECT_ID" --location="$REGION" \
  --member="serviceAccount:${DEPLOY_ACCOUNT}" --role=roles/artifactregistry.writer

for SERVICE in "$BACKEND_SERVICE" "$FRONTEND_SERVICE"; do
  gcloud run services add-iam-policy-binding "$SERVICE" \
    --project="$PROJECT_ID" --region="$REGION" \
    --member="serviceAccount:${DEPLOY_ACCOUNT}" --role=roles/run.developer

  RUNTIME_ACCOUNT="$(gcloud run services describe "$SERVICE" \
    --project="$PROJECT_ID" --region="$REGION" \
    --format='value(spec.template.spec.serviceAccountName)')"
  test -n "$RUNTIME_ACCOUNT" || break

  gcloud iam service-accounts add-iam-policy-binding "$RUNTIME_ACCOUNT" \
    --project="$PROJECT_ID" --member="serviceAccount:${DEPLOY_ACCOUNT}" \
    --role=roles/iam.serviceAccountUser
done
```

Inspect each runtime service account before granting `Service Account User`.
Permission to deploy with an identity allows the deployer to run code with that
identity's permissions. If a legacy runtime account has Editor/Owner, reduce its
privileges or migrate to a dedicated minimal runtime account as a separate
reviewed change. Resource-scoped deploy roles do not neutralize a privileged
runtime identity. If a runtime account is empty or a command fails, stop and
resolve that error before enabling deployment.

Print the two values needed by GitHub:

```bash
gcloud iam workload-identity-pools providers describe "$PROVIDER_ID" \
  --project="$PROJECT_ID" --location=global --workload-identity-pool="$POOL_ID" \
  --format='value(name)'
printf '%s\n' "$DEPLOY_ACCOUNT"
```

Wait several minutes for IAM propagation. No service account JSON key,
`GCP_SA_KEY`, or database secret is required in GitHub.

## 3. Enable and verify

1. Complete cloud bootstrap and configure the GitHub `develop` environment and
   its variables. Keep `GCP_DEPLOY_ENABLED` unset or `false` during setup.
2. Set the repository variable `GCP_DEPLOY_ENABLED=true` when ready to deploy,
   then merge the reviewed CI/CD PR into `develop`. The merge starts CI; changing
   the variable alone does not start a run. If the PR has already merged, enable
   deployment and rerun **all jobs** of the latest `develop` push CI run that
   contains the new workflow, or push a reviewed follow-up commit to `develop`.
3. Watch **Actions → CI**: `deploy` runs only after `quality` passes. A PR run
   always skips deployment, even for a branch in this repository.
4. Confirm both services and image digests in the deployment job summary.
5. Test login and a real database-backed flow separately. The workflow's HTTP
   probes check only frontend/Swagger availability, not database correctness,
   Google login, or CORS behavior.

Images use the checked-out commit SHA as their tag; Cloud Run receives immutable
image digests. Deployment concurrency prevents overlapping deployments. Immediately
before updating services, CI skips a commit if `develop` has advanced. The
`queue: max` setting retains up to 100 pending deployments, so an older CI run
finishing late cannot replace the pending deployment of the current commit.
Queue order follows arrival at the concurrency group, not commit order; the
stale-commit check is still required. Runs beyond the 100-pending limit are
canceled by GitHub.

Existing Cloud Run env and secret references are preserved with
`--update-env-vars`. CI changes only backend `FRONTEND_URL`, optional backend
`GOOGLE_CLIENT_ID`, and frontend `NEXT_PUBLIC_API_URL`. It preserves existing
Google client configuration if the GitHub Client ID is empty. An empty ID still
builds a frontend without the Google button; set the variable before deploying
if Google login is required.

## Google sign-in

Set the same public web OAuth Client ID in GitHub's `develop` environment
variable `GOOGLE_CLIENT_ID`. CI passes it to backend `GOOGLE_CLIENT_ID` and to
frontend build argument `NEXT_PUBLIC_GOOGLE_CLIENT_ID`. No client secret is
used by the current ID-token verification flow. Add the frontend origin to the
OAuth client's **Authorized JavaScript origins** in Google Auth Platform.
The JavaScript callback flow does not require a new redirect URI.

Changing a `NEXT_PUBLIC_*` value requires a new frontend image. Editing only the
Cloud Run runtime env cannot update the browser bundle. Changing a GitHub
variable also does not automatically start CI: rerun the latest `develop` push
workflow or merge a reviewed follow-up. Corporate domain restrictions still
apply; Google login does not allow personal Gmail accounts.

## Troubleshooting and rollback

- **Deploy skipped:** check the repository-level enable switch, the push branch,
  and the `quality` result. Deployment intentionally does not run for PRs.
- **OIDC rejected:** verify numeric IDs, the provider resource name, exact
  `develop` environment name, environment deployment-branch policy, and the
  provider's workflow/ref conditions. Wait for IAM propagation; do not replace
  OIDC with a JSON key to bypass the issue.
- **`iam.serviceAccounts.actAs` denied:** check the binding on the actual runtime
  service account of each service, not just the deploy account.
- **`403` on the availability probe:** an administrator must configure public
  invocation separately. CI deliberately lacks `run.services.setIamPolicy`.
- **New revision fails at startup:** read Cloud Run logs, including Prisma
  output. Do not enable `PRISMA_ACCEPT_DATA_LOSS` to force a deployment through.
- **Old revision still serves traffic:** CI explicitly routes traffic to the
  new latest revision after each successful update. A later manual rollback is
  overwritten by the next enabled deployment.

To pause deployment, set `GCP_DEPLOY_ENABLED=false`. This does not cancel a job
that has already started; wait for it to finish or cancel it before rollback.
Find previous revisions, then route each affected service to a known-good one:

```bash
gcloud run revisions list --service=universe-backend \
  --project="$PROJECT_ID" --region="$REGION"
gcloud run revisions list --service=universe-frontend \
  --project="$PROJECT_ID" --region="$REGION"

read -rp "Known-good backend revision: " BACKEND_REVISION
gcloud run services update-traffic universe-backend \
  --project="$PROJECT_ID" --region="$REGION" \
  --to-revisions="${BACKEND_REVISION:?Revision required}=100"

read -rp "Known-good frontend revision: " FRONTEND_REVISION
gcloud run services update-traffic universe-frontend \
  --project="$PROJECT_ID" --region="$REGION" \
  --to-revisions="${FRONTEND_REVISION:?Revision required}=100"
```

Traffic rollback does not undo database schema changes. Old backend revisions
can also run `db push` on restart, so inspect schema compatibility first. Do not
delete active or rollback images when adding an Artifact Registry cleanup policy.
Configure billing alerts separately: a budget alert is not a spending cap.
