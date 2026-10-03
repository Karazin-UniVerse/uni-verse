# Enforce AI-Instruction Rules in Lint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn four recurring review rules into lint errors (`no-barrel-file` in `core`, one React component per file, max 3 function parameters, no direct `fetch` outside client classes), fixing every current violation in the same PR so `pnpm lint` stays green after each commit.

**Architecture:** Per rule: fix the violations first, then enable the rule in `.oxlintrc.json` in the same commit. Exceptions are expressed as `overrides` (stories, Nest controllers, the two transport files), never as inline disables. No behavior changes: refactors keep the existing tests green.

**Tech Stack:** oxlint 1.85 (`.oxlintrc.json`, jsonc comments allowed), pnpm, jest (backend), vitest (uni-hub, ui), NestJS, React 19.

**Source of the numbers:** investigation on branch `chore/RS-115-improve-ai-instructions` (Task 7 of `2026-10-02-review-learnings-ai-instructions.md`), re-run on this branch (based on `origin/develop`) with identical results.

## Global Constraints

- Branch: `chore/RS-115-enforce-ai-rules-in-lint` (from `origin/develop`). Do not push, do not create another branch.
- **Commit only after the owner's approval** of each task (saved feedback). Show `git diff --stat` and wait. Stage only the files named in the task.
- This branch has no `docs/ai/`. Lint messages must not link to documentation files; write the instruction in the message itself.
- One rule per commit, in the order of the tasks. After every commit `pnpm lint` (= `oxlint --deny-warnings`) exits 0.
- No behavior changes. A refactor is verified by the existing tests, edited only for the new call shape.
- Conventional Commits, with the session's `Co-Authored-By` trailer. Prettier must pass for changed files.
- Verification commands: `pnpm lint`, `pnpm typecheck`, `pnpm --filter @universe/backend test`, `pnpm --filter @universe/uni-hub test`, `pnpm --filter @universe/ui test`.
- zsh pitfall: never name a shell variable `path` (it is tied to `PATH`).

## Decisions (defaults used by this plan)

| #   | Question                                                                                                  | Default                                                                                                                                                                                                  |
| --- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L1  | Nest controller handlers have positional `@Query`/`@GetUser` params (`moodle.controller.ts:51`, 5 params) | `max-params` is `off` for `**/*.controller.ts`; Nest decorators cannot be applied to an object parameter                                                                                                 |
| L2  | Stories define demo components                                                                            | `react/no-multi-comp` and `max-params` are `off` for `**/*.stories.*` and tests                                                                                                                          |
| L3  | `fetch` in `GetCreds` and `MoodleFilesService`                                                            | Both go through one new low-level method `MoodleClientService.fetch(path, init)`; they keep their own parsing and error mapping (behavior preserved). `fetch` is allowed only in the two transport files |
| L4  | Frontend `request(endpoint, options, retries, timeoutMs)`                                                 | `request(endpoint, options)` where `options` is `RequestInit & { retries?: number; timeoutMs?: number }`; login/logout keep their "no retry" behavior via `retries: 0`                                   |
| L5  | Migrating transport into an `ApiClient` class                                                             | Out of scope (separate task); this PR only changes the signature                                                                                                                                         |

## Review Focus

1. **Nest DI cycle when `AuthModule` starts depending on `MoodleClientService`.** Expected: app boots and `test/auth.e2e-spec.ts` passes. Pinned in Task 4 (Step 3 detects, Step 4 fixes).
2. **Behavior drift in token / user-id error paths** (`GetCreds.getToken`, `getUserId` throw `Moodle error: …`). Expected: identical messages and thrown types. Pinned in Task 4 (existing `get-creds.spec.ts` runs unchanged except for construction).
3. **Retry semantics of the frontend `request`**: login and logout must still not retry; every other call keeps 2 retries. Pinned in Task 3 (`api.test.ts` cases for retries, plus a grep that every `, 0)` call became `retries: 0`).
4. **Override globs not matching** (rule silently inactive). Pinned in each task by a negative test: add a violating line, see lint fail, remove it.
5. **Call sites missed by typecheck** (untyped `unknown` args, jest mocks `as unknown as`). Pinned by `pnpm typecheck` plus the greps in Task 3.

---

## File Structure

Modify: `.oxlintrc.json` (four rules, overrides).
Create: `packages/ui/components/una/Chart/ChartLegend.tsx`, `ChartTooltip.tsx`; `packages/uni-hub/views/dashboard/tabs/GradeTableRow.tsx`.
Modify (signatures): `packages/ui/components/una/Chart/Chart.tsx`, `packages/uni-hub/utils/soundEffects.ts`, `packages/uni-hub/services/api.request.ts`, `api.auth.ts`, `api.moodle.ts`, `api.test.ts`, backend `moodle-assignments.service.ts` (+ controller, specs), `auth.service.ts` (+ spec), `moodle.client.service.ts` (+ its 6 callers and spec), `get-creds.ts`, `moodle-files.service.ts` (+ specs), `auth.module.ts`.

---

### Task 1: `oxc/no-barrel-file` in `packages/core`

Zero violations today (measured), so this is a guard only.

**Files:**

- Modify: `.oxlintrc.json` (the `packages/core/**/*.{ts}` override)

- [ ] **Step 1: Add the rule to the core override**

In the override whose `files` is `["packages/core/**/*.{ts}"]`, next to `no-restricted-imports`, add `"oxc/no-barrel-file": ["error", { "threshold": 0 }]` inside its `rules`. **`threshold: 0` is required:** the default (100 modules) never fires. The rule only detects `export * from`; named re-exports (`export { x } from`) are not detected, so the guard is partial.

- [ ] **Step 2: Verify it is active (negative test)**

```bash
printf "export * from './grades';\n" > packages/core/utils/index.ts
pnpm lint; echo "exit=$?"
rm packages/core/utils/index.ts
```

Expected: oxlint reports `oxc(no-barrel-file)` for `packages/core/utils/index.ts`, `exit=1`. If `exit=0` the override glob does not match; fix the glob (`**/*.{ts}` may need `**/*.ts`).

- [ ] **Step 3: Verify the real tree is clean**

Run: `pnpm lint; echo "exit=$?"`
Expected: `exit=0`.

- [ ] **Step 4: Format, show diff, wait for approval, commit**

```bash
pnpm exec prettier --check .oxlintrc.json
git add .oxlintrc.json
git commit -m "chore(lint): forbid barrel files in packages/core"
```

---

### Task 2: `react/no-multi-comp`

**Files:**

- Create: `packages/ui/components/una/Chart/ChartTooltip.tsx`, `ChartLegend.tsx`, `packages/uni-hub/views/dashboard/tabs/GradeTableRow.tsx`
- Modify: `packages/ui/components/una/Chart/Chart.tsx`, `packages/uni-hub/views/dashboard/tabs/GradesTab.tsx`, `.oxlintrc.json`

**Interfaces:**

- Produces: `ChartTooltip`, `ChartLegend` (named exports, same props as today), `GradeTableRow` (named export, same props as today).

- [ ] **Step 1: Enable the rule and see it fail**

Add `"react/no-multi-comp": "error"` to top-level `rules`, and a new override:

```json
{
  "files": ["**/*.stories.{ts,tsx}", "**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}", "**/tests/**"],
  "rules": { "react/no-multi-comp": "off", "max-params": "off" }
}
```

Run: `pnpm lint; echo "exit=$?"`
Expected: failures only for `Chart.tsx` (`ChartLegend`, `Chart`) and `GradesTab.tsx` (`GradesTab`); none for stories. `exit=1`.

- [ ] **Step 2: Split `Chart.tsx`**

Move `ChartTooltip` (lines 46-68) and `ChartLegend` (70-83) verbatim into their own files with the imports they use (`css` from `./Chart.module.scss`, the `ChartTooltipProps` type from `./Chart.types`), export them by name, and import them in `Chart.tsx`. Keep `calculateDefaultHeight` and `truncateLabel` in `Chart.tsx` (they are not components).

- [ ] **Step 3: Split `GradesTab.tsx`**

Move `GradeTableRow` and its `GradeTableRowProps` type (line 38 and above) into `GradeTableRow.tsx`, export by name, import in `GradesTab.tsx`.

- [ ] **Step 4: Verify**

```bash
pnpm lint; echo "exit=$?"
pnpm typecheck
pnpm --filter @universe/ui test
pnpm --filter @universe/uni-hub test
```

Expected: all exit 0. If `Chart` has a Storybook story, also run `pnpm --filter @universe/ui build-storybook` (touches `packages/ui`).

- [ ] **Step 5: Negative test**

Append a second component to any non-story `.tsx`, run `pnpm lint`, expect `no-multi-comp`, then `git checkout -- <file>`.

- [ ] **Step 6: Show diff, wait for approval, commit**

```bash
pnpm exec prettier --check .oxlintrc.json packages/ui/components/una/Chart packages/uni-hub/views/dashboard/tabs
git add .oxlintrc.json packages/ui/components/una/Chart packages/uni-hub/views/dashboard/tabs
git commit -m "chore(lint): enforce one React component per file"
```

---

### Task 3: `max-params: 3`

Eight sites. Seven become object parameters; the Nest controller handler is exempt (L1).

**Files:** see File Structure; backend and frontend call sites listed below.

**Interfaces (new signatures, produced here, consumed by Task 4):**

```typescript
// packages/ui/components/una/Chart/Chart.tsx
function calculateDefaultHeight({ type, layout, dataLength, rowHeight }: DefaultHeightParams): number;

// packages/uni-hub/utils/soundEffects.ts
function playTone({ frequency, duration, oscillatorType, gain = 0.04, delaySeconds = 0 }: PlayToneParams): void;

// packages/uni-hub/services/api.request.ts
export type RequestOptions = RequestInit & { retries?: number; timeoutMs?: number };
export async function request<T>(endpoint: string, options?: RequestOptions): Promise<{ data: T }>;
async function executeAttempt<T>({ url, options, headers, timeoutMs }: ExecuteAttemptParams): Promise<{ data: T }>;

// packages/backend/moodle/moodle-assignments/moodle-assignments.service.ts
async saveSubmission({ moodleToken, assignId, text, fileItemId }: SaveSubmissionParams): Promise<unknown>;

// packages/backend/auth/auth.service.ts
async getTokens({ userId, email, moodleToken, moodleId }: GetTokensParams);

// packages/backend/moodle/moodle-client/moodle.client.service.ts
async client<T = unknown>({ wsfunction, moodleToken, moodleId, params }: MoodleClientParams): Promise<T>;
```

Each `*Params` type is a named `type` declared next to its function (project rule: object params have a named type).

- [ ] **Step 1: Enable the rule and see it fail**

Add `"max-params": ["error", { "max": 3 }]` to top-level `rules`, and in the Task 2 stories/tests override it is already `off`. Add an override:

```json
{ "files": ["**/*.controller.ts"], "rules": { "max-params": "off" } }
```

Run: `pnpm lint`. Expected: exactly the 7 non-controller sites (`Chart.tsx`, `soundEffects.ts`, `api.request.ts` x2, `moodle-assignments.service.ts`, `auth.service.ts`, `moodle.client.service.ts`).

- [ ] **Step 2: Chart and soundEffects (no tests exist)**

Change `calculateDefaultHeight` (2 references, both in `Chart.tsx`) and `playTone` (5 references in `soundEffects.ts`) to the object form above; update every call. Check: `grep -n "calculateDefaultHeight(\|playTone(" packages/ui packages/uni-hub -r --include='*.ts' --include='*.tsx'`; every hit uses `{`.

- [ ] **Step 3: Frontend `request` (L4)**

1. In `api.test.ts` first change the retry/timeout cases to the new shape (`request('/x', { retries: 0 })`, `request('/x', { timeoutMs: 50 })`); run `pnpm --filter @universe/uni-hub test` and watch them fail.
2. Implement `RequestOptions`, destructure `{ retries = 2, timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS, ...fetchOptions }` at the top of `request`, pass `fetchOptions` onward, convert `executeAttempt` to an object parameter.
3. Update callers: `grep -n ", 0,\|, 0)" packages/uni-hub/services/api.auth.ts` and turn each positional `0` into `retries: 0` inside the options object (3 of the 4 `request` calls in `api.auth.ts`; `api.moodle.ts` passes none).
4. Run `pnpm --filter @universe/uni-hub test` and `pnpm typecheck`. Expected: pass.

- [ ] **Step 4: Backend `saveSubmission`**

Update `moodle-assignments.service.spec.ts` and `moodle-assignments.controller.spec.ts` to the object form first (8 references, `grep -rn "saveSubmission(" packages/backend --include='*.ts'`), run `pnpm --filter @universe/backend test -- moodle-assignments` and watch it fail; then change the service signature and the single controller call. Run the same command; expected pass.

- [ ] **Step 5: Backend `getTokens`**

Same procedure for `auth.service.ts` and `auth.service.spec.ts` (10 references, `grep -rn "getTokens(" packages/backend --include='*.ts'`). Run `pnpm --filter @universe/backend test -- auth.service`; expected pass.

- [ ] **Step 6: Backend `MoodleClientService.client`**

Update `moodle.client.service.spec.ts` first, then the six callers: `moodle-courses`, `moodle-notifications`, `moodle-profile`, `moodle-assignments`, `moodle-grades`, `moodle-course-contents`, `moodle-events` services (7 files; 14 references: `grep -rn "\.client<\|\.client(" packages/backend --include='*.ts'`). Also update any service spec that asserts the call arguments (`toHaveBeenCalledWith('core_…', token, id)` becomes `toHaveBeenCalledWith({ wsfunction: 'core_…', moodleToken: token, moodleId: id })`). Run `pnpm --filter @universe/backend test`; expected all pass.

- [ ] **Step 7: Verify**

```bash
pnpm lint; echo "exit=$?"
pnpm typecheck
pnpm --filter @universe/backend test
pnpm --filter @universe/uni-hub test
```

Expected: exit 0 everywhere. Then the negative test: add `function f(a: number, b: number, c: number, d: number) {}` to a non-controller file, expect `max-params`, revert.

- [ ] **Step 8: Show diff, wait for approval, commit**

```bash
git add .oxlintrc.json packages
git commit -m "chore(lint): enforce max 3 function parameters"
```

---

### Task 4: no direct `fetch` outside client classes

**Files:**

- Modify: `packages/backend/moodle/moodle-client/moodle.client.service.ts` (+ spec), `packages/backend/utils/get-creds.ts` (+ `get-creds.spec.ts`), `packages/backend/moodle/moodle-files/moodle-files.service.ts` (+ spec), `packages/backend/auth/auth.module.ts`, possibly `packages/backend/moodle/moodle.module.ts`, `.oxlintrc.json`

**Interfaces:**

- Consumes: Task 3 `MoodleClientService.client({ … })` signature.
- Produces: `MoodleClientService.fetch(path: string, init?: RequestInit): Promise<Response>`: builds `${baseUrl}${path}`, applies `redirect: 'error'` by default (callers may override), no other behavior. `GetCreds` constructor takes `(moodleClient: MoodleClientService)`; `MoodleFilesService` constructor takes `(moodleClient: MoodleClientService)`.

- [ ] **Step 1: Enable the rule and see it fail**

Add to top-level `rules`:

```json
"no-restricted-globals": ["error", { "name": "fetch", "message": "Do not call fetch directly. Go through the API client class (MoodleClientService on the backend; the api.* client classes in uni-hub)." }]
```

and an override turning it `off` for `packages/backend/moodle/moodle-client/moodle.client.service.ts`, `packages/uni-hub/services/api.request.ts`, tests/specs/stories (global `fetch` is spied on there).

Run `pnpm lint`. Expected: exactly `moodle-files.service.ts:38`, `get-creds.ts:37`, `get-creds.ts:63`.

- [ ] **Step 2: Write the failing tests**

In `moodle.client.service.spec.ts` add a test that `service.fetch('/login/token.php', { method: 'POST' })` calls the global `fetch` with `https://<base>/login/token.php` and `redirect: 'error'`, and that a caller-supplied `redirect` wins. In `get-creds.spec.ts` and `moodle-files.service.spec.ts` change the construction to `new GetCreds(moodleClient)` / `new MoodleFilesService(moodleClient)` where `moodleClient` is a real `MoodleClientService` built with `MOODLE_BASEURL=https://moodle.test` set in the spec. Run `pnpm --filter @universe/backend test -- moodle.client get-creds moodle-files` and watch them fail.

- [ ] **Step 3: Implement `MoodleClientService.fetch`**

```typescript
async fetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${this.baseUrl}${path}`, { redirect: 'error', ...init });
}
```

Make `client()` use it for its own request (it already uses `redirect: 'error'`). `GetCreds` drops `getBaseUrl()` and calls `this.moodleClient.fetch('/login/token.php', { method: 'POST', headers, body })` and `this.moodleClient.fetch(`/webservice/rest/server.php?wstoken=…`)`; keep parsing and the `Moodle error: …` messages byte-for-byte. `MoodleFilesService` drops its https check (the client constructor already enforces it) and calls `this.moodleClient.fetch('/webservice/upload.php', { method: 'POST', body: formData })`; keep `!response.ok` handling and the `exception` branch unchanged.

- [ ] **Step 4: Fix DI**

`GetCreds` is provided by `AuthModule`, `MoodleClientService` by `MoodleModule` (exported). Add `MoodleModule` to `AuthModule.imports`. If Nest reports a circular dependency (check `MoodleModule.imports` for `AuthModule`/`UserModule`), move `MoodleClientService` into its own `MoodleClientModule` (provide and export it), import that module from both, and keep `MoodleModule` re-exporting nothing new.

Run: `pnpm --filter @universe/backend test` and `pnpm --filter @universe/backend test:e2e` (the e2e test overrides `GetCreds`, so it confirms the module graph compiles).
Expected: pass.

- [ ] **Step 5: Verify**

```bash
pnpm lint; echo "exit=$?"
pnpm typecheck
pnpm --filter @universe/backend test
```

Expected: exit 0. Negative test: add `await fetch('https://x')` to any service file, expect `no-restricted-globals`, revert.

- [ ] **Step 6: Show diff, wait for approval, commit**

```bash
git add .oxlintrc.json packages/backend
git commit -m "chore(lint): forbid direct fetch outside client classes"
```

---

### Task 5: Final verification

- [ ] **Step 1: Whole pipeline**

```bash
pnpm lint && pnpm lint:style && pnpm typecheck && pnpm test && pnpm build
```

Expected: exit 0. (`pnpm test` runs backend jest via turbo; it needs `pnpm db:generate`, which the backend script already runs.)

- [ ] **Step 2: Each rule is really on**

For each of the four rules, re-run its negative test from Tasks 1–4 once more on the final tree, then revert. Expected: four distinct rule names in the output.

- [ ] **Step 3: PR notes**

List in the PR description: the four rules, the two override groups (stories/tests; controllers; two transport files for `fetch`), and that `ApiClient` migration is a separate task (L5).

---

## Self-review

- **Coverage:** four rules → Tasks 1–4; every measured violation has a step (Chart/GradesTab: Task 2; 7 signatures: Task 3; 3 fetch sites: Task 4); controller handler covered by override L1.
- **Placeholders:** call-site updates are specified by exact grep commands and a before/after example instead of listing 30 lines, because they are mechanical and typecheck plus the existing tests verify them.
- **Consistency:** `MoodleClientService.client({ wsfunction, moodleToken, moodleId, params })` defined in Task 3 and consumed in Task 4; `RequestOptions` defined once.
