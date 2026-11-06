# Hosted Grip Whiteboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> Those execution skills are not present in this repository's available skill
> catalog. Do not invent or install them. After the user reviews this plan and
> chooses an execution method, use the available `implement`, TDD, verification
> and review workflow, disclosing the missing handoff. No product implementation
> is authorized by the plan's existence.

**Goal:** Replace the local whiteboard push path with an owner-only HTTPS defense,
using GitHub login and a server-owned result for the exact push.

**Architecture:** Keep the Node hook, existing Next.js/NestJS deployments and
PostgreSQL. The hook submits a bounded manifest/diff, the backend durably claims
and awaits generation/grading, and the hosted frontend uses a fixed-route BFF and
dedicated GitHub session. Reuse #339's Gemini traversal, extending failure
provenance rather than adding a second retry router.

**Tech Stack:** Node.js 24, pnpm 10, strict TypeScript, NestJS, Prisma/PostgreSQL,
Next.js 16.4.3, React 19.3.1, TanStack Query, Una/SCSS Modules, Jest, Vitest/RTL,
Node test runner and Playwright. No queue, microservice or new runtime dependency
is planned; validate this assumption at the corresponding task before changing it.

**Spec:** `docs/superpowers/specs/2026-11-05-grip-hosted-whiteboard-design.md`.
The written specification and working-database/backup retention scope were approved
in conversation. This plan still requires review and an execution-method choice.

## Global Constraints

- Worktree/branch: `feature/grip-hosted-whiteboard`; initial parent
  `fe713372da4da506a993f8283eaa72148f0996ab`, branch of PR #339.
- Child PR base: `chore/RS-237-RS-168-RS-238-ci-and-agent-workflow`, not `develop`
  while #339 remains open. No force pushes, automatic deployments or secret writes.
- Five questions, 0–20 integer points each, pass at 70/100; developer answers.
- Defense expires 30 minutes after server creation; remembered pass expires
  24 hours after server creation, never after a late completion.
- Visible diff budget: 30,000 UTF-8 bytes. All Grip bodies remain bounded at
  256 KiB; refuse overflow rather than relaxing the existing parser.
- Generation budget 120 seconds for initial plus at most one repair completion;
  grading 60 seconds. Each inherited Gemini completion is capped at 60 seconds
  and remaining operation/check time; backoff is 250 ms.
- CLI polls every three seconds without overlapping; reads 60/minute/developer
  session, OAuth starts 30/minute/trusted IP, existing exchange/model quotas stay.
- `429`/credential blocks never become technical fail-open, including subsequent
  calls. Failed/cancelled/expired/quota-rejected/digest-mismatched checks fail closed.
- GitHub browser cookie: opaque, host-only, HttpOnly, SameSite=Lax, secure in
  production, one hour. OAuth transaction: state + PKCE S256 + browser binding,
  consumed once, ten minutes. No portal-role or Google-login changes.
- Working-database content is purged within 24 hours; encrypted backups may live
  longer under the explicitly approved, verified/documented backup policy.
  Restore-time cleanup runs before application access. Hosted mode stays disabled
  until scheduler, retention and restore evidence exist.
- Core owns cross-package contracts/constants; no compatibility re-exports,
  aliases, circular dependencies, suppression comments or weakened tests/checks.
- Every new UI string uses keys in both locales. Only UI-only composites live
  in `packages/ui`, and stories exist only there. No raw model HTML/Markdown.
- Baseline evidence before this plan: 2,008 package tests passed, lint/style and
  formatting passed, typecheck/build exited 0 with existing Turbo output warnings
  and backend expected/experimental logs. These are not hosted-feature results.
- Per-task commits below are proposed checkpoints; publication still requires
  user authorization. A real ticket code/Notion link is required before PR creation.

## Review Focus

1. Remote refs change during human defense: never reuse a pass for different
   object IDs or silently fetch a new baseline (Task 1 and Task 9).
2. Browser account changes or concurrent tabs: no cached content/CSRF from one
   developer remains visible to another (Tasks 5, 8 and 10).
3. HTTP response is lost after paid grading succeeds: replay returns persisted
   outcome, not another charge or a manufactured pass (Tasks 3 and 6).
4. Provider quota occurs in a different request/replica: stored check denial is
   durable; a process-local cache is not the policy authority (Tasks 2, 3 and 6).
5. A rollback/restored DB contains old content or operations: cleanup and fencing
   work before requests are reopened; no resurrection of expired defenses (Tasks
   3, 4, 11 and 12).

## File structure and responsibility map

| Location                                                                                     | Responsibility                                                                                                             |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `packages/core/{constants,types,utils}/grip-hosted.ts`                                       | Policy/value sets, shared wire contracts, canonical binding/public projection helpers                                      |
| `scripts/grip/{push-manifest,hosted-client,hosted-hook}.mjs` and matching `tests/*.test.mjs` | Safe Git extraction, hosted HTTP, original-push lifecycle                                                                  |
| `packages/backend/grip/gemini-{client.service,key-pool}.ts`, `grip.types.ts`                 | Existing router with explicit quota/credential/transient provenance                                                        |
| `packages/backend/grip/hosted/`                                                              | Config, encrypted content, state storage, auth, check orchestration, validation/prompts, cleanup and thin controllers/DTOs |
| `packages/backend/grip/hosted/tests/`                                                        | Unit, HTTP and disposable-PostgreSQL behavior, using the module-local Grip convention                                      |
| `packages/backend/prisma/schema.prisma`                                                      | Additive hosted state, no existing table/column removal                                                                    |
| `packages/uni-hub/services/{api.grip,grip-server-client}.ts`                                 | Browser fixed-BFF client and separate server-only fixed-backend client                                                     |
| `packages/uni-hub/app/dev-tools/grip/`                                                       | Route pages, dedicated provider boundary and explicit auth/API route handlers                                              |
| `packages/uni-hub/views/dev-tools/grip/`                                                     | Board application, queries, form state and account-aware transitions                                                       |
| `packages/ui/components/complex/GripBoard/`                                                  | Pure board/edge/questions/feedback presentation and stories                                                                |
| `scripts/grip/cleanup-hosted.mjs`, `docs/grip-hosted.md`                                     | Awaited operator cleanup runner, deployment/retention/restore instructions                                                 |

## Shared interface decisions

Define interfaces in Task 1 before consumers. Use named parameter objects for
functions with more than three inputs. Persist domain-specific private types in
`hosted/grip-hosted.types.ts`; never expose Prisma rows or hidden rubrics.

- `GripPushUpdate`: `localRef`, `localOid`, `remoteRef`, `remoteOid` strings.
- `GripPushManifest`: `repository`, canonically sorted `updates`, `policyVersion`,
  `diffDigest` (SHA-256 over exact uploaded UTF-8 text).
- `GripCreateCheckRequest`: `requestId`, `intentCreatedAt`, `manifest`, `diff`,
  `files`, `truncated`. Manifest binding digest is recomputed by backend.
- `GripCheckState`: CREATED, GENERATING, READY, GRADING, PASSED, FAILED,
  CANCELLED, EXPIRED, QUOTA_REJECTED, TECHNICAL_ERROR.
- `GripCheckStatus`: `checkId`, `state`, `bindingDigest`, `expiresAt`,
  `passValidUntil`, `policyVersion`, optional `score` and `reason`.
- `GripCreatedCheck`: status plus `boardUrl`. `checkId` is a 32-byte random
  base64url public ID, separate from the internal row ID; it is not a credential.
- `GripPublicBoard`: `revision`, `summary`, nodes/edges and five questions with
  stable IDs, `on`, `kind`, `question`; no rubric/prompt/answer key.
- `GripCheckView`: status, public manifest, `diff`, `truncated`, public board when
  ready, and safe grade feedback after a terminal result while content exists.
- `GripSubmissionRequest`: `requestId`, `boardRevision`, five
  `{ questionId, answer }` entries. Each answer 1–4,000 trimmed characters;
  combined answers at most 20,000 UTF-8 bytes. Reject duplicate/missing IDs.
- `GripBrowserIdentity`: `githubId`, `login`, `expiresAt`, `csrfToken` only.
- `GripModelFailureReason`: TRANSIENT, PROVIDER_QUOTA, CREDENTIAL_UNAVAILABLE.
  Hosted public quota reasons distinguish TEAM_QUOTA / PROVIDER_QUOTA;
  credential failures are non-fail-open configuration/auth denial.

Statuses and technical reason allowlists come from core constants. Data decoding
still validates at network boundaries; a TypeScript assertion is not validation.

### Task 1: Push manifest and shared policy contracts

**Files:** Create core `constants/grip-hosted.ts`, `types/grip-hosted.ts`,
`utils/grip-hosted.ts`, `utils/tests/grip-hosted.test.ts`; create
`scripts/grip/push-manifest.mjs`, `tests/push-manifest.test.mjs`; modify root
`package.json` (Node engine) and `.grip.toml`/policy callers only to remove duplicate
policy authority once the hosted hook is integrated in Task 9.

**Interfaces:** Produce
`canonicalizeGripManifest(manifest: GripPushManifest): string`,
`createGripBindingDigest(manifest: GripPushManifest): string` and
`collectPushManifest({ repoRoot, remoteUrl, stdin, signal }): Promise<GripCollectedPush>`.
The collected result discriminates `review` from `noContent`; errors never become
`noContent`. CLI may import JS-safe core TypeScript through native Node 24 type
stripping; pin/document Node >=24.20.0 rather than requiring a core build before push.

- [ ] Add deterministic fixtures asserting
      `digest(a) === digest(reorderedUpdates(a))` and
      `digest(a) !== digest(changeRemoteOid(a))`; use hand-derived canonical JSON.
- [ ] In real temporary Git repos, write tests for two pushed refs, SHA-1/SHA-256
      object formats, new branch merge-base, deletion-only no-op, missing objects,
      missing origin HEAD/default baseline, no merge-base and malformed stdin. Missing
      baseline must fail closed with a fetch/setup instruction, not fetch implicitly.
- [ ] Test excluded files (all existing `.grip.toml` patterns), rename/binary/path
      quoting, filenames beginning `-`, Unicode split at byte 30,000, truncation and
      a diff consisting only of excluded content. Disable external diff/textconv with
      Git flags; never execute user Git diff drivers or hooks in extraction.
- [ ] Define the push diff deterministically: existing refs compare remoteOid to
      localOid; new refs compare localOid with the merge-base of the fetched
      `refs/remotes/origin/HEAD` target. Exclude deletion content, sort ref records
      and prefix visible sections with the corresponding update identity. Filter
      path pairs before requesting per-file patches so secrets never enter the
      upload buffer. Canonical payload uses fixed property order and UTF-8 LF text;
      budget complete sections where possible, and truncate only at valid codepoint
      boundaries with the flag set. Binary entries expose bounded path metadata,
      not binary payloads. Maximum 128 updates and 512 represented paths; overflow
      is explicit validation failure, not a hidden omission.
- [ ] Run `pnpm --filter @universe/core test` and
      `node --test scripts/grip/tests/push-manifest.test.mjs`; confirm new cases fail
      for missing behavior, then implement safe argument-array Git execution and UTF-8
      budgeting. Validate URLs/refs before resolving objects; use `--` path boundaries.
- [ ] Re-run both suites green. Proposed checkpoint:
      `feat(grip): bind hosted checks to canonical push manifests`.

### Task 2: Typed provider failures survive cooldown exhaustion

**Files:** Modify backend `grip/gemini-client.service.ts`, `gemini-key-pool.ts`,
`grip.types.ts`; create `grip/gemini-failure.ts`; extend existing
`tests/gemini-{client.failover,key-pool}.spec.ts`.

**Interfaces:** Produce `GeminiFailure extends HttpException` carrying private
`reason: GripModelFailureReason`; pool exposes
`getUnavailableReason(model: string): GripModelFailureReason` for exhausted
eligibility. Extend `complete(request, callerSignal?)` only as needed to reuse the
existing cancellation signal with caller remaining-budget abort; no new router.

- [ ] Add tests: one-key 429 then another completion during cooldown remains quota;
      401/403 cooldown remains credential denial; all transient cooldown is technical;
      mixed quota/transient and credential/transient exhaustion cannot fail open.
      Preserve the last sanitized error and secret-free logs without raw provider text.
- [ ] Run focused Jest suites red; implement explicit cooldown provenance and
      priority (credential denial, then quota, then transient) without changing
      model-first traversal, Retry-After, load balancing or cancellation behavior.
- [ ] Run `pnpm --filter @universe/backend test --runInBand grip/tests/gemini-client.failover.spec.ts grip/tests/gemini-key-pool.spec.ts` green and typecheck.
- [ ] Proposed checkpoint: `fix(grip): preserve quota provenance across cooldowns`.

### Task 3: Durable hosted state and atomic idempotency

**Files:** Modify backend Prisma schema; create
`grip/hosted/grip-check-storage.service.ts`, `grip-hosted.types.ts`,
`tests/grip-check-storage.spec.ts`, `tests/grip-check-storage.postgres.spec.ts`;
create `test/jest-grip-hosted-postgres.json` and backend `test:grip:hosted:postgres`
script, excluding only that explicit integration entry from ordinary Jest just as
the existing dedicated Grip PostgreSQL suite is selected separately.

**Interfaces:** `createOrReplay({owner,input,bindingDigest,requestHash})`,
`claimOperation({owner,checkId,kind,requestId,requestHash,deadline})`,
`finishOperation({checkId,operationId,expectedState,result})`,
`cancelCheck({owner,checkId})`, `readOwned({owner,checkId})` all return typed hosted
domain snapshots, not public DTOs. Claims discriminate `claimed | pending | replay`.

- [ ] Add `GripHostedCheck`, `GripHostedContent`, `GripHostedIntent`,
      `GripBrowserSession`, `GripOAuthTransaction`. Check holds public ID, owner
      GitHub ID, binding/policy, lifecycle/expiry/score/reason, operation ID/deadline,
      request hashes and timestamps. Content is separate encrypted bytes/key version;
      intent tombstone has unique owner/request ID and replay deadline independent
      of content/check deletion. Add expiry/claim/owner indexes and relations only.
- [ ] Write failing tests for duplicate create with same/different body, simultaneous
      operation claims, result fencing, terminal immutability, generation replay and
      grading response lost after success. Assert one claim and one model dispatch in
      orchestrator integration, not just a mock call to `create`.
- [ ] Write two-client disposable PostgreSQL tests for those races, boundary expiry,
      mixed cancel/finalize, quota-rejected claim finalization, stale lease recovery,
      and accepted +5-minute client clock followed by replay at 24h/24h+5min.
- [ ] Run integration command against explicitly provided disposable
      `GRIP_TEST_DATABASE_URL`; absence must fail with an instruction, not skip. Schema
      application is allowed only to the confirmed disposable DB, never production.
- [ ] Implement short DB transactions/CAS updates with count checks; no network in
      transactions and no speculative retry of already dispatched work. Run unit and
      PostgreSQL suites green. Proposed checkpoint: `feat(grip): persist fenced hosted checks`.

### Task 4: Validated config and authenticated content encryption

**Files:** Create `hosted/grip-hosted.config.ts`, `grip-content-crypto.ts`,
matching `tests/*.spec.ts`; modify `.env.example` and `docs/grip-hosted.md`.

**Interfaces:** `getGripHostedConfig(env): GripHostedConfig | null`,
`encryptGripContent({plaintext,checkPublicId,payloadVersion,keyring}): GripEncryptedContent`,
`decryptGripContent({content,checkPublicId,payloadVersion,keyring}): Buffer`.

- [ ] Config names: `GRIP_HOSTED_ENABLED=false`,
      `GRIP_HOSTED_RETENTION_VERIFIED=false`, `GRIP_HOSTED_FRONTEND_ORIGIN`,
      `GRIP_GITHUB_OAUTH_CLIENT_SECRET`, `GRIP_CONTENT_KEYRING` (version→base64 key
      JSON), `GRIP_CONTENT_ACTIVE_KEY_VERSION`, `GRIP_CLEANUP_OIDC_AUDIENCE`,
      `GRIP_CLEANUP_SERVICE_ACCOUNT_EMAIL`; frontend server-only `GRIP_BACKEND_ORIGIN`.
      Reuse existing OAuth client ID and GitHub URLs. Derive the exact callback from
      the frontend origin and fixed path; no request Host-derived callback or defaults.
- [ ] Red tests: disabled does not require secrets; enabled missing/invalid origins,
      insecure nonloopback URLs, duplicate/invalid key versions, non-32-byte keys,
      unverified retention and malformed cleanup identity refuse hosted activation.
- [ ] Red crypto tests: AES-256-GCM roundtrip; tampered ciphertext/tag/AAD,
      wrong-check substitution and unknown key version fail; random 12-byte IV per
      encryption, AAD binds check public ID and payload version, no plaintext logging.
- [ ] Implement with Node crypto, run focused Jest green. Keep encryption service
      simple; no new KMS product. Document active/previous key retention and backup
      limitations. Proposed checkpoint: `feat(grip): protect temporary hosted content`.

### Task 5: Separate GitHub browser identity, CSRF and fixed BFF authentication

**Files:** Create backend `hosted/grip-browser-auth.service.ts`,
`grip-browser.guard.ts`, `grip-browser-auth.controller.ts`, `dto/browser-auth.dto.ts`,
`tests/grip-browser-{auth,http}.spec.ts`; extend existing `GithubClientService`
with `exchangeAuthorizationCode({code,redirectUri,codeVerifier})` and its tests.
Create frontend `services/grip-server-client.ts`, its test, and explicit
`app/dev-tools/grip/api/auth/{start,callback,session,logout}/route.ts` plus tests.

**Interfaces:** `startBrowserLogin({browserBinding,returnCheckId,clientIp})`
returns authorization URL + one-use state transaction; `completeBrowserLogin`
consumes `{state,code,browserBinding}` and returns a private opaque session secret
only to the BFF, with identity/CSRF projection; `authenticateBrowser(secret)` and
`revokeBrowserSession(secret)`. `GripServerClient` exposes only named auth/check
methods; browser raw headers/URLs never select an upstream route.

- [ ] Red auth tests for state/PKCE/browser-binding mismatch, expiry, replay,
      concurrent callback, wrong user, revoked writer, session rotation/revocation,
      empty scope and no student User writes. Store state/session hashes; encrypt
      short-lived PKCE/CSRF material; GitHub access token is memory-only.
- [ ] Red BFF tests: fixed origin/paths, no portal cookies/Authorization forwarding,
      safe response allowlist, no-store/no-referrer, rejected open redirect, OAuth
      errors sanitized, authentication code never emitted in logs.
- [ ] Set dedicated `grip_browser` and `grip_oauth_binding` cookies, path
      `/dev-tools/grip`, HttpOnly/SameSite=Lax/secure in production, max ages 3600/600.
      BFF sends `Authorization: GripBrowser <opaque>` from the server-read cookie;
      backend rejects the CLI Bearer scheme on browser-only endpoints and vice versa.
      Origin/CSRF are required for mutations; callback uses consumed browser binding
      and state instead. Cookie secret never appears in client JSON.
- [ ] Implement async Next cookies/params using installed 16.4.3 docs. Extend
      existing GitHub client rather than adding raw fetch to auth service. Keep
      same-origin browser routes outside Google dashboard. Run focused Jest/Vitest
      and package typechecks green. Proposed checkpoint: `feat(grip): add GitHub browser sessions`.

### Task 6: Server-owned board generation, validation, repair and grading

**Files:** Create `hosted/grip-board.validation.ts`, `grip-board.prompts.ts`,
`grip-check.service.ts`, `grip-board.types.ts`, and
`tests/grip-{board,check}.spec.ts`; modify `grip.module.ts` to register providers.
Add pinned upstream source/license notice under `docs/references/grip-whiteboard/`
only after verifying the actual license; do not install or execute upstream code.

**Interfaces:** `validateGripBoard({content,diffFiles}): GripBoardValidation`,
`projectGripBoard(board): GripPublicBoard`,
`validateGripGrade({content,questionIds}): GripValidatedGrade`;
`GripCheckService.create`, `generate`, `submit`, `readStatus`, `readView`, `cancel`
consume the Task 1 contracts + authenticated principal and Task 3 storage.

- [ ] Red board fixtures: mandatory kinds, 2–8 nodes/up to12edges/exactly5pins,
      bounds (node label40,role60,edge label40,question300), invalid IDs/file paths,
      duplicate kinds except `how it works`, rubric2–4 nonempty points, inner invalid
      JSON, oversized output and malicious text. Assert public projection omits rubric.
- [ ] Red grade fixtures: exact question IDs once, integers0–20, total derived
      server-side; scores69 fail/70 pass, no client score or raw rubric echo. Bound
      feedback to1000characters/question and reject control characters.
- [ ] Red service tests: valid generation, one repair only, remaining120s budget,
      grading60s/check expiry, reuse only exact passed binding, quota at reservation/
      provider/repair/browser grading persists QUOTA_REJECTED, auth/config exhaustion
      cannot become TECHNICAL_ERROR, lost HTTP response replays persisted grade.
- [ ] Implement awaited model operations using existing GeminiClientService and
      GripQuotaService with finally-release. Never keep leases while human thinks.
      Persist encrypted content and fence all final writes by operation ID/state/time.
      No arbitrary client prompts/schema, raw model HTML, detached work or retries on
      a stale paid claim. Run focused Jest and concurrency orchestration green.
- [ ] Proposed checkpoint: `feat(grip): validate and grade hosted defenses`.

### Task 7: Bounded HTTP surface, projection and shared throttles

**Files:** Create backend `hosted/grip-check.controller.ts`,
`grip-browser-check.controller.ts`, `dto/{create-check,submission,cancellation}.dto.ts`,
`grip-hosted-rate-limit.service.ts`, `tests/grip-hosted-http.spec.ts`; modify
`grip.module.ts`, `main.ts` (narrow log redaction), body-parser tests if required.
Extend `GripServerClient` and create frontend explicit routes
`api/checks/[checkId]/route.ts`, `submissions/route.ts`, `cancellation/route.ts`.

**Interfaces:** Implement the spec's `/checks`, `/generation`, `/status`, view,
submission and cancellation endpoints. Return public IDs/projections only. Shared
throttles expose `reserveRead({sessionId})`, `reserveAuthStart({clientIp})`;
reserve using atomic DB windows, with expiry cleanup and bounded transaction time.

- [ ] Red HTTP tests with real Nest ValidationPipe/guards: malformed/big UTF-8
      payloads, unlisted fields, denied owner, CLI/browser credential separation,
      no-stored-content leaks, idempotent202/replay409, terminal denial status and
      expiry, missing/wrong Origin/CSRF, unknown enum/revision/question ID.
- [ ] Red throttle tests for60reads/min/session and30auth starts/min/IP across two
      app instances; `Retry-After` is present and no throttle starts AI work or changes
      check status. Keep existing stricter exchange and model quota checks.
- [ ] Red log tests: OAuth query code/state, session credentials, diff, answers,
      rubrics do not reach access or application logs; unrelated route logs unchanged.
- [ ] Implement thin controllers/DTOs, no global auth/error/CORS rewrite. Redact
      only Grip auth callback request URLs in generic logger; fixed BFF never proxies
      arbitrary targets. Run focused backend/BFF tests green.
- [ ] Proposed checkpoint: `feat(grip): expose owner-only hosted check endpoints`.

### Task 8: Hosted board UI with isolated developer cache

**Files:** Create UI `components/complex/GripBoard/{GripBoard,GripBoardNode,GripBoardEdge,GripBoardQuestion,GripBoardResult}.tsx`, co-located types/styles,
`GripBoard.test.tsx` and `GripBoard.stories.tsx`; register only genuinely consumed
UI exports. Create frontend `services/api.grip.ts`, its test,
`views/dev-tools/grip/{HostedBoardPage,GripDeveloperProvider}.tsx`,
`views/dev-tools/grip/{queries,queryKeys}.ts`
with co-located component types/styles/tests; pages/layout under
`app/dev-tools/grip/boards/[checkId]/`; update both locale files/translation key type.

**Interfaces:** `GripBoard` receives public board, five draft strings, change and
submit callbacks, disabled/loading/feedback and localized labels; no API/provider
imports. `GripApi` has `session(): Promise<GripBrowserIdentity>`,
`view(checkId): Promise<GripCheckView>`, `submit(checkId,input,csrf)` and `cancel`.
Dedicated query keys include authenticated GitHub ID and check ID.

- [ ] Red RTL tests for preparation/ready/grading/pass/fail/expiry/technical states,
      five accessible fields, labels/keyboard/node-edge text alternative, 69/70 display,
      submit disabled during mutation, answer preservation on recoverable network
      failure, account switch/logout immediately clears private queries and drafts.
- [ ] Red security tests render `<script>`/HTML-looking diff and model text as text,
      no rubric/credential in DOM/serialized props, unknown account gets generic view,
      no content flicker from previous developer. Empty replies cannot submit.
- [ ] Implement using existing Una primitives/tokens and UI tier rules; sparse
      deterministic node/edge layout, no diagram library. Server params are awaited.
      TanStack Query owns API state/polling (3s while nonterminal); local state owns
      unsaved answers only. No localStorage/sessionStorage drafts or answers in URLs.
- [ ] Run focused RTL, typechecks and Storybook build; inspect in real browser and
      capture screenshot/video proof. Native OS-level browser identity tests need
      approved dev credentials; do not invent live OAuth evidence.
- [ ] Proposed checkpoint: `feat(grip): host the developer whiteboard interface`.

### Task 9: Replace native whiteboard hook with hosted lifecycle

**Files:** Create scripts `hosted-client.mjs`, `hosted-hook.mjs`, tests
`hosted-{client,hook}.test.mjs`; modify `cli.mjs`, `settings.mjs`, root commands/docs,
existing enrollment/hook tests and `.grip.toml` if it is no longer authoritative.
Remove `launcher.mjs` and native launcher tests only after every active caller is
updated; update retained legacy enrollment migration to omit unused executable
state without aliases or re-enrollment. Preserve actual gateway session behavior.

**Interfaces:** `runHostedPush({settings,manifest,fetchFn,openBrowser,signal,logger}): Promise<number>`;
HTTP client methods `createCheck`, `generateCheck`, `readCheckStatus`, `cancelCheck`
validate Task1 responses. Create request ID/timestamp once and reuse on retry.

- [ ] Red controlled HTTP tests: URL printed before awaited generation; no local
      listener/Python/native spawn; safe browser-open failure still leaves URL; one
      pending push, nonoverlap3s polling, matching pass permits0, digest mismatch1,
      failed/quota/cancel/expiry/auth1, technical outage0+UNVERIFIED and no cached pass.
- [ ] Test early or lost model operation response: recover/read existing check
      rather than dispatch duplicate generation. GET throttle waits `Retry-After`;
      POST quota denies; known denial cannot be overridden by a later network error.
      Ctrl-C returns nonzero and attempts bounded cancellation without another push.
- [ ] Test expired/invalid profile fails before any network; valid old shared
      enrollment works without executable. Existing authentic CI skip remains, but
      no local env/hook override is set or recommended by the new code.
- [ ] Implement timeout hierarchy (check30min, generation request125s,
      status10s, cancellation5s), no automatic retry after malformed contracts or
      policy mismatch; safe redirects disabled. Validate returned board URL against
      server-advertised canonical HTTPS frontend origin/config policy, not arbitrary
      model content. Preserve excluded/budget behavior from Task1.
- [ ] Run `pnpm test:grip` and real Git pre-push test with non-GitHub controlled
      remote via test dependency injection only; never weaken production destination
      validation. Proposed checkpoint: `feat(grip): wait for hosted defenses during push`.

### Task 10: End-to-end behavior and failure recovery across replicas

**Files:** Create `tests/e2e/grip-hosted.test.ts` using existing requirement-suite
conventions, `scripts/grip/tests/hosted-push.integration.test.mjs`, backend
`hosted/tests/grip-hosted-flow.postgres.spec.ts` and explicit browser harness
`tests/browser/grip-hosted.spec.ts` with documented invocation. Use installed
Playwright; no test-only auth bypass in product code.

**Interfaces:** Consume the real HTTP/UI/hook boundaries; external GitHub/Gemini
servers are controlled test fixtures, database is disposable PostgreSQL.

- [ ] Red flow: push manifest→hosted link→GitHub fixture login→valid board→five
      answers→grade70→same original push. Assert no callback listener, no rubric in
      browser, one initial/repair/grade operation intent and result digest match.
- [ ] Red recovery: two replicas handle create/read/submit; first dies after claim;
      second exposes stale-operation technical outcome; cancellation/expiry fence late
      completion; lost success response replays result without new provider request.
- [ ] Red identity/refs: switch account across tabs, revoke write access, change
      remote object ID, substitute board revision, attempt leaked URL without login,
      replay a denied old intent at clock-skew boundary. No successful push/cache reuse.
- [ ] Implement only fixes within approved contracts; scope changes return to user.
      Run requirement, PostgreSQL and browser suites green; document actual media and
      distinguish synthetic events/test OAuth from live GitHub/provider verification.
- [ ] Proposed checkpoint: `test(grip): exercise hosted push defense end to end`.

### Task 11: Cleanup job, privacy activation and schema-safe rollback

**Files:** Create backend `hosted/grip-hosted-cleanup.{service,controller}.ts`,
`grip-cleanup.guard.ts`, tests; create `scripts/grip/cleanup-hosted.mjs` and its
tests; update `docs/grip-hosted.md`, `docs/grip.md`, `docs/deployment.md`, README,
`.env.example`; add an operator-validated additive-schema/rollback test fixture
under `grip/hosted/tests/fixtures/`. No cloud resource creation in code execution.

**Interfaces:** `cleanupExpiredHostedData({now,batchSize}): Promise<GripCleanupSummary>`
deletes sensitive rows by server expiry, then check/result/tombstones at their
separate deadlines; `POST /dev-tools/grip/internal/cleanup` accepts only scheduler OIDC audience
and exact service-account email with verified token/email_verified. Use the
existing google-auth-library, no unsigned claims parsing.

- [ ] Red cleanup fixtures: normal terminal/expired/stale operations, ciphertext
      deletion, latest24h boundary, request-id+5min tombstones, invalid encryption key,
      concurrent batches and no unbounded delete. Batch100, repeat bounded batches
      until invocation120s; never return success for incomplete/outage deletion.
- [ ] Schedule every15min, set physical content purge target23h30m (30min safety
      margin); deny viewing expired content regardless of deletion. Monitor/report
      oldest content age and alert approaching24h. Document no uptime-independent
      physical-purge guarantee during outages.
- [ ] Red OIDC tests for bad issuer/audience/email/expiry/signature and absent auth;
      worker uses explicit configured endpoint and workload identity, never stored
      static bearer secret. No request bodies/answers in metrics.
- [ ] Write operator runbook gates: actual backup/PITR retention verified, encrypted
      backup access restricted, restore drill cleans before opening traffic; config
      `GRIP_HOSTED_RETENTION_VERIFIED` remains false until human records evidence.
      Backend rollback build includes hosted models/cleanup/keyring but hosted mode
      disabled. Test cold start against populated disposable schema; never use
      `PRISMA_ACCEPT_DATA_LOSS` or old schema rollback to remove tables.
- [ ] Run cleanup/unit/Postgres tests green; no production schema push, cron setup,
      OAuth callback change, secret write or deploy. Proposed checkpoint:
      `feat(grip): enforce hosted content retention and rollback gates`.

### Task 12: Whole-branch verification, review and stacked publication handoff

**Files:** Update operational docs with actual commands/config/media; update this
plan's checkboxes and verification ledger; no unrelated cleanup.

**Interfaces:** Compare all acceptance items to actual diff/test evidence and
parent branch, not just green tests. New PR is one coherent hosted feature on #339.

- [ ] Run `pnpm lint`, `pnpm lint:style`, `pnpm typecheck --force`,
      `pnpm test --force`, `pnpm build --force`, `pnpm test:grip`, `pnpm test:e2e`,
      `pnpm --filter @universe/backend test:cov`, UI Storybook, dedicated disposable
      PostgreSQL and browser suites; changed-file Prettier, skills/gemini checks and
      diff whitespace. Report every warning/failure/unrun command honestly.
- [ ] Inspect security checklist, strict DTOs, no secret/log leak, i18n/UI tiers,
      question/rubric projections, terminal transitions, byte limits and status allowlists.
      Use doubt-driven review for new auth/session/persistence logic and a final fresh
      branch review through available skills; offer cross-model choice as required.
- [ ] Do not claim availability/backup/deployment verification from unit tests.
      Obtain real task code/Notion link, human review of written plan/diff and explicit
      publication approval. Recheck parent PR state before pushing/opening the child;
      if #339 merged, ask whether to retarget rather than silently changing the stack.
- [ ] Publish only with ordinary `git push` through existing Grip, keeping the one
      original process waiting for human answers. No `gh stack submit/sync`, force
      push, no-verify, duplicate push or automated whiteboard answers. Use the repo PR
      template, parent link, actual screenshots/video and remaining activation gates.
- [ ] Human deployment/OAuth/scheduler/backup evidence is a separate handoff.

## Plan self-review and next gate

Spec coverage: Tasks1/9 cover exact push binding and CLI, Task2 failure provenance,
Tasks3/4 durable encrypted state, Task5 GitHub auth, Tasks6/7 board/model/API policy,
Task8 hosted UI, Task10 integration, Task11 retention/rollout, Task12 verification.
Each Review Focus condition has behavioral evidence in its owning task.

No implementation step is marked complete. Exact task-internal names/DTO fields
must remain consistent with the shared interfaces; a discovered incompatible
requirement returns to the approval gate rather than weakening checks. The
retention scope is approved, but backup configuration evidence, real ticket
metadata and publication/deployment actions are not supplied by that approval.

Next: the user reviews this written plan and chooses native execution (one session,
whole-branch independent review) or subagent-driven execution (per-task implementer
and reviewer), acknowledging the unavailable execution-skill adapters above.
