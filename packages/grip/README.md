# Grip: Interactive Browser Push Checks with Team Gateway

[Grip](https://github.com/guilyx/grip) quizzes the **human developer** on their committed changes before allowing a local `git push` to complete. UniVerse uses a hosted whiteboard backed by an authenticated, quota-limited **team Gemini gateway** in NestJS (`/dev-tools/grip`). `.grip.toml` contains exclusions; shared core constants own lifecycle, score and budgets.

> [!WARNING]
> Production hosted activation remains disabled until all [activation gates](#activation-gate), including the [dependency audit gate](#dependency-audit-gate-2026-11-06), are satisfied. Package isolation is not evidence of live OAuth, a hosted defense, trusted IP attribution, scheduler operation or restore readiness.

Grip pre-push checks are **mandatory** for all contributors pushing to this repository. Pushes are blocked until you enroll via `pnpm grip:setup` and defend your changes on the whiteboard (scoring $\ge 70$).

---

## Architecture & Privacy

- **Hosted interactive whiteboard**: the Node hook prints an HTTPS link and waits while you sign in through GitHub and defend the exact pushed objects ($\ge 70$ required to pass). No local whiteboard server is started. See the [hosted activation and retention runbook](#activation-gate).
- **Resilience & Fail-Open**: Technical provider/network failures temporarily permit an explicitly UNVERIFIED push. Authentication, quota, failed answers, cancellation, expiry and binding mismatches fail closed; no passed result is manufactured.
- **Team Gateway**: A restricted endpoint in `@universe/backend` proxies structured questions and answers to Google Gemini (`gemini-3.5-flash-lite`).
- **No shared API keys**: Collaborators never receive or handle Gemini API keys. Authentication is handled through a one-time GitHub OAuth Device Flow exchange.
- **Repository permission check**: Only GitHub users with **write** or **admin** permissions to `Karazin-UniVerse/uni-verse` qualify for gateway tokens.
- **Token storage**: One gateway profile (`gateway.json`) is stored privately for your OS user in `%APPDATA%\universe-grip` on Windows or `${XDG_CONFIG_HOME:-~/.config}/universe-grip` on POSIX. Its token is shared across local UniVerse clones, branches, and linked worktrees, not across OS users or machines. The profile records the gateway, OAuth client, and repository identity; only the `Karazin-UniVerse/uni-verse` GitHub origin and push destination are accepted. The gateway stores only SHA-256 token digests.
- **Gateway privacy**: Hosted checks temporarily persist encrypted diff/board content and safe grade feedback. Working-DB content has a 23h30m purge target and a 24-hour ceiling; encrypted backups may remain longer under the operator-verified policy. Restore cleanup precedes application access. Browser drafts stay in the current tab. Historical `.git/grip/` reports belong to the human developer; do not publish or have an agent read them. Google receives the permitted diff and answers under the project's Gemini API terms. Unpaid service may use submitted content for product improvement and human review; do not submit confidential, sensitive or personal information. Google states that paid-service data terms apply in the EEA, Switzerland and UK even for unpaid quota.
- **Quotas**:
  - Per user: 10 requests / minute, 100 requests / UTC day.
  - Global: 500 requests / UTC day, max 2 concurrent calls.
  - Session exchange: 5 / minute per source IP, 100 / minute globally.

---

## Prerequisites

1. **Node.js >=24.20.0** and the repository's pinned pnpm version.
2. An interactive browser and GitHub repository write access.
3. An operator-activated hosted gateway and frontend. Python and native Grip are not required.

> [!WARNING]
> **Do NOT run `grip init`, `grip agents`, or `grip install --append`!**
> UniVerse uses Husky 9.1.7 (`.husky/pre-push`) to invoke Grip through `packages/grip/cli/cli.mjs`. Running native Grip installer commands modifies `core.hooksPath` or overwrites Husky hooks.

---

## Quick Setup (Local Enrollment)

Enroll once per OS user on this computer for the UniVerse gateway. Run from the root of any UniVerse checkout or worktree with its GitHub `origin` configured:

```sh
pnpm grip:setup
```

The gateway defaults to `https://api.universemvp.tech`, the client ID to `Ov23liayY7Qv5aVPEomK`, and the hosted frontend to `https://universe-frontend-1038900190823.europe-west3.run.app`. Use flags (`--gateway <url>`, `--client-id <id>`, `--frontend-origin <origin>`) for custom or local environments. The hook checks the returned board origin against this configured value before opening it. Your OAuth Client ID is not a Client Secret, GitHub PAT, or Gemini API key.

Switching branches, creating worktrees, and cloning UniVerse elsewhere on the same computer no longer require another login once those checkouts contain this version of the scripts. One active gateway/account profile is supported per OS user; running setup again replaces it. Re-enroll after token expiry, revocation, or switching gateway/account. Changing the remote to a different repository does not grant it access to the shared profile.

### Migrate an existing checkout enrollment

If you already completed GitHub authorization with the previous checkout-scoped setup and your gateway is still active, run this explicitly **from that enrolled checkout** using the original gateway and client ID:

```sh
pnpm grip:setup --migrate --gateway <original-origin> --client-id <original-client-id>
```

The flags may be omitted only when the original values match the new defaults. If the original gateway has been retired (such as Northflank), do not migrate: old sessions cannot be transferred to a new gateway. Run standard enrollment instead:

```sh
pnpm grip:setup
```

Migration validates the existing profile, preserves its token and original expiry, omits obsolete executable state, writes the shared profile, and removes only that checkout's old settings file. It does not contact GitHub or silently search other checkouts for credentials. Invalid/expired profiles and a different gateway/client are rejected; an existing shared profile is never overwritten by migration. If no eligible old profile exists, use normal setup instead. Other old branches keep using their old scripts until updated; they cannot discover the new shared profile automatically. Old checkout profiles elsewhere are not migrated or revoked; retire them from those checkouts with their original removal command if needed.

Migration publishes the shared profile without replacing a concurrently created profile; a losing migration keeps its old enrollment. If publication succeeds but old-file cleanup fails, setup reports success with a warning identifying the old file. Remove **only that old JSON file** manually when possible. Do not run `grip:remove` from the old checkout to clean up a migrated profile: it holds the same token and would revoke the active shared session. No repeated login is required for a cleanup-only warning.

For local backend development:

```sh
pnpm grip:setup --gateway http://localhost:3001 --frontend-origin http://localhost:3000 --client-id <your-dev-client-id>
```

### What happens during setup:

1. Validates the repository identity and configured gateway origin.
2. Prompts you with a GitHub one-time code and link (GitHub Device Flow).
3. Authorizes your GitHub account without requesting any repository write permissions.
4. Exchanges the GitHub token with the gateway for a 30-day revocable token.
5. Saves one private user-local configuration for all UniVerse checkouts and worktrees on this computer.

Check your enrollment status at any time:

```sh
pnpm grip:status
```

---

## What Happens on `git push`

When you run `git push origin <branch>`:

1. **Unenrolled checkout**:
   Fails closed with exit code 1, requiring enrollment before pushing:
   ```
   [grip] Error: Grip pre-push check is mandatory for this repository, but you are not enrolled.
   [grip] To enroll, run: pnpm grip:setup
   ```
2. **CI Environment (`CI=true`)**:
   Automatically skips interactive checks.
3. **Enrolled checkout**:
   - Collects the exact pushed commits, not the working tree.
   - Your default browser opens the hosted whiteboard; sign in with the enrolled GitHub account.
   - You answer the conceptual questions regarding your changes.
   - Upon scoring $\ge 70$, Grip passes, and the original `git push` **immediately completes**.
   - A pass for the **same owner, repository, refs/object IDs, policy and diff digest** is remembered for **24 hours from creation**. A changed binding requires a new check.

---

## Disenrollment / Removal

To revoke your gateway session and remove the shared enrollment **for all local UniVerse checkouts and worktrees**:

```sh
pnpm grip:remove
```

If the gateway is unreachable and you want to remove local configuration anyway:

```sh
pnpm grip:remove -- --force
```

---

## Exclusions & Ignored Files

The visible diff is capped at **30,000 UTF-8 bytes** so instructions, questions,
rubrics and answers have room within the gateway's 200,000-byte message and
256 KiB HTTP limits, including Grip's JSON escaping of Ukrainian text. Grip
marks truncated diffs; the quiz covers only the visible portion. Unusually long
file lists, rubrics or answers can still exceed the limits; split large pushes
or shorten answers rather than bypassing the check.

`.grip.toml` configures automatic exclusions so private keys, dependencies, build artifacts, lockfiles, and generated documentation are not included in diffs sent to the gateway:

- Secrets: `.env`, `.env.*`, `*.pem`, `*.key`, `*.crt`
- Lockfiles: `pnpm-lock.yaml`, `package-lock.json`, etc.
- Build & Cache: `node_modules/*`, `.next/*`, `dist/*`, `coverage/*`, `.turbo/*`, `*.tsbuildinfo`
- Generated artifacts: `packages/database/client/*`, `packages/ui/storybook-static/*`, `.claude/skills/*`, `GEMINI.md`
- Local testing outputs: `screenshots/*`, `graphify-out/*`, `.lighthouseci/*`, `.playwright/*`

---

## Troubleshooting

- **Hosted service unavailable**: ask the operator to verify [activation gates](#activation-gate). Technical fail-open is reported as UNVERIFIED, never a passed defense. Authentication, quota, failed answers, cancellation, expiry and binding mismatches do not fail open.
- **`Access denied (403)`**: Only GitHub users with write/admin permissions on `Karazin-UniVerse/uni-verse` are permitted.
- **`Enrollment has expired`**: Gateway sessions expire after 30 days. Run `pnpm grip:setup` to refresh.
- **`SSH / Headless environment`**: Grip whiteboard requires an interactive browser session. Complete the push from an interactive checkout; coding agents must hand it to the human instead of bypassing the check. See the [agent push rules](../../docs/ai/workflow.md#hooks).

---

## Verification & Deployment Runbook

### Automated Verification

Run the complete automated validation suite locally:

```sh
pnpm lint            # Oxlint (0 warnings)
pnpm lint:style      # Stylelint
pnpm typecheck       # Turbo TypeScript typecheck
pnpm test            # Monorepo unit & integration tests
pnpm test:grip       # Grip settings, login, hosted lifecycle, cleanup runner and hook tests
pnpm build           # Turbo production build
```

Dedicated concurrency verification against disposable PostgreSQL:

CLI tests live in `packages/grip/cli/tests/` and Grip backend tests in `packages/grip/backend/`. The default backend suite excludes PostgreSQL integration tests; the dedicated commands below select them explicitly.

```sh
GRIP_TEST_DATABASE_URL="postgresql://user:pass@localhost:5432/disposable_db" pnpm --filter @universe/backend test:grip:postgres
GRIP_TEST_DATABASE_URL="postgresql://user:pass@localhost:5432/disposable_db" pnpm --filter @universe/backend test:grip:hosted:postgres
```

### Historical native-flow evidence (not hosted verification)

The earlier native authentication/pre-push loop was exercised. This is not evidence of hosted browser OAuth, retention, restore or a successful hosted human defense:

- Device Flow authentication against the local NestJS gateway.
- Repository permissions check via GitHub API (`admin` role verified).
- Bounded model completion forwarded to Gemini 3.5 Flash Lite via OpenAI-compatible endpoint.
- Interactive Grip whiteboard check launched on push.

### Production Deployment Prerequisites (Human Operations)

1. **GitHub OAuth Application**: Create an OAuth application under the organization with Device Flow enabled; note the Client ID.
2. **Permission Token**: Provision a fine-grained personal access token or GitHub App installation token with `Administration: Read` on `Karazin-UniVerse/uni-verse`.
3. **Gemini API Key**: Obtain a Google Gemini API key with access to `gemini-3.5-flash-lite`.
4. **Environment Variables**: Configure the backend environment:
   ```env
   GRIP_GATEWAY_ENABLED=true
   GEMINI_API_KEYS="<first-gemini-api-key>,<second-gemini-api-key>"
   GRIP_GITHUB_OAUTH_CLIENT_ID=<oauth-client-id>
   GRIP_GITHUB_PERMISSION_TOKEN=<github-permission-token>
   GRIP_TRUSTED_PROXY_ADDRESSES="127.0.0.1,::1" # adjust for load balancer / ingress
   ```
5. **Database Migration**: Run `pnpm db:migrate` to push `GripSession`, `GripQuotaBucket`, and `GripLease` tables to PostgreSQL.
6. **Rollout Policy**: Enable the production gateway (`GRIP_GATEWAY_ENABLED=true`) only when the activation gates below have been satisfied. Because the pre-push check is mandatory across the repository, all contributors must enroll via `pnpm grip:setup` before pushing new code.

### Gemini key pool configuration

`GEMINI_API_KEYS` is the only supported server-side key setting: supply one or more
comma-separated keys, with no empty or duplicate entries. Ask the Project
coordinator for private values; never put them in Git or collaborator settings.
Gemini rate limits apply per Google Cloud project, not per key. Separate projects
can provide independent allocated quota, but do not isolate a shared Gemini outage.
Use projects within provider terms, not to bypass service restrictions.

For migration, add `GEMINI_API_KEYS` containing the existing and additional key
before deploying the new backend. Leave `GEMINI_API_KEY` in place for the old
binary until rollout completes; the new binary does not read it. Restart/redeploy
to load the list, then remove the old setting. To roll back, restore the old
setting before starting the old binary. Collaborators keep their existing gateway
tokens and do not need provider keys or local configuration changes.

The gateway selects the available key with the fewest active attempts, rotating
ties. Counts and cooldowns are local to each backend process, not coordinated
across replicas. Database-backed team quotas and the global limit of two
concurrent logical completions are unchanged; two simultaneous checks normally
use different keys in one process. A busy key remains eligible for failover.

Network/response-read failures and upstream HTTP `429`, `500`, `502`, `503`, and
`504` allow another eligible attempt after a 250 ms delay. The gateway first tries
eligible keys on `gemini-3.5-flash-lite`, then eligible keys on
`gemini-3.1-flash-lite`, stopping at the first success. Each key/model pair is
attempted at most once per logical completion; the earlier model is never revisited.
With three healthy configured keys, up to six upstream calls are possible. A
single-key pool can try both models after a retryable transport or
`500`/`502`/`503`/`504` failure, provided the shared deadline has not expired.
HTTP `429` instead cools that key across both models: no fallback is attempted,
and later requests fail until the cooldown expires. Selection within
each model still balances load and rotates ties, rather than promising fixed key
order. The local Grip request still names the primary model; callers cannot choose
arbitrary upstream models.

All attempts, backoff and response reads share one 60-second deadline. The order
is best-effort within that deadline: a slow attempt may prevent reaching remaining
keys or the fallback model. Cancellation stops retries. Invalid/oversized responses
and non-retryable HTTP statuses stop the current request; invalid whiteboards are
still handled by Grip itself. Additional provider calls can consume more quota or
cost, including when a previous call failed from the gateway's perspective.

Retryable transport and `500`/`502`/`503`/`504` failures cool down only the affected
key/model pair for 30 seconds, so a primary-model outage does not by itself block
that key on the fallback. HTTP `429` keeps a key-wide cooldown of at least 60
seconds and honors a longer valid `Retry-After` (seconds or HTTP date). HTTP
`401/403` cools the key across both models for 60 seconds without retrying the
current request. Neither concurrent failures nor successes shorten cooldowns.
Both the key-wide and model-specific cooldown must expire for a pair to be eligible.
If no pair is eligible at request entry, the gateway fails promptly with sanitized
`503`; exhausted retries return the last attempt's sanitized error.

`GeminiClientService` logs key slot number, model, attempt, original upstream status when
available, elapsed milliseconds, outcome category, and failover decision. Success
is debug-level; failures are warning-level. Keys, prompts, diffs, answers, raw
provider bodies, and raw exception messages are never included in these logs.
Model fallback does not enable billing or guarantee availability/free quota; both
models must be available to the configured projects. Use only authorized projects
within provider terms, not to circumvent quota restrictions. This traversal change
does not deploy the backend or prove the new order against live provider calls.

---

## Hosted Grip operations

Hosted Grip uses the Grip Next.js frontend, the existing NestJS gateway and PostgreSQL. The frontend image serves Grip and UniHub through one proxy and port; package isolation does not itself verify deployment.
The Node pre-push hook uploads only a bounded diff of the pushed commits and
waits for a server-owned result. There is no Python dependency, localhost
whiteboard listener or browser-to-Gemini connection.

### Activation gate

Keep `GRIP_HOSTED_ENABLED=false` and `GRIP_HOSTED_RETENTION_VERIFIED=false`
until an operator records all the following evidence in the deployment record:

- Exact frontend origin and GitHub OAuth callback registration:
  `/dev-tools/grip/api/auth/callback`. Enable Device Flow for CLI enrollment.
- Actual database backup and PITR retention duration, encryption, access controls,
  recovery permissions and deletion schedule. **No backup retention period has
  been verified by this implementation.** Encrypted backups may retain content
  longer than the working database; disclose the actual period before activation.
- A scheduler running cleanup every 15 minutes with verified Google OIDC identity,
  successful deletion metrics and an alert before content reaches 24 hours old.
- A restore drill which runs cleanup to completion **before** opening application
  access. A restored old operation must not resume or overwrite a terminal result.
- Live GitHub login, ownership denial, revoked-writer denial and one human defense.
  Synthetic fixtures do not establish these operational facts.
- A verified trusted browser-IP propagation design for the frontend-to-backend
  BFF. The current backend sees the BFF egress address, not the original browser
  address: OAuth start and exchange limits share that egress bucket. Do not
  enable hosted mode until trusted, authenticated client attribution is in place.
  Do not forward a browser-supplied `X-Forwarded-For` directly: the backend is
  publicly reachable and an attacker can forge it. The ingress must strip and
  reconstruct client identity, then authenticate that identity end-to-end to the
  backend; the exact deployment-specific trust boundary requires operator review.

No deployment, production schema update, secret write, OAuth registration or cloud
resource creation is performed by the implementation scripts.

### Configuration

Backend (server-only):

| Variable                             | Purpose                                                            |
| ------------------------------------ | ------------------------------------------------------------------ |
| `GRIP_HOSTED_ENABLED`                | Explicit hosted activation; defaults to disabled                   |
| `GRIP_HOSTED_RETENTION_VERIFIED`     | Human confirmation of the evidence above                           |
| `GRIP_HOSTED_FRONTEND_ORIGIN`        | Canonical HTTPS origin, without path or query                      |
| `GRIP_GITHUB_OAUTH_CLIENT_ID`        | Existing GitHub application client ID                              |
| `GRIP_GITHUB_OAUTH_CLIENT_SECRET`    | Browser code-exchange secret                                       |
| `GRIP_CONTENT_KEYRING`               | JSON object mapping versions to canonical base64 32-byte AES keys  |
| `GRIP_CONTENT_ACTIVE_KEY_VERSION`    | Version used for new encrypted writes                              |
| `GRIP_CLEANUP_OIDC_AUDIENCE`         | Exact expected scheduler token audience                            |
| `GRIP_CLEANUP_SERVICE_ACCOUNT_EMAIL` | Exact verified scheduler service-account email                     |
| `GRIP_CLEANUP_ENDPOINT`              | Runner-only HTTPS URL ending in `/dev-tools/grip/internal/cleanup` |

The existing gateway enable flag, GitHub permission token, trusted-proxy allowlist
and Gemini key pool remain required. HTTPS is mandatory except explicit loopback
development origins. Browser auth remains separate from portal Google SSO and
does not create or update student users.

Frontend server-only: set `GRIP_BACKEND_ORIGIN` to the fixed gateway origin.
Set `GRIP_HOSTED_FRONTEND_ORIGIN` on the frontend as well, to the same exact
canonical origin configured on the backend; mutation routes validate it before
reading request bodies.
Do not prefix it with `NEXT_PUBLIC_`. The BFF exposes explicit routes only;
browser cookies or caller-selected upstream URLs are not forwarded.

### Retention and cleanup

Sensitive content is AES-256-GCM encrypted, with fresh IVs and authenticated
check identity/version. It is inaccessible after its stored purge deadline even
if physical deletion is delayed. The physical purge target is **23h30m** after
server creation, giving a 30-minute margin before the working-DB 24-hour ceiling.
During an outage no uptime-independent physical-deletion guarantee is possible:
alert, keep hosted disabled where necessary, restore service and clean immediately.

Check results expire 24 hours after creation. Create-intent tombstones survive
until the accepted client timestamp plus 24 hours, including up to five minutes
of clock skew. Content/check deletion must not remove a still-live tombstone.
Cleanup does not need encryption keys, so unknown old key versions cannot block
physical deletion. Keep previous keys available until all live encrypted content,
browser transactions/sessions and approved backup recovery requirements expire.
Never discard a key needed for an authorized restore without a recovery plan.

`POST /dev-tools/grip/internal/cleanup` is available independently of hosted UI
activation and requires Google signature verification, exact audience and exact
verified service-account email. Each request deletes bounded batches (100 per
table) and returns `complete: false` while eligible rows remain. Incomplete work
is not a successful cleanup run.

The operator runner uses workload identity through the backend's installed
`google-auth-library`, not a static bearer secret:

```powershell
$env:GRIP_CLEANUP_ENDPOINT='https://your-backend.example/dev-tools/grip/internal/cleanup'
$env:GRIP_CLEANUP_OIDC_AUDIENCE='https://your-configured-audience.example'
node packages/grip/cli/cleanup-hosted.mjs
```

It awaits repeated batches within 120 seconds and exits nonzero for malformed,
failed or incomplete cleanup. Configure scheduler retries and alerts. Run the same
command against the isolated restored deployment until complete before granting
application traffic or database access to application instances. Inspect the
oldest remaining content timestamp without logging ciphertext, diff or answers.

### Rollout and rollback

1. Deploy the additive schema and a backend containing hosted cleanup while hosted
   remains disabled. Never point test commands at a production database.
2. Verify configuration, scheduler and restore evidence; deploy the fixed frontend
   BFF. Do not use the old schema to roll back: it would drop hosted tables.
3. Enable hosted only after the gate passes. Communicate that updated hooks use
   hosted endpoints and will report technical outages as **UNVERIFIED**, not passed.
4. To roll back, disable hosted traffic, retain schema/keyring/cleanup support and
   keep cleanup running. Do not use `--accept-data-loss` or remove hosted tables.

### Verification

Use Node >=24.20.0. Existing CLI enrollment remains valid without a native Grip
executable. Browser login must use the same GitHub account as CLI enrollment.
Five answers are graded server-side, 0–20 each; 70/100 passes. Defense lasts 30
minutes and a matching pass is reusable for 24 hours **from server creation**.
Binding includes owner, repository, exact refs/object IDs, policy and diff digest.

```sh
pnpm test:grip
pnpm --filter @universe/backend test --runInBand grip/hosted/tests
```

The existing production-page browser fixture uses intercepted synthetic API responses,
not an auth bypass in product code and not a live GitHub/Gemini defense. Its frontend
startup command must be updated and verified for the isolated Grip package before use.

Desktop/mobile fixture screenshots are written locally to
`screenshots/grip-hosted/`; attach reviewed evidence to the PR rather than claiming
the fixture proves live OAuth or deployed retention. The browser origin can be
set explicitly with test-only `GRIP_BROWSER_TEST_ORIGIN`.

### Dependency audit gate (2026-11-06)

No dependency was added for hosted Grip. `pnpm audit --prod --audit-level high`
reported one existing reachable high finding:
[GHSA-27r3-jxmh-p828](https://github.com/advisories/GHSA-27r3-jxmh-p828),
`body-parser@2.3.0` through Express/Nest. Current JSON/urlencoded parsers permit
compressed bodies; the advisory describes an unauthenticated process crash.
The fixed 2.x version is 2.4.0. **Do not enable hosted production traffic until
an approved dependency update or independently tested mitigation resolves this.**
Review due: before activation, no later than 2026-11-13.

The full audit also reports development-tool findings (`tmp`, `extract-zip`,
`brace-expansion`, `basic-ftp`, Vite/launch-editor, Zod and LHCI's body-parser).
They are absent from the production-only audit, but can affect developer/build
tools. Review their actual execution paths and supported fixes separately; do not
force cross-major overrides or claim an audit pass. Keep dev servers loopback-only
and do not feed untrusted archives/proxy settings/editor paths into these tools.
This is a documented unresolved audit result, not a waiver. Review due: 2026-11-13.

Disposable PostgreSQL only (apply the additive schema to that disposable database
first, with `DATABASE_URL` explicitly set):

```powershell
$env:GRIP_TEST_DATABASE_URL='postgresql://user:password@127.0.0.1:5432/disposable_database'
pnpm --filter @universe/backend test:grip:hosted:postgres
```

The dedicated suite fails if its database URL is missing; it is not silently
skipped. Full lint/style/typecheck/test/build and changed-file formatting remain
required. Live OAuth, provider availability and backup verification require a
separate human-operated environment.
