# Hosted Grip operations

Hosted Grip uses the existing Next.js frontend, NestJS gateway and PostgreSQL.
The Node pre-push hook uploads only a bounded diff of the pushed commits and
waits for a server-owned result. There is no Python dependency, localhost
whiteboard listener or browser-to-Gemini connection.

## Activation gate

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

## Configuration

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

## Retention and cleanup

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
node scripts/grip/cleanup-hosted.mjs
```

It awaits repeated batches within 120 seconds and exits nonzero for malformed,
failed or incomplete cleanup. Configure scheduler retries and alerts. Run the same
command against the isolated restored deployment until complete before granting
application traffic or database access to application instances. Inspect the
oldest remaining content timestamp without logging ciphertext, diff or answers.

## Rollout and rollback

1. Deploy the additive schema and a backend containing hosted cleanup while hosted
   remains disabled. Never point test commands at a production database.
2. Verify configuration, scheduler and restore evidence; deploy the fixed frontend
   BFF. Do not use the old schema to roll back: it would drop hosted tables.
3. Enable hosted only after the gate passes. Communicate that updated hooks use
   hosted endpoints and will report technical outages as **UNVERIFIED**, not passed.
4. To roll back, disable hosted traffic, retain schema/keyring/cleanup support and
   keep cleanup running. Do not use `--accept-data-loss` or remove hosted tables.

## Verification

Use Node >=24.20.0. Existing CLI enrollment remains valid without a native Grip
executable. Browser login must use the same GitHub account as CLI enrollment.
Five answers are graded server-side, 0–20 each; 70/100 passes. Defense lasts 30
minutes and a matching pass is reusable for 24 hours **from server creation**.
Binding includes owner, repository, exact refs/object IDs, policy and diff digest.

```sh
pnpm test:grip
pnpm --filter @universe/backend test --runInBand grip/hosted/tests
pnpm --filter @universe/uni-hub test HostedBoardPage.test.tsx
pnpm --filter @universe/ui test GripBoard.test.tsx
pnpm --filter @universe/ui build-storybook
```

For the production-page browser fixture, start the built frontend on loopback
in another terminal and run the test. It uses intercepted synthetic API responses,
not an auth bypass in product code and not a live GitHub/Gemini defense:

```sh
pnpm --filter @universe/uni-hub exec next start --hostname 127.0.0.1 --port 3017
node --test tests/browser/grip-hosted.test.mjs
```

Desktop/mobile fixture screenshots are written locally to
`screenshots/grip-hosted/`; attach reviewed evidence to the PR rather than claiming
the fixture proves live OAuth or deployed retention. The browser origin can be
set explicitly with test-only `GRIP_BROWSER_TEST_ORIGIN`.

## Dependency audit gate (2026-11-06)

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
