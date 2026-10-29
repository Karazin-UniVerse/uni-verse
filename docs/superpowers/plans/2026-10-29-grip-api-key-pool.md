# Grip Gemini API Key Pool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Balance Grip model requests across server-side Gemini keys and retry a transient failure once with another eligible key.

**Architecture:** Keep the existing gateway protocol, quotas, model, endpoint, and transport service. A module-local stateful key pool selects and reserves keys; the existing client owns bounded sequential attempts, cancellation, sanitization, and logging. The local launcher only gains secret-environment filtering.

**Tech Stack:** TypeScript 6, NestJS 12, native fetch/AbortSignal, Jest 30, Node test runner, pnpm/Turborepo.

**Spec:** `docs/superpowers/specs/2026-10-29-grip-api-key-pool-design.md`

## Global Constraints

- One canonical `GEMINI_API_KEYS` comma-separated list; no legacy fallback.
- At most two sequential upstream attempts per logical completion; never hedge or send parallel duplicate requests. Never retry with the same key.
- Both attempts, response reads, and backoff share the existing 60-second deadline created once per logical completion.
- Retry only network/response-read transport failures and upstream HTTP 429, 500, 502, 503, and 504.
- Transport/retryable 5xx cooldown: 30 seconds. HTTP 429 cooldown: minimum 60 seconds, honoring longer valid `Retry-After`. HTTP 401/403 cooldown: 60 seconds, with no current-request retry.
- Before failover, use an abortable 250 ms backoff. Recheck eligibility after the wait.
- Preserve team quotas, max two concurrent logical completions, authorization, response contracts, payload/output limits, and the fixed endpoint/model policy.
- Logs contain only key slot, attempt, original HTTP status if available, elapsed time, fixed outcome, and failover decision; no secrets or request/response bodies.
- Pool state is process-local; no schema changes, new dependencies, production deployment, secret edits, or automated human assessment.
- Work in `feature/grip-api-key-pool`, based on `origin/develop`; PR targets `develop` and must describe the environment migration and actual verification evidence.

## Review Focus

- A longer concurrent cooldown must not be shortened by a later failure: Task 2 tests `Math.max` timestamp behavior.
- A fallback candidate can cool down during backoff: Task 3 tests re-selection and no dispatch when none remains.
- Huge/malformed `Retry-After` must not produce invalid/infinite timestamps: Task 2 tests invalid values and bounded finite arithmetic.
- A response read can stall after headers even though fetch resolved: Task 3 tests body cancellation and reservation release on abort/deadline.
- The new secret pool might be inherited by a local Grip subprocess: Task 1 seeds both secret names and verifies neither reaches spawn.

---

### Task 1: Canonical key-list configuration and secret hygiene

**Files:** Modify `.env.example`, `docs/grip.md`, `packages/backend/grip/grip.config.ts`, `packages/backend/grip/grip.types.ts`, `packages/backend/grip/gemini-client.service.ts`, `packages/backend/grip/tests/{grip.config,gemini-client.service,github-client.service,grip.controller,grip-http}.spec.ts`, `scripts/grip/launcher.mjs`, and `scripts/grip/tests/launcher.test.mjs`.

**Interfaces:** `GripConfig.geminiApiKeys: string[]` replaces `geminiApiKey`. `getGripConfig(env: NodeJS.ProcessEnv): GripConfig | null` stays the entry point. `runGripHook` retains its existing signature and gateway token behavior.

- [ ] Write config tests with these assertions:
      `getGripConfig({...validEnv, GEMINI_API_KEYS: ' first-key , second-key '})?.geminiApiKeys` equals `['first-key', 'second-key']`;
      a single key yields a one-element array;
      missing/blank, `first-key,`, `,first-key`, duplicate, and embedded-whitespace lists throw `GripConfigException` without the sentinel values;
      legacy-only config throws; disabled gateway with malformed key-list config returns null.
- [ ] Extend the launcher test to set both `process.env.GEMINI_API_KEYS` and `process.env.GEMINI_API_KEY`, restore them with `try/finally`, and assert both child-env fields are undefined while the gateway bearer remains correct.
- [ ] Run the new config and launcher tests; expect RED for missing parsed array and inherited pool value. Use `pnpm --filter @universe/backend test --runInBand --runTestsByPath grip/tests/grip.config.spec.ts` and `pnpm test:grip`.
- [ ] Implement key-list validation and migrate all active config fixtures. Until Task 3, use the first configured key for transport so this task is independently functional. Strip the pool variable from the child environment, retaining old-secret stripping.
- [ ] Update `.env.example` and `docs/grip.md`: canonical list syntax with placeholder values, separate-project quota limitations, migration order (add new list before deploying, remove old variable after rollout), restart requirement, rollback, and no client-side keys. Never inspect private env files.
- [ ] Run both test commands again; expect GREEN. Search active source/docs for old config consumers; historical plans/specs and explicit legacy-rejection/secret-stripping tests are intentional exceptions.
- [ ] Format changed files and commit `feat: configure Grip server-side Gemini key pool`.

### Task 2: Least-active reservation and cooldown state

**Files:** Create `packages/backend/grip/gemini-key-pool.ts` and `packages/backend/grip/tests/gemini-key-pool.spec.ts`; modify `packages/backend/grip/grip.types.ts` and `packages/backend/grip/grip.constants.ts`.

**Interfaces:** Export module-local `GeminiKeyPool`, constructed with `constructor(apiKeys: readonly string[])`. Methods: `reserve(excludedSlots: ReadonlySet<number>): GeminiKeyReservation | undefined`, `hasAvailable(excludedSlots: ReadonlySet<number>): boolean`, `release(slot: number): void`, and `coolDown({slot, status, retryAfter}: GeminiKeyCooldownParams): void`. Define `GeminiKeyReservation {slot: number; apiKey: string}`, `GeminiKeyCooldownParams {slot: number; status?: number; retryAfter?: string | null}` in `grip.types.ts`. Slots are zero-based internally; logged slots are one-based. Use `Date.now()` for timestamps and mock it in tests.

- [ ] Write failing tests: reserve/release healthy keys rotates `[0,1,0,1]`; holding slot 0 while repeatedly reserving/releasing slot 1 keeps choosing 1; exclusions and cooldowns are respected; all-cooled yields undefined; releasing all reservations restores balanced rotation.
- [ ] Add cooldown tests: transport and HTTP 503 skip slot until 30,000 ms; HTTP 429 and 401/403 until at least 60,000 ms; longer delta-seconds/date extends cooldown; invalid, negative, past, or overflowing values never create NaN/Infinity and use the minimum when unrepresentable. A short concurrent cooldown never shortens an existing long cooldown.
- [ ] Run `pnpm --filter @universe/backend test --runInBand --runTestsByPath grip/tests/gemini-key-pool.spec.ts`; expect RED because the pool module does not exist.
- [ ] Implement synchronous least-active selection scanning from a rotating cursor. Store per-slot active counts and available-after times; reserve before returning, release deterministically, and extend cooldown using the later timestamp. Parse `Retry-After` as finite nonnegative delta-seconds or an HTTP date; reject arithmetic outside safe integer timestamps. Use named cooldown/attempt/backoff constants, not new env knobs.
- [ ] Re-run the focused test; expect GREEN. Format and commit `feat: balance Grip keys with temporary cooldowns`.

### Task 3: Bounded failover and safe upstream diagnostics

**Files:** Modify `packages/backend/grip/gemini-client.service.ts`, `packages/backend/grip/grip.types.ts`, `packages/backend/grip/tests/gemini-client.service.spec.ts`, and `packages/backend/grip/tests/grip.service.spec.ts`; create `packages/backend/grip/gemini-response.helpers.ts` if needed to move the existing response parsing/read helpers out without changing their behavior.

**Interfaces:** Preserve `GeminiClientService.complete(request: GripCompletionRequest, signal?: AbortSignal): Promise<GripCompletionResponse>`. Initialize one `GeminiKeyPool` per service instance after resolving config. Use an internal `GeminiAttemptFailure` with fields `exception: HttpException`, `retryable: boolean`, `outcome: GeminiAttemptOutcome`, and optional `status: number`, `retryAfter: string | null`. Fixed outcome union: `http_error | network_error | read_error | invalid_response | timeout | cancelled`. This internal failure is never returned or logged verbatim. Retain `GripService.complete` and its single quota reservation.

- [ ] Extend client tests with multiple sentinel keys. Each of HTTP `[429,500,502,503,504]`, fetch rejection, and body-read transport rejection must yield success from slot 2, exactly two fetch calls, distinct bearer headers, identical payload/URL, and original upstream status in safe diagnostics.
- [ ] Add negative tests: one key, all-cooled pool, failed second attempt with a third key present, and statuses `[400,401,403,404]` must not dispatch unexpected extra requests. Malformed JSON/choices and oversized responses remain non-retryable. A second failure keeps its mapped public exception.
- [ ] Add deterministic concurrent/deferred tests: overlapping requests select least-active keys; reservations recover after every success/failure/abort; a different completion can cool down the fallback during the 250 ms delay, preventing dispatch. Verify unread non-success bodies are cancelled.
- [ ] Add deadline tests using a controlled `AbortSignal.timeout` implementation with fake timers: fail first attempt at 59,000 ms, start fallback after 250 ms, then assert it aborts at total 60,000 ms rather than at 119,250 ms. A fully exhausted deadline causes no fallback. Avoid awaiting an unobserved rejecting promise while advancing clocks.
- [ ] Add cancellation tests for pre-aborted caller, abort during fetch, pending body read, and backoff; assert no further fetch and released reservations. Test a late success after abort cannot become an accepted completion. Use an abort-aware stream fixture and explicitly cancel its reader during abort.
- [ ] Spy on Nest logger methods and assert serialized calls contain none of the key, prompt, provider-body, or raw-error sentinels. Assert structured fields identify key slot/attempt/status/elapsed/outcome/failover without changing the public response.
- [ ] Add a `GripService` test using the real multi-key client and mocked quota service: first fetch 503, second succeeds, `reserveCompletion` and `releaseCompletion` each called once. Keep existing quota-denied and cancelled-during-reservation tests unchanged.
- [ ] Run `pnpm --filter @universe/backend test --runInBand --runTestsByPath grip/tests/gemini-client.service.spec.ts grip/tests/grip.service.spec.ts`; expect RED for missing second call/diagnostics/cancellation behavior.
- [ ] Implement typed failure classification from original HTTP status and transport phase, preserving public error messages. Cancel non-success bodies without reading/logging their contents. Map malformed/oversize responses as non-retryable. Apply cooldown to failures even on the final attempt, and to 401/403 without retrying them.
- [ ] Implement the two-attempt loop: create one deadline, combine caller signal, reserve eligible key synchronously, invoke fetch/read/parse, log only allowlisted fields, and release in `finally`. Before fallback check untried availability, wait 250 ms with an abortable Node timer, recheck signals and reserve anew. Use the same combined signal for both attempts. Explicitly abort/cancel pending reader work and clean listeners in `finally`; never reset the deadline or alter logical quota reservation.
- [ ] Run focused client/service tests and all Grip tests with `pnpm --filter @universe/backend test --runInBand --testPathPatterns=grip/tests`; expect GREEN including existing limits, guards, and lease tests.
- [ ] Finish `docs/grip.md` with exact retry statuses, cooldowns, deadline behavior, process-local balancing, safe-log fields, and possible extra provider cost. Format and commit `feat: retry transient Grip failures with another Gemini key`.

### Task 4: Verification, independent review, and PR

**Files:** Review the complete diff and update this plan's checkboxes and PR description with evidence; no unrelated refactors.

**Interfaces:** Consume the completed behavior and tests from Tasks 1–3. Produce a verified feature branch and PR targeting `develop` with migration instructions and actual check results.

- [ ] Run `pnpm test:grip`, `pnpm lint`, `pnpm lint:style`, `pnpm typecheck --force`, `pnpm test --force`, `pnpm build --force`, `pnpm --filter @universe/backend test:cov --runInBand`, and `pnpm exec prettier --check <changed-files>`. Record exit codes, failures, and existing toolchain warnings separately. Do not alter unrelated code merely to hide baseline noise.
- [ ] If `GRIP_TEST_DATABASE_URL` is available for a disposable database, run `pnpm --filter @universe/backend test:grip:postgres`; otherwise explicitly mark the database-only check unrun. No live Gemini requests or new secrets are required.
- [ ] Walk the repository pre-commit checklist. Obtain one fresh whole-branch review using the agreed execution method, validate findings against source, fix valid findings with red/green tests, and rerun affected checks.
- [ ] Commit the completed plan/check evidence. Obtain the real ticket code and Notion task link if not already supplied; never invent required PR metadata. Prepare the PR body with config migration, retry semantics/limitations, actual tests, and any unrun checks.
- [ ] Push through the normal mandatory Grip hook once. If the human whiteboard opens, keep that original Git process waiting and ask the user to complete it; never answer for them, bypass the hook, or start a duplicate push. If enrollment is absent, ask the human to run `pnpm grip:setup`.
- [ ] After successful push, create the PR targeting `develop` using the repository template. Report its URL and remind the operator to load `GEMINI_API_KEYS`, deploy/restart the new backend, and only then remove the legacy env variable. Do not deploy or merge without separate authorization.
