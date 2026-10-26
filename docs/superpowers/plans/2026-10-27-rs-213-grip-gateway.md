# Team Grip Gateway Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. If those skills are unavailable in the harness, use its native task execution with the same gates; never claim to have loaded an unavailable skill.

**Goal:** Replace Sphinx in PR #285 with optional local Grip whiteboards backed by an authenticated, quota-limited team Gemini gateway.

**Architecture:** Keep questionnaires and Git waiting locally. An isolated NestJS feature authenticates collaborators using GitHub, issues hashed gateway sessions and proxies bounded Chat Completions requests to Gemini; PostgreSQL coordinates sessions, quotas and concurrency across replicas. Existing portal authentication, business logic and pre-commit behavior remain unchanged.

**Tech Stack:** NestJS 12, strict TypeScript, Prisma/PostgreSQL, Node.js built-in fetch/crypto/test, Husky 9.1.7, Python 3.11+, external `grip-hook==0.5.0`, GitHub OAuth device flow, Gemini OpenAI-compatible API.

**Spec:** `docs/superpowers/specs/2026-10-27-rs-213-grip-gateway-design.md` (approved for planning on 2026-10-27).

## Global Constraints

- Work in existing `chore/RS-213-sphinx-browser-push`, PR #285; do not create a fork or replace user changes. Spec commit: `62d3a5e`.
- Only GitHub writers/admins of `Karazin-UniVerse/uni-verse` qualify; maintain maps to write. Student JWTs do not qualify.
- Request no GitHub repository write scope. The server permission-check credential is separate and repository-scoped with Administration read access.
- Gateway tokens: 32 random bytes, SHA-256 digest only in storage, 30-day expiration, individually revocable.
- Model: `gemini-3.5-flash-lite` only; no fallback. Limits: 256 KiB request before parsing, two text messages/200,000 combined UTF-8 bytes, 32 KiB schema, 8192 output tokens, 2 MiB upstream response and 60-second upstream deadline.
- Completion quotas: 10/minute and 100/UTC day per numeric GitHub ID, 500/UTC day globally, two global concurrent calls. Failed admitted requests consume quota; network work never holds a DB transaction.
- Session exchange quotas: five/minute per source IP and 100/minute globally. All reservations/leases must coordinate across instances.
- Disabled gateway: 404. Enabled but misconfigured/unavailable dependency: sanitized failure, no portal startup failure or external startup calls.
- No persisted/logged code, rubrics, answers, raw upstream errors, authorization headers or keys. Existing portal behavior and its 10 MiB parser limit stay unchanged.
- Optional explicit local enrollment; after enrollment fail closed on missing executable/token/gateway. No global hooks, agent config edits or fake-provider production fallback.
- Passing Grip immediately releases the same push; no separate Continue/Stop. No duplicate pushes, automatic retries or automated human answers.
- Real GitHub app creation, secrets provisioning, paid requests and production deployment are separate human operations, not authorized by this plan.

## Review Focus

1. Username rename/reassignment or spoofed login: authorize numeric identity, never let a new owner of an old username inherit a session (Task 3 tests).
2. Two replicas at a UTC boundary, a killed worker, or multiple tokens for one user: quotas remain bounded and expired leases recover (Task 2 PostgreSQL tests).
3. Chunked oversized bodies, slow oversized responses and client disconnect during grading: enforce limits and release leases without disturbing portal routes (Tasks 4–5 tests).
4. Public repo readers, portal bearer tokens, disabled/misconfigured module: no accidental Gemini access or student API regression (Tasks 3 and 5 HTTP tests).
5. Windows paths/spaces, stale credentials, generated Husky wrappers and CI flags: preserve Git stdin/arguments, fail closed after opt-in, never run a second push (Tasks 6–7 fixtures).

## File map and boundaries

- `packages/backend/grip/`: feature-only constants/types/config, GitHub/Gemini injectable clients, session/quota services, auth guard, controller/module, DTO validation and colocated `*.spec.ts`.
- `packages/backend/prisma/schema.prisma`: independent Grip session/bucket/lease tables; no student-user relationship.
- `packages/core/types/grip.ts`: only HTTP contracts consumed by backend and local tooling; no barrel exports or provider secrets.
- `packages/backend/utils/body-parsers.ts`: reusable bootstrap parser registration so HTTP tests exercise production limits.
- `scripts/grip/`: local settings, device login, executable launching and command runner; no application runtime dependency.
- `scripts/tests/grip*.test.mjs`: Node behavior tests, isolated fake HTTP/executable/Git fixtures.
- `.husky/pre-push`, `.grip.toml`, `.env.example`, root `package.json`, `docs/grip.md`, `README.md`, `docs/ai/workflow.md`: enrollment and operational integration.
- Remove `.sphinxconfig`, `.sphinxcontext.md`, `.sphinxignore`, `docs/sphinx.md`; regenerate `GEMINI.md`, never hand-edit it. Preserve historical specs/plans.

---

### Task 1: Define the disabled-safe gateway contract and request validation

**Files:** Create `packages/core/types/grip.ts`; `packages/backend/grip/grip.constants.ts`, `grip.types.ts`, `grip.config.ts`, `grip.config.spec.ts`, `grip.helpers.ts`, `grip.helpers.spec.ts`, `dto/completion.dto.ts`. Modify `.env.example`.

**Interfaces:** `getGripConfig(env: NodeJS.ProcessEnv): GripConfig | null` returns null only when disabled and throws a sanitized availability exception for incomplete enabled settings. `validateGripCompletion(value: unknown): GripCompletionRequest` validates the supported Grip envelope; untrusted external JSON justifies unknown here. `GripSessionResponse = { token: string; expiresAt: string }`; `GripCompletionResponse` contains choices and optional usage only. Types live in the named type modules.

- [x] Write tests named `disabled needs no secrets`, `enabled incomplete config fails without exposing values`, `valid Grip Board and GradeSheet envelopes survive validation`, `rejects extra fields/multimodal/tools/streaming/schema size/message bytes`. Derive envelope fixtures from installed Grip 0.5.0 Pydantic schemas, never private quiz state. Assert the exact byte boundaries from Global Constraints and rejection of non-JSON-schema response formats.
- [x] Run `pnpm --filter @universe/backend test --runInBand --runTestsByPath grip/grip.config.spec.ts grip/grip.helpers.spec.ts`; observe RED for missing implementation.
- [x] Implement those interfaces. Add server-only `GRIP_GATEWAY_ENABLED=false`, `GEMINI_API_KEY`, `GRIP_GEMINI_MODEL`, `GRIP_GEMINI_BASE_URL`, `GRIP_GITHUB_API_URL`, `GRIP_GITHUB_OAUTH_CLIENT_ID`, `GRIP_GITHUB_PERMISSION_TOKEN`, `GRIP_GITHUB_OWNER`, `GRIP_GITHUB_REPOSITORY`, `GRIP_TRUSTED_PROXY_ADDRESSES` to the existing `.env.example`. Supply documented non-secret URL/model/repo example values; blank secrets remain blank. No fallback secret/host/model values in code. Reject invalid protocols, embedded URL credentials and invalid enabled configuration; HTTP is allowed only on loopback development fixtures.
- [x] Require exactly system then user text messages and `response_format.type=json_schema` with bounded `json_schema.name` and object schema. Accept Grip's nested schema keywords rather than stripping them using the global whitelist pipe. Use a route-local strict pipe with DTO top-level validation and helper checks. Unknown nested request-controlled transport settings must not reach fetch.
- [x] Run the tests GREEN, root lint/typecheck and changed-file Prettier. Commit `feat: define restricted Grip gateway contracts`.

### Task 2: Add durable session storage, quotas and concurrency leases

**Files:** Modify `packages/backend/prisma/schema.prisma`; create `packages/backend/grip/grip-storage.service.ts`, `grip-storage.service.spec.ts`, `grip-quota.service.ts`, `grip-quota.service.spec.ts`, `grip-quota.integration.spec.ts`, `packages/backend/test/jest-grip-postgres.json`; modify `packages/backend/package.json` for an explicit PostgreSQL integration command. Read `prisma-patterns` before implementing.

**Interfaces:** `GripStorageService.createSession({ tokenHash, githubId, githubLogin, expiresAt }): Promise<GripStoredSession>`; `findSession(tokenHash: string): Promise<GripStoredSession | null>`; `revokeSession(id: string): Promise<void>`. `GripQuotaService.reserveSessionExchange(ip: string): Promise<void>`; `reserveCompletion(githubId: string): Promise<{ leaseId: string }>`; `releaseCompletion(leaseId: string): Promise<void>`.

- [ ] Define independent models: `GripSession` (UUID id, unique tokenHash, githubId/login, createdAt/expiresAt/revokedAt); `GripQuotaBucket` (key primary key, windowEndsAt, count); `GripLease` (UUID id, expiresAt). Index expiration columns. Use strings for GitHub numeric IDs at boundaries and storage so JSON never serializes BigInt. No raw token column or new relation to portal User.
- [ ] Write unit tests for expired/revoked lookup, UTC windows, user identity shared across tokens, 11th minute/101st user-day/501st global-day rejection, third concurrent-call rejection and idempotent release. Assert failures consume no partially committed bucket updates when admission fails.
- [ ] Run focused Jest RED. Implement short serializable transactions with a single fixed PostgreSQL transaction advisory lock for admissions, exact named bucket keys/window timestamps, and bounded serialization retries for P2034 only. Purge expired buckets/leases during admission; lease TTL is 90 seconds, exceeding the 60-second network deadline. Never wrap GitHub/Gemini fetch in a transaction.
- [ ] Add integration tests against an explicitly provided disposable `GRIP_TEST_DATABASE_URL`, using two service/client instances and real PostgreSQL: concurrent admissions never exceed limits; two live leases only; an expired lease is reclaimable; one user with multiple sessions shares counts. The command must error when its dedicated database is absent, not silently skip and claim coverage; never target production or the developer's normal database. Default unit runs mock storage, not a live DB.
- [ ] Add `test:grip:postgres` invoking the existing Jest binary with `--config ./test/jest-grip-postgres.json --runInBand`; its rootDir is `..`, it retains the package's ts-jest/moduleNameMapper options and selects only `grip/grip-quota.integration.spec.ts`. Exclude that exact file from the default Jest config, not the HTTP/unit tests. Document `pnpm --filter @universe/backend test:grip:postgres` and require it explicitly in verification; missing DB is a failed dedicated gate, never a hidden skipped test.
- [ ] Generate Prisma client, run unit tests GREEN, then the dedicated PostgreSQL suite. Record missing disposable DB as a blocker to the production concurrency claim. Follow existing additive `db push` workflow rather than inventing a migration-history system; never run destructive push flags.
- [ ] Run backend typecheck/lint; commit `feat: persist Grip sessions and shared usage reservations`.

### Task 3: Authenticate GitHub writers and issue revocable gateway sessions

**Files:** Create `packages/backend/grip/github-client.service.ts`, `github-client.service.spec.ts`, `grip-session.service.ts`, `grip-session.service.spec.ts`, `grip.guard.ts`, `grip.guard.spec.ts`; extend `grip.types.ts` as needed without duplicating contracts.

**Interfaces:** `GithubClientService.identify(accessToken: string): Promise<GripIdentity>`; `assertWriter(identity: GripIdentity): Promise<void>`. `GripIdentity = { githubId: string; login: string }`. `GripSessionService.exchange(githubToken: string): Promise<GripSessionResponse>`; `authenticate(token: string): Promise<GripPrincipal>`; `revoke(token: string): Promise<void>`. Guard places `GripPrincipal` on a typed request property, not the portal `user` property.

- [ ] Write RED tests for missing/malformed credentials, GitHub 401/403/404/429/network failures, public read/triage denial, write/admin acceptance, numeric identity mismatch, token expiry/revocation, and unrelated portal JWT denial. Assert only a digest is stored and the raw generated token is returned once. A renamed login either re-resolves the same numeric identity safely or requires re-enrollment; a reused old login with a different ID is always rejected.
- [ ] Implement injectable GitHub HTTP client with explicit timeouts, bounded response sizes and redirect rejection. `/user` uses the user token; the permission endpoint uses only server `GRIP_GITHUB_PERMISSION_TOKEN`. Require permission response `user.id` to match the stored/authenticated ID and base permission write/admin; never accept only a login or HTTP 200. Do not store GitHub user tokens or expose raw errors.
- [ ] Implement 30-day session exchange and digest lookup with `randomBytes(32)`, an unambiguous `ugr_` token prefix and base64url payload, SHA-256 hashing and exact token-format validation. Authenticate and recheck repository permission on every model request. Revocation is idempotent for the current valid token and does not depend on continued repo access.
- [ ] Run focused tests GREEN plus backend typecheck; commit `feat: authenticate Grip gateway users through GitHub`.

### Task 4: Proxy bounded Gemini completions without leaking payloads

**Files:** Create `packages/backend/grip/gemini-client.service.ts`, `gemini-client.service.spec.ts`, `grip.service.ts`, `grip.service.spec.ts`.

**Interfaces:** `GeminiClientService.complete(request: GripCompletionRequest, signal: AbortSignal): Promise<GripCompletionResponse>`; `GripService.complete({ principal, request, signal }): Promise<GripCompletionResponse>` uses a named parameter type in `grip.types.ts`.

- [ ] Write RED tests using a loopback HTTP fixture or mocked transport at the actual HTTP boundary: exact fixed host/model, Authorization substitution (no gateway/GitHub token upstream), 8192 output cap, redirects rejected, 60-second deadline, 2 MiB streaming read cap, malformed choices/content/usage rejected. Assert 429/504/502/503 mapping and absence of secret/provider body text in thrown messages.
- [ ] Implement the Gemini HTTP client against the configured OpenAI-compatible URL, forcing the model and max output tokens rather than forwarding arbitrary request fields. Return one bounded textual completion and nonnegative safe-integer usage fields only; never echo other upstream properties. Avoid logging prompts or raw exceptions. No retries or alternate model on quota/transport failure.
- [ ] Implement the coordinator: acquire a per-user/global reservation and lease before Gemini; always release in finally, including abort/provider errors; fail closed on DB/GitHub outage. Confirm session exchange and quota failures never call Gemini. Ensure disconnect cancellation is passed through, not replaced by a timeout-only signal.
- [ ] Run tests GREEN, backend lint/typecheck and changed-file format; commit `feat: proxy quota-limited Grip requests to Gemini`.

### Task 5: Expose protected routes with production parser behavior

**Files:** Create `packages/backend/grip/grip.controller.ts`, `grip.controller.spec.ts`, `grip.module.ts`, `grip-http.spec.ts`, `grip.decorators.ts`; `packages/backend/utils/body-parsers.ts`, `body-parsers.spec.ts`. Modify `packages/backend/main.ts`, `app.module.ts`; add a direct `proxy-addr` runtime dependency and its types only if no existing direct library provides trusted-hop parsing.

**Interfaces:** routes `POST /dev-tools/grip/sessions`, `DELETE /dev-tools/grip/sessions/current` and `POST /dev-tools/grip/v1/chat/completions`. `configureBodyParsers(app: NestExpressApplication): void` registers the feature-only 256 KiB parser before existing 10 MiB JSON/urlencoded parsers and ensures the small parser cannot be bypassed by media type. Feature-local source-IP resolution trusts only configured proxy addresses, not arbitrary X-Forwarded-For.

- [ ] Write RED HTTP tests with real Nest/Express parsing, real global `AtGuard` and global ValidationPipe, mocking only external GitHub/Gemini and durable storage. Test disabled 404, enabled misconfiguration 503, valid writer 200, missing/revoked/expired/portal-only token 401 and reader 403. Explicitly register feature guard after `@Public()` so portal auth exemption never means unauthenticated model access.
- [ ] Test oversized Content-Length and chunked bodies, invalid JSON/content type, UTF-8 boundaries, spoofed X-Forwarded-For from an untrusted peer, exchange quotas and client socket disconnect during generation. A separate ordinary portal fixture route must still accept JSON below its existing 10 MiB limit and retain the normal JWT guard. No global trust-proxy or validation-policy change for student routes.
- [ ] Implement thin Swagger-documented controllers and feature guards. Session exchange is rate-limited before GitHub lookup; completion delegates once to the service. Return tokens with Cache-Control no-store, never in URLs. Wire abort using request-aborted/response-close events and remove listeners after completion. Do not log bearer-bearing URLs or payloads; existing morgan only sees sanitized method/path/status for these fixed routes.
- [ ] Keep HTTP tests in `grip-http.spec.ts` so the existing backend CI Jest pattern includes them; do not rely solely on currently non-gating `test/*.e2e-spec.ts`.
- [ ] Run focused tests GREEN and backend full tests/typecheck/build. Commit `feat: expose authenticated developer Grip endpoints`.

### Task 6: Add cross-platform local enrollment and wrapper commands

**Files:** Create `scripts/grip/cli.mjs`, `settings.mjs`, `device-login.mjs`, `launcher.mjs`; tests `scripts/tests/grip-settings.test.mjs`, `grip-login.test.mjs`, `grip-launcher.test.mjs`. Modify root `package.json` scripts.

**Interfaces:** `pnpm grip:setup --gateway <https-origin> --client-id <public-id> --executable <absolute-grip-path>` enrolls; `pnpm grip:remove` revokes/removes local enrollment; `node scripts/grip/cli.mjs hook pre-push ...` runs the hook. Helpers: `loadSettings(): Promise<GripLocalSettings | null>`, `saveSettings(settings): Promise<void>`, `loginDevice({ clientId, signal }): Promise<string>`, `runGripHook({ args, settings, signal }): Promise<number>`. JSDoc named types keep these plain Node scripts typed without importing TypeScript at runtime.

- [ ] Write RED Node tests for HTTPS/explicit loopback URLs, user-info/query/fragment and foreign-path rejection, unavailable/expired tokens, atomic settings save, no secret output or argv, denied/expired device login, polling intervals/slow_down, interruption, explicit account identity and revoke/remove behavior. All tests use isolated user directories and fake HTTP servers; never real OAuth or model calls.
- [ ] Store one per-checkout enrollment under the user's app-config directory, keyed by SHA-256 of canonical repository root, so this PR does not enable hooks unexpectedly in other branches/worktrees. Version settings and include gateway origin, client ID, token, expiration and executable path. Refuse symlinked settings/parents where supported; create private directories/files (0700/0600 POSIX), document Windows ACL inheritance. No shell profile, Git credential/global config or application .env mutation.
- [ ] Implement device flow using fixed GitHub HTTPS endpoints and no repository scope; respect server interval, increase on slow_down and stop on denial/expiry. Send OAuth token only in Authorization to the explicitly selected gateway's session endpoint; persist only the issued gateway token. Public client ID and gateway URL are operator-provided args, not inferred production addresses.
- [ ] Document how the existing backend command loads environment files from its working directory: supply local secrets using an explicit private runtime environment, rather than assuming the root `.env` is loaded by a package-scoped command. Do not add a second `.env` example or silently copy secrets between directories.
- [ ] Launch absolute installed Grip 0.5.0 executable with `spawn(..., { shell: false, stdio: 'inherit' })`, preserving pre-push stdin and args. Resolve/verify the executable during setup and check version; on Windows use the real .exe, not a .cmd shim. Populate only the child's GRIP_PROVIDER/MODEL/BASE_URL/API_KEY_ENV and dedicated gateway bearer env; never set GEMINI_API_KEY on collaborators' computers. Fail locally before starting Grip if enabled settings are corrupt, expired or executable missing. Document that upstream caches/skip environment variables can bypass a learning check.
- [ ] Add scripts `grip:setup`, `grip:remove`, `grip:status`, `test:grip` (use explicit Node test file glob consistent with Node floor). Status prints enrollment state and expiry, never tokens. `grip:remove` keeps settings if remote revocation fails, with actionable recovery rather than claiming success.
- [ ] Run Node tests GREEN on Windows plus root lint/typecheck and formatting; commit `feat: add personal Grip gateway enrollment`.

### Task 7: Replace Sphinx with optional Husky Grip integration

**Files:** Create `.grip.toml`, `.husky/pre-push`, `scripts/tests/grip-hook.test.mjs`, `docs/grip.md`. Delete `.sphinxconfig`, `.sphinxcontext.md`, `.sphinxignore`, `docs/sphinx.md`. Modify `README.md`, `docs/ai/workflow.md`; regenerate `GEMINI.md`.

**Interfaces:** `.husky/pre-push` delegates to `node scripts/grip/cli.mjs hook pre-push "$@"`; Task 6 returns exit 0 with a setup notice only when enrollment is absent (or documented CI skip), otherwise mirrors Grip exit/signal without replaying Git. Existing `.husky/pre-commit` is untouched.

- [ ] Write RED tests running real temporary Git repositories/local bare remotes and real installed Husky 9.1.7: unconfigured enrollment does not install or call a model; configured wrapper forwards refs/remote arguments; earlier rejection is retained; failed quiz blocks remote update; cached pass works; taskkill/Unix cancellation before answers requires reattempt; changing branch/worktree does not read another enrollment. Reinstall Husky and prove the developer-owned hook still runs. Add a test where an environment that explicitly marks CI skips without starting an interview.
- [ ] Use a fixture executable/loopback fake reviewer for normal automated tests; optionally run the external real Grip 0.5.0 fake-provider integration separately. Never submit automated answers to the user's real provider questionnaire, inspect private assessment files, or publish local questionnaire URLs.
- [ ] Implement TOML whiteboard/70/24-hour pass policy. Copy upstream default generated exclusions, append Sphinx-equivalent local/generated exclusions plus .env variants and credential/key paths. Do not silently skip docs-only operational changes that need review; explain unavoidable Grip trivial-diff handling. Keep provider/base URL/token personal through the wrapper rather than exposing a shared credential.
- [ ] Document Python/Grip installation, setup/GitHub permissions, once-only login, local vs production server configuration, free-tier data use, exclusion limits, non-interactive/SSH limitation, immediate continuation after passing, host timeout recovery, uninstall and troubleshooting. Prohibit `grip init`, `grip agents` and `grip install --append` for this Husky setup. Document the local optional policy rather than silently making every teammate enroll.
- [ ] Run `pnpm test:grip`, `pnpm gemini:sync`, `pnpm gemini:check`, `pnpm skills:check`, format changed files. Commit `chore: replace Sphinx with optional Grip push checks`.

### Task 8: Whole-branch verification, local human push and PR handoff

**Files:** Update `docs/grip.md` verification/deployment section if needed; update PR #285 metadata through GitHub, not a new repository template. Preserve RS-213 Notion link.

**Interfaces:** consumes the completed gateway, configured local environment and user-owned GitHub registration. Produces a tested PR, actual verification evidence, and a clear deployment prerequisite list; does not deploy production.

- [ ] Independently review the branch against the spec, especially authentication routes, quotas, disconnects and secrets. Run `pnpm lint`, `pnpm lint:style`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm test:grip`, dedicated disposable-PostgreSQL tests, `pnpm gemini:check`, `pnpm skills:check` and Prettier on changed files. Investigate regressions; record every remaining failed check honestly. Do not disable existing tests/coverage to create a green result.
- [ ] Ask the coordinator to create/approve the dedicated device-enabled GitHub OAuth app, supply the repository-scoped permission-check credential, and confirm Gemini free-tier data handling. Put secrets only into private runtime environment; do not inspect or print them. These prerequisites block live gateway authentication if absent, not synthetic automated tests.
- [ ] Start the actual local backend with loopback config, real test database and feature enabled. Have the user enroll once. Run a bounded synthetic model request through the gateway first; after explicit permission for actual committed source, start one background `git push origin chore/RS-213-sphinx-browser-push` through the normal hook, preserving the waiting process. Tell the user the browser is ready, never open/answer/read the real questionnaire on their behalf, and do not retry on Stop/timeout without a new request. For a legitimate empty push do not manufacture commits or force an already-pushed branch.
- [ ] Verify the original process exit and compare local HEAD to the remote branch only after it completes. If credentials/browser/editor prerequisites are missing, leave the real smoke test marked unperformed; do not bypass the hook just to publish.
- [ ] Update PR #285 title to `RS-213: add Grip browser push checks and team Gemini gateway`. Fill existing template sections: original Notion task; replacement and access design; real/synthetic test evidence; manual OAuth/secrets/deployment steps; immediate-after-pass and SSH caveats; appropriate feat/chore selections; self-review checkbox only when performed. Screenshot only sanitized synthetic whiteboard UI if helpful, never real answers/tokens.
- [ ] Keep deployment separate: production gateway remains disabled until the operator provisions DB schema, secrets, GitHub app/permission credential, trusted proxy addresses and deploys the new backend. Record that develop merge alone neither enables it nor enrolls collaborators.
- [ ] Commit final factual docs updates, if any, with `docs: record Grip gateway verification and rollout`. No unverified completion claim.

## Plan self-review and handoff

- Spec coverage: identity/session access (Task 3), durable state/admission (Task 2), model limits (Tasks 1/4/5), local workflow (Tasks 6/7), privacy/deployment/human check/PR template (Tasks 7/8).
- No student auth bypass, production deployment, shared Gemini secret distribution or automatic real quiz answering is planned.
- This is one coupled delivery plan: the client depends on the new session and completion contracts. Task commits are review boundaries inside PR #285, not additional independent products.
- This written plan must be reviewed and an execution approach selected before product-code changes begin.
