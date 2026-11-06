# Hosted Grip whiteboard

## Status and authority

Written design approved in conversation after the retention-scope decision;
implementation planning is authorized, not product execution or deployment. The user approved
the architectural direction: a hosted HTTPS whiteboard, GitHub identity for push
checks, existing frontend/backend deployments, PostgreSQL state, a 30-minute
defense window, live-store sensitive-content deletion within 24 hours, and temporary
fail-open for technical failures only. The user explicitly accepted that backups/PITR
may retain encrypted content longer, subject to verified/documented retention,
restricted operator access and expiry cleanup before any restored database serves
requests. Subsequent approval covers the written specification; activation still
requires operator evidence. Product implementation, deployment, OAuth
configuration and secret changes have not started.

- Branch: `feature/grip-hosted-whiteboard`.
- Parent/base for the requested stacked PR:
  `chore/RS-237-RS-168-RS-238-ci-and-agent-workflow` (PR #339).
- Initial parent revision: `fe713372da4da506a993f8283eaa72148f0996ab`.
- The child PR must target that branch while #339 is open, not `develop`.
- A real task code/Notion link must be supplied before PR publication; do not
  invent a ticket or automatically create/update tracker records.
- Written-spec approval permits implementation planning, not product code.

## 1. Intent, success and non-goals

A developer running `git push` receives a server-hosted URL, signs in using the
same GitHub account as their CLI enrollment, and defends the exact changes being
pushed. The original Git process waits for an authoritative server result. No
local HTTP listener, Python installation or local whiteboard UI is needed in the
new hook path.

Retain the existing shared user-local gateway enrollment and repository/write
permission checks. Do not mix developer authentication with the portal's Google
SSO or create student `User` records for GitHub developers. Reuse the existing
Gemini client from #339 rather than implementing another key/model router.

Not included: mandatory remote Git enforcement, changing Google SSO, production
deployment, new microservices, new external storage, team dashboards, administrator
access to developers' answers, arbitrary repositories/models, or the deferred
Opportunities PRD audit. This does not make third-party AI available or infallible.

## 2. Architecture and package boundaries

| Unit                                      | Responsibility                                                                                                                           |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/grip/` Node CLI and Husky hook   | Validate destination/enrollment; collect and filter the push diff; create/run the check; print/open URL; poll and decide local exit code |
| `packages/uni-hub/app/dev-tools/grip/`    | Hosted pages outside the student dashboard, with a dedicated GitHub session and a narrowly scoped same-origin backend-for-frontend (BFF) |
| `packages/uni-hub/views/dev-tools/grip/`  | Application orchestration, API client and TanStack Query queries/mutations; isolated query cache for developer identity                  |
| `packages/ui/components/complex/`         | Presentational board/question/feedback components composed from Una primitives; no fetching, auth or policy                              |
| `packages/backend/grip/`                  | GitHub browser auth, check ownership/state, generation, validation/repair, grading, quotas and cleanup                                   |
| `packages/core/types/` and `constants/`   | Single shared hosted-check contracts, public board projection, state/reason constants and policy limits                                  |
| PostgreSQL via existing Prisma data layer | Authoritative sessions, idempotency, leased operations and temporary content across replicas                                             |

Use existing deployments; do not serve a second ad-hoc HTML application from
NestJS. The URL is on the configured frontend origin, not `localhost`. The BFF
forwards only fixed Grip routes to the configured backend origin and is not an
open proxy. It must not import or change the student token-refresh client.

## 3. Developer flow

1. Read all ref-update records from pre-push stdin. Validate the actual push
   destination against the existing UniVerse repository restriction. Resolve Git
   objects with argument arrays, never shell interpolation or code execution.
2. Compute a canonical manifest containing repository identity, all local/remote
   ref names and object IDs, policy version, and the filtered diff digest.
   Canonically sort updates; handle multiple refs, new branches and deletions.
   Derive the diff from the object IDs Git supplied, not a later mutable `HEAD`.
   New-branch comparison uses the destination's default branch merge-base; a
   deletion-only or truly empty change needs no model call and prints its reason.
   An empty result caused by a Git/read/parse failure is an error, never no-op.
3. Apply the existing exclusions and 30,000 UTF-8-byte content budget before
   upload. Include only paths represented in the visible diff; mark truncation in
   both CLI and UI. The manifest covers the full push, but a truncated board does
   not prove understanding of omitted content. Do not read private Grip reports.
4. Using the existing CLI bearer enrollment, create a check and receive an opaque
   public check identifier, HTTPS URL, binding digest and expiry. Print the URL
   immediately, then open the system browser where possible.
5. Explicitly request generation over an awaited, authenticated HTTP operation.
   The browser can show the persisted preparation state while this runs. Nothing
   depends on detached work after an HTTP response or a live CLI callback server.
6. The developer signs into GitHub, sees the manifest summary, scope/truncation
   notice, validated board and five questions, then submits all five answers.
7. The browser requests server grading; meanwhile the CLI polls a content-free
   status endpoint every three seconds, without overlapping polls or polling the
   model. Browser reloads read the existing check instead of regenerating it.
8. A fresh passed result for the exact digest and owner permits the original push.
   A failed, cancelled or expired check blocks it. CLI interruption exits nonzero;
   best-effort cancellation cannot turn interruption into success. Closing a tab
   alone does not cancel the check, but does not pass it either.

An ordinary new push after a failed defense creates a new check; a submission
cannot be edited after grading starts. Existing 24-hour remembered passes become
server-side records bound to owner, repository, full manifest digest and policy
version; only `PASSED` is reusable. A fail-open event is never cached as a pass.

## 4. GitHub browser authentication

Retain GitHub Device Flow for CLI enrollment. Add a separate browser authorization
code flow with unpredictable state, PKCE S256, an exact configured callback URL
and a server-only OAuth client secret. Reuse the existing OAuth client only if its
registration supports the required callback; changing that registration is a
human operation, not permission to read or provision secrets.

The OAuth callback is on the frontend origin and exchanges code through the fixed
BFF/backend path. The browser receives only an opaque, rotated session cookie:
`HttpOnly`, `Secure` in production, host-only, `SameSite=Lax`, with a one-hour
maximum lifetime. No GitHub/Gemini/CLI enrollment token appears in page JSON,
localStorage, sessionStorage, URL fragments or analytics. GitHub access tokens are
used transiently for identity verification, not stored with checks. The backend
stores only hashes of browser-session secrets; auth-state/PKCE material expires
after ten minutes, is bound to the initiating browser and is consumed once.

The BFF forwards only the dedicated developer-session credential, not portal
cookies or arbitrary authorization headers. All authenticated check access compares
the GitHub numeric identity with the CLI-created owner and rechecks repository
write permissions through the existing GitHub client. Wrong-account access returns
a generic not-found view without the diff, questions or result. A successful
GitHub login does not approve a check or grant student roles.

State-changing browser requests require exact Origin validation plus a
session-bound CSRF token. Fixed return destinations prevent open redirects.
OAuth callback query strings, cookies and credentials must be excluded/redacted
from access logs; do not let existing generic request logging capture auth codes.
Protected responses use `Cache-Control: no-store` and a no-referrer policy. Clear
the dedicated query cache on logout/account change and never broadcast check
content across student and developer sessions.

## 5. State machine and durable work

Check states:

`CREATED → GENERATING → READY → GRADING → PASSED | FAILED`.

Other terminal states: `CANCELLED`, `EXPIRED`, `QUOTA_REJECTED`, `TECHNICAL_ERROR`.

- The nonterminal defense window is 30 minutes from creation, including model
  operations. The backend evaluates expiry on every transition/read; client
  timers are informational. Terminal results are immutable.
- Generation and grading use PostgreSQL compare-and-set claims and expiring
  operation leases; no database transaction remains open during a network call.
- Each operation has a unique operation ID and absolute deadline. Persist results
  only if the state, operation ID, ownership and expiry still match the claim.
  Late model results cannot overwrite cancellation, expiry or another result.
- Generation has one 120-second total operation budget: at most one initial
  logical completion and one repair completion, each limited to the remaining
  budget and the inherited 60-second completion deadline. Grading has one
  60-second completion budget. Quota leases cover only model operations, not the
  developer's 30-minute think time.
- Duplicate requests replay an already recorded result or report the existing
  operation as pending; they must not dispatch another model call. A stale lease
  after a process crash becomes a technical error, not silently repeated work
  whose cost/outcome is unknown. Recovery occurs on reads and scheduled cleanup.
- A team/provider model-quota rejection during initial generation, repair or
  grading must persist terminal `QUOTA_REJECTED` with a safe quota reason before
  returning HTTP `429`. This includes reservation failure before model dispatch.
  The CLI status endpoint exposes that denial even when the browser initiated
  grading. Finalize/clear the operation claim atomically with the denial; duplicate
  requests and stale-lease recovery cannot change it to `TECHNICAL_ERROR` or start
  more model work. A failed persistence attempt is not evidence of a recorded
  denial; the accepted local-hook outage limitation still applies.
- Generation/grade handlers await their work and persist the outcome before
  returning. A process can die without completing the operation; durable leases
  make that observable from any replica. No Redis/queue is introduced in v1.

## 6. API contract

Backend namespace: `/dev-tools/grip`. Frontend BFF uses only the fixed
`/dev-tools/grip/api/` namespace; the board URL is
`/dev-tools/grip/boards/:checkId`. IDs are random public identifiers distinct from
internal database IDs and carry no authentication authority.

| Backend operation                          | Authentication                      | Contract                                                                                                                                                   |
| ------------------------------------------ | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /checks`                             | CLI bearer                          | Validated manifest, visible diff, represented paths, truncation flag and client request ID; return check ID, URL, binding digest, state, expiry and policy |
| `POST /checks/:checkId/generation`         | Owning CLI bearer                   | Claim/await initial generation or replay its outcome; never accept client prompts, schema, model or rubrics                                                |
| `GET /checks/:checkId/status`              | Owning CLI bearer                   | State, public reason code, digest, expiry, server pass validity and optional score; no diff, board, answers or rubrics                                     |
| `GET /checks/:checkId`                     | Owning browser session              | Public manifest summary, visible diff, validated public board and eventual safe result projection; never hidden criteria                                   |
| `POST /checks/:checkId/submissions`        | Owning browser session + CSRF       | Five bounded answers keyed by stable question ID, board revision and request ID; atomically claim/await grading                                            |
| `POST /checks/:checkId/cancellation`       | Owning CLI bearer or browser + CSRF | Idempotent cancellation of a nonterminal check; no terminal overwrite                                                                                      |
| Browser auth start/callback/session/logout | OAuth transaction / browser cookie  | Exact redirects, one-use state/PKCE, safe identity projection and revocation                                                                               |
| Internal cleanup operation                 | Dedicated scheduler OIDC identity   | Delete expired content and auth transactions; never expose a public cleanup trigger                                                                        |

Mutation idempotency is enforced by unique `(owner, clientRequestId)` for creation
and `(check, operation, requestId)` for subsequent intents. A reused key with a
different canonical payload returns `409`. In-flight duplicates return `202`
with the existing state. Replay after terminal state never creates another bill.
Validate bounded arrays, UTF-8 bytes, refs, object IDs and JSON at the boundary
using DTOs implementing core contracts. No arbitrary URL, repo, filesystem path,
shell command, prompt, passing score or result is trusted from the client.

Use existing Nest error conventions, not a global error-envelope rewrite.
Separate typed technical-result reasons from authorization/validation errors.
`400`, `401`, `403`, ownership `404`, conflicting state `409`, size `413`, and
quota `429` do not count as provider outages. For read-only polling throttles,
wait for `Retry-After` within the defense window; a model-quota rejection blocks
the current push rather than triggering fail-open. Existing team quota policy remains:
10 model completions/minute/user, 100/day/user, 500/day/team and two concurrent
logical completions. Initial generation, repair and grading each consume their
own logical completion reservation; repeated status reads do not consume AI quota.
Shared DB-backed request throttles separately allow 60 reads/minute per authenticated
developer session and 30 browser-auth starts/minute per trusted client IP. These
limits do not increase model quotas; apply the existing stricter session-exchange
limits to identity exchange. Client polling honors `Retry-After` without submitting
model work again. A throttle response must not mark a check as a technical error.
Preserve typed failure provenance through key cooldown and pool exhaustion when
reusing the Gemini client. A pool with no eligible pair because of provider quota
must remain quota-rejected on subsequent calls during that cooldown, not become
generic fail-open-eligible `503`. For mixed blocking causes, any active quota or
credential/auth block prevents classifying total exhaustion as purely technical;
only exhaustion attributable exclusively to transient failures is eligible for
technical fail-open. Do not change the inherited key/model traversal order.

## 7. Board validation and scoring

Server-owned prompts/schema follow the reviewed Grip 0.5.0 whiteboard semantics:
five pinned questions; mandatory `why this way`, `where it fails`, `how you know`;
`malicious actor` when untrusted nodes exist; `data structure` when a store exists.
Validate node counts (2–8), edge counts (up to 12), unique IDs, pin targets, path
membership, bounded text, control characters and two-to-four rubric points.
Treat diff text and all model output as untrusted data, never instructions.

Validate decoded inner board content, not only the OpenAI-compatible envelope.
One repair may include validation findings and original context; invalid output
after repair is a technical generation failure, never a silently weakened board.
Use #339's model-first eligible-key traversal for each logical completion, bounded
by the operation deadline. Structural board repair is distinct from transport
retry. Keep upstream notices/licenses when adapting code or prompts; pin the
reviewed source revision and verify license obligations before porting.

Keep rubrics, system prompts and grading inputs server-only. Grade the five
answers against stored immutable questions/rubrics, validate exactly one score
per question (0–20, total 0–100), and derive pass/fail server-side at 70. Invalid
grading output is a technical failure, not a pass or an invitation for the browser
to supply a score. Return bounded plain-text feedback without hidden rubric data.
The UI escapes text; no raw model HTML, executable Markdown, or arbitrary links.

## 8. Temporary fail-open policy and trust limits

The hook may allow the push with an explicit `UNVERIFIED: technical failure`
warning for network/TLS reachability timeouts or approved technical results:
provider unavailable/timeout, exhausted board repair, invalid grading output, or
server operation failure. No forged/malformed status is interpreted as `PASSED`.
Malformed contracts, known policy-version incompatibility and local Git/data
errors fail closed instead of silently bypassing a check.

An observed terminal `FAILED`, `CANCELLED`, `EXPIRED`, `QUOTA_REJECTED`, a digest mismatch,
authentication/ownership denial or model-quota rejection always returns nonzero; later
network failure cannot override a denial the hook already knows. Browser logout,
tab closure, empty answers and deliberate cancellation are not technical passes.
At the hook's 30-minute deadline, a lack of human completion is expiry, not a
network exception. Print a URL to resume/review when available, but do not launch
a second push or automatically retry an interrupted Git process.

This policy cannot prevent deliberate circumvention by a user who controls their
machine/network/hook. Even signed server receipts cannot make a local fail-open
hook mandatory. Genuine enforcement would require separately approved remote
controls. A pass proves only the uploaded filtered change was defended, not that
an untrusted client faithfully represented every local object.

## 9. Persistence, privacy and cleanup

Use additive Prisma models for a check, its short-lived content, browser sessions
and OAuth transactions/operation claims. Separate sensitive content from compact
check state so it can be deleted without retaining diff/rubrics in result records.
Public responses expose only purpose-created public IDs and allowlisted fields.

- Persist the owner, canonical manifest/digest, public ID, policy version, state,
  expiry, operation claims, safe reason code and score as needed for the lifecycle.
- Sensitive content comprises visible diff, model board/rubrics, submitted answers
  and feedback. Keep only while necessary, purge on expiry/terminal completion
  where it no longer serves an active view, and in all cases within 24 hours of
  creation in the working database. Backup/PITR retention is separately disclosed
  below. No localStorage answer drafts or persistent request-body logging.
- Passed receipts are valid until 24 hours after creation (not 24 hours after a
  late completion). Pass validity and sensitive-content retention use the server's
  creation timestamp. Each create intent carries a
  stable random request ID and client intent timestamp, both included in its
  canonical hash. Reject timestamps more than five minutes in the future or
  age of 24 hours or more. Retain only the compact creation-idempotency tombstone
  until the later of server creation plus 24 hours and client intent timestamp
  plus 24 hours (at most five extra minutes for accepted clock skew). Reject at
  `now >= clientIntentAt + 24h`; delete the tombstone only at or after its retention
  deadline, using consistent boundary comparisons. This does not extend content
  retention or passed-receipt validity.
  Reject an old intent instead of recreating it after tombstone deletion. A denied
  check's old request ID never becomes a new authorized intent within its replay
  window; a fresh push intentionally creates a new intent.
- A protected scheduled cleanup runs at least every 15 minutes and deletes using
  a safety margin so the maximum live-store retention is 24 hours, not 24 hours
  plus scheduler interval. Access must reject expired material immediately even
  if physical deletion is pending. Monitor the oldest retained content and alert
  on cleanup failure; no claim of physical deletion while the database is down.
- Approved retention scope: delete sensitive content from the working database
  within 24 hours; encrypted backup/PITR copies may outlive that window. Before
  enabling hosted uploads, verify and document the actual backup/PITR retention,
  access restrictions and restore procedure. Run expiry cleanup against a restored
  database before reopening any application access, including hosted checks and
  status endpoints. Application encryption with a retained reusable key is not
  cryptographic erasure; do not claim backups are purged after 24 hours. Until the
  operator evidence and restore-time cleanup are in place, uploads remain disabled.
- Persisted sensitive content uses authenticated application encryption with a
  dedicated server-only key/version; encryption keys and Gemini secrets must not
  appear in database rows or logs. Rotation/rollback must keep necessary old keys
  available only until their encrypted content expires.

This explicitly changes the current gateway's no-prompt/no-answer persistence
policy. Enrollment/board pages and `docs/grip.md` must disclose retention and
third-party processing before upload; existing exclusion rules are not proof that
arbitrary source code contains no secrets. Do not send confidential/personal
content through unpaid Gemini processing contrary to provider terms.

## 10. Configuration, rollout and rollback

Add validated server-only hosted-mode configuration, canonical frontend/backend
origins, exact OAuth callback/client secret, encryption key/version and scheduler
identity. Every new variable belongs in `.env.example` with empty secret
placeholders and an operator runbook. Browser-visible values contain no secrets.
The implementation plan must choose exact names after searching existing config.

Deploy schema and backend/frontend support before switching the hook path. Gate
hosted mode server-side and fail closed with a configuration instruction when
explicitly disabled or incompatible; do not silently run a different quiz.
Existing enrollment tokens remain valid. Remove the native-executable requirement
from the hosted setup/status/hook path and update all direct callers/tests; no
executable-path alias or second enrollment mechanism is introduced. Existing raw
completion support can remain for actual older clients during the documented
deployment transition, not as an undocumented hosted fallback or renamed shim.

The supported backend rollback artifact must retain the additive hosted schema,
cleanup handler and necessary encryption keys/configuration while disabling new
hosted checks. The current container runs `prisma db push` on startup: a pre-schema
backend is not a supported cold-start rollback while hosted records remain, as
its schema can attempt to remove populated models and refuse startup. Never enable
data-loss acceptance to make rollback start. Keep cleanup operational until retained
content expires and is purged; traffic rollback alone does not meet retention.
An operator explicitly selects a schema-compatible backend and released hook
rollback. No automatic force push, hook bypass, cloud
deployment, schema push, OAuth registration, scheduler provisioning or secret
write is authorized by this spec. Existing Google SSO and opportunity behavior
must remain unchanged. The implementation PR targets the branch of #339 and uses
the repository template, real ticket metadata, visual evidence and honest checks.

## 11. Acceptance and verification

| Acceptance                        | Required evidence                                                                                                                                 |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| HTTPS URL, no local server/Python | Real Git pre-push test with controlled remote, fixed manifest and mocked hosted API; no local listener/native Grip spawn                          |
| Correct push binding              | Multi-ref/new-branch/deletion tests, deterministic digest, changed object/ref/policy invalidates reuse, UTF-8 budget and excluded-path fixtures   |
| GitHub owner only                 | OAuth state/PKCE replay, wrong account, revoked writer, expired cookie, login CSRF, open redirect and missing Origin/CSRF rejection tests         |
| Model output is not trusted       | Invalid inner JSON, missing required pin kinds, bad paths/IDs/edges, oversized text, bounded repair exhaustion, malicious text rendering          |
| Server owns scoring               | Browser cannot provide rubrics/score/status; forged answers/question IDs/revisions fail; validated 69/70 boundary determines result               |
| Replica-safe operations           | Disposable PostgreSQL races for duplicate create/generate/submit, one model dispatch/lease, stale-worker result and expiry/cancellation conflicts |
| No background dependency          | Handler crash and stale lease recover to observable technical failure from a second app instance; no detached generation after `202`              |
| Fail-open is narrow               | Technical failure prints unverified/does not cache pass; failed/expired/cancelled/auth/quota/digest mismatch remains blocked despite later outage |
| Data expires                      | Clock-controlled cleanup/decryption tests and scheduled-job runbook evidence; no secrets/content in logs or browser projection/cache              |
| Hosted UI works                   | Real browser walkthrough of login, preparation, five questions, submit, score, logout/account switch, keyboard/labels/focus, errors and expiry    |
| No portal regression              | Google login/dashboard integration unchanged; i18n strings in both locales; UI tier and Storybook placement obey repo rules                       |

Also verify quota provenance across later requests and mixed cooldown causes;
browser-initiated grading/repair quota denial remains terminal and CLI-observable;
an exact create-intent replay at every future-clock/tombstone boundary cannot
recreate work; and the rollback artifact cold-starts with populated additive models
and still purges retained content. Hosted activation requires evidence of the
approved working-database/backup retention policy and a restore drill that removes
expired data before application access resumes.

Run the workflow checks at implementation completion: lint, stylelint, full
typecheck, package tests, production build, changed-source formatting, relevant
Grip/requirement tests and Storybook when UI changes. Preserve existing constraints
and report baseline warnings honestly. No tests have run for a hosted feature yet;
this is a design artifact, not evidence of implementation or deployability.

## References reviewed

- Parent PR #339: <https://github.com/Karazin-UniVerse/uni-verse/pull/339>.
- Existing source: `.husky/pre-push`, `scripts/grip/`, backend `grip/`,
  `packages/backend/prisma/schema.prisma`, `packages/core/types/grip.ts`.
- Grip 0.5.0 board validation/repair reference:
  <https://github.com/guilyx/grip/blob/v0.5.0/src/grip_hook/whiteboard.py>.
- GitHub OAuth App browser flow (state, PKCE, server-side exchange):
  <https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps>.
