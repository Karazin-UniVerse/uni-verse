# Review Learnings → AI Instructions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the recurring `iamredl-lab` PR-review comments (PRs #66–#166) plus three new owner requirements (KISS, DRY with a fixed home for shared code, class-based API clients) into rules in `docs/ai/*`, so agents stop producing the flagged issues.

**Architecture:** No new files except one: every rule is added once to the existing topic doc it belongs to (`code-style`, `architecture`, `frontend`, `workflow`, `review`), and `AGENTS.md` only points at them. A self-review gate in `AGENTS.md` makes the agent walk the checklist before reporting "done". Rules apply to code an agent writes or touches; they never authorize refactoring unrelated code.

**Tech Stack:** Markdown, prettier, pnpm.

**Spec:** `docs/superpowers/specs/2026-10-02-ai-instructions-restructure-design.md` (structure, "each rule written once", 25 KB always-loaded budget). This plan extends it; it does not change the structure.

## Global Constraints

- Work on the current branch `chore/RS-115-restructure-ai-agents-instructions-part2`. Do not create a branch; do not push.
- **Precondition:** `AGENTS.md` and `docs/ai/workflow.md` currently have uncommitted edits from the restructure plan. Before Task 1 run `git status --short AGENTS.md docs/ai`; if they show ` M`, stop and ask the user whether to commit them first. Never mix those edits into this plan's commits.
- Each rule is written **once**. Other files link to it with a relative link; they never restate it.
- Docs are in English. The PR template is in Ukrainian; keep that language there.
- Always-loaded set (`AGENTS.md` + `docs/ai/{code-style,architecture,frontend,quality}.md`) must stay **under 25 KB** (spec). Currently about 19 KB. Task 8 measures it. Content that only matters when committing or reviewing goes to `workflow.md` or `review.md` (on-demand), not to the four always-loaded docs.
- "Enum" in reviewer comments means a **const object plus derived type** (`quality.md`: TS `enum` breaks Node type-stripping). Never write `enum` in new rules.
- Rules describe the target state. Existing code that violates them (for example `packages/uni-hub/services/api.request.ts` functions, `packages/core/types/index.ts`) is migrated only when a PR touches it; no mass refactors. Say this once, in `AGENTS.md` (Task 6).
- No changes to code, lint rules or CI in Tasks 1–6 and 8. Task 7 only investigates and proposes.
- Prettier formats `*.md` on commit. Run `pnpm exec prettier --write <files>` before each commit.
- Commit messages: Conventional Commits plus the session's `Co-Authored-By` trailer. Stage only the files named in the task.

## Decisions to confirm (defaults used by this plan)

| #   | Question                                                                                         | Default in this plan                                                                                                                         |
| --- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Barrels: #104 says no `index.ts` in `core`; #132 says one file per DTO re-exported from one file | `packages/core`: no barrels for `constants/` and `utils/`. Backend module `dto/`: one DTO per file plus one `index.ts` per module is allowed |
| D2  | File naming: `code-style.md` has backend `<module>.helpers.ts`; #165 wants plain `helpers.ts`    | Frontend co-located file is `helpers.ts`; backend keeps `<module>.helpers.ts` (several modules, so the prefix disambiguates)                 |
| D3  | Test folder: reviewer wrote `__tests__`, repo uses `tests/` (`packages/core/utils/tests`)        | Follow the repo: sibling `tests/`                                                                                                            |
| D4  | API classes: one base class vs composition                                                       | Base class `ApiClient` with a protected `request<T>()`; domain classes extend it. Existing `AuthApi`/`MoodleApi` already comply              |

If the user changes a default, edit the matching task text before executing it.

## Review Focus

1. **Class-based API rule read as license for classes everywhere** (conflicts with KISS). Expected: pure functions stay functions. Pinned in Task 3 (scope sentence, grep anchor "Pure functions stay functions").
2. **Always-loaded budget blown by six rule additions.** Expected: under 25 KB, otherwise the least universal section moves to an on-demand doc. Pinned in Task 8 (`wc -c`).
3. **Old "Helpers placement" section and the new placement table both survive** (rule stated twice). Pinned in Task 1 (replace, then grep count equals 1).
4. **Agent mass-refactors old code because the new rule says "target state".** Expected: only touched code changes. Pinned in Task 6 (working agreement) and Task 3 (migration sentence).
5. **Markdown tables or code fences failing `prettier --check`.** Pinned in Task 8 (`pnpm format:check`).

---

## File Structure

Modify only:

- `docs/ai/code-style.md` — KISS, DRY and shared-code ladder, magic values, components/files/imports (Tasks 1, 2, 5)
- `docs/ai/architecture.md` — `@universe/core` layout, API clients (Tasks 2, 3)
- `docs/ai/frontend.md` — RSC in `ui`, i18n placeholders (Task 5)
- `docs/ai/workflow.md` — config/env, documentation, PR hygiene, extended checklist (Tasks 4, 6)
- `docs/ai/review.md` — new failure modes (Task 6)
- `AGENTS.md` — working agreements and self-review gate (Task 6)

Anchors that later tasks link to (defined in Task 1–3): `code-style.md#keep-it-simple-kiss`, `code-style.md#reuse-before-writing-dry`, `code-style.md#no-magic-values`, `architecture.md#core-layout`, `architecture.md#api-clients`.

---

### Task 1: KISS and DRY with a fixed home for shared code

**Files:**

- Modify: `docs/ai/code-style.md` (replace the section `## Helpers placement`; add `## Keep it simple (KISS)` before it)

**Interfaces:**

- Produces: anchors `#keep-it-simple-kiss`, `#reuse-before-writing-dry`. `frontend.md` already links to `code-style.md#helpers-placement`; that link is updated in Step 3.

- [ ] **Step 1: Insert the KISS section**

In `docs/ai/code-style.md`, directly above the heading `## Helpers placement`, add:

```markdown
## Keep it simple (KISS)

- Choose the simplest solution that meets the current requirement. Five direct lines beat a fifty-line generalization.
- Do not abstract for a hypothetical future: no factories, generic wrappers, strategy layers, extra options or flags with a single caller.
- Before adding a layer, class, hook or helper, ask: "what would I delete if this did not exist?" If the answer is "nothing", do not add it.
- If the solution needs a paragraph to explain, look for a simpler one first. When two designs both work, take the one with fewer moving parts.
- No defensive code for states that the types or the callers already rule out.
- Pure functions stay functions. Use a class only where the rules say so ([API clients](architecture.md#api-clients)) or where state and dependencies are really shared.
```

- [ ] **Step 2: Replace the "Helpers placement" section**

Replace the whole `## Helpers placement` section (heading and its four bullets) with:

```markdown
## Reuse before writing (DRY)

Before writing a function, constant, type, hook or component, search the repo for an existing one **by behavior, not only by name**: grep for the formula, regex or domain term. Equivalent code often hides under another name (`parseGradeScore` and a local score parser are the same thing).

- Equivalent exists: use it. Near match exists: extend it; do not fork it.
- Never leave two functions with the same or near-identical behavior in different places. If you find a pair, consolidate it in the same PR, or say in the PR description that a follow-up task is needed.

Where shared code lives. Take the first row that fits:

| Used by                                                        | Location                                                                                                                         |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| One file                                                       | A non-exported function in that file                                                                                             |
| Several files of one component or view                         | Co-located `helpers.ts` with `helpers.test.ts`                                                                                   |
| Several places in one package                                  | The package-level helpers directory (`packages/uni-hub/utils/`, `packages/backend/utils/`), one file per domain                  |
| More than one package, or expected to be used by more than one | `@universe/core`: `utils/` for functions, `constants/` for values, `types/` for types. One file per domain (`grades`, `browser`) |

Rules:

- Promote code up one row when its second consumer appears at that level. Do not promote ahead of need, except code that is clearly cross-package (grades, Moodle contracts, HTTP codes).
- Pure calculations, formatting, score-tone mapping and regex utilities MUST NOT live inside React components, hooks, backend services or DTOs.
- Backend DTO helpers go into `<module>.helpers.ts`; never keep helper functions in DTO files.
- A helper used by exactly one other function stays inside that function's module as a private function, not a new file.
```

- [ ] **Step 3: Fix the inbound link**

In `docs/ai/frontend.md` change `[code-style](code-style.md#helpers-placement)` to `[code-style](code-style.md#reuse-before-writing-dry)`. Do the same in any other file that links to `#helpers-placement`.

Run: `grep -rn "helpers-placement" AGENTS.md docs/ai .coderabbit.yaml`
Expected: no output.

- [ ] **Step 4: Verify the rule is stated once**

Run: `grep -c "co-located \`helpers.ts\`\|Co-located \`helpers.ts\`" docs/ai/code-style.md`Expected:`1`

Run: `grep -n "Keep it simple (KISS)\|Reuse before writing (DRY)" docs/ai/code-style.md`
Expected: two lines.

- [ ] **Step 5: Format and commit**

```bash
pnpm exec prettier --write docs/ai/code-style.md docs/ai/frontend.md
git add docs/ai/code-style.md docs/ai/frontend.md
git commit -m "docs(ai): add KISS rule and DRY shared-code ladder"
```

---

### Task 2: `@universe/core` layout and no magic values

**Files:**

- Modify: `docs/ai/architecture.md` (new `### Core layout` under "Packages and dependency rules")
- Modify: `docs/ai/code-style.md` (new `## No magic values` after the "No backwards-compatibility shims" section)

**Interfaces:**

- Produces: anchors `architecture.md#core-layout`, `code-style.md#no-magic-values`.

- [ ] **Step 1: Add the core layout section**

In `docs/ai/architecture.md`, after the `- **\`@universe/uni-hub\`**`bullet and before`## Monorepo rules`, add:

```markdown
### Core layout

- One file per domain, grouped by kind: `constants/grades.ts`, `constants/breakpoints.ts`, `utils/grades.ts`, `utils/browser.ts`. Import the specific module (`@core/utils/browser`), never the package root.
- No barrel `index.ts` in `constants/` and `utils/`. Barrels hide where code lives and force a split later; add domain files from the start.
- Types, constants and functions never share a file. Types stay under `types/`.
- Tests sit next to the code in a sibling `tests/` directory (`utils/tests/grades.test.ts`).
- Do not write unit tests for types and constants; test behavior only.
```

- [ ] **Step 2: Add the magic-values section**

In `docs/ai/code-style.md`, after the shim/alias section, add:

````markdown
## No magic values

Never put bare numbers or domain strings into logic: HTTP status codes, grade thresholds, filter names, storage keys, timeouts. Declare a const object with a derived type once, in `@universe/core/constants` when more than one package can use it ([where shared code lives](#reuse-before-writing-dry)), and import it. Do not use TS `enum`; see [quality](quality.md).

```typescript
// ❌ if (response.status === 401)
// ✅ if (response.status === RESPONSE_CODES.UNAUTHORIZED)
export const RESPONSE_CODES = { UNAUTHORIZED: 401 } as const;
export type ResponseCode = (typeof RESPONSE_CODES)[keyof typeof RESPONSE_CODES];
```
````

````

- [ ] **Step 3: Verify anchors**

Run: `grep -n "### Core layout" docs/ai/architecture.md && grep -n "## No magic values" docs/ai/code-style.md`
Expected: one line from each file.

Run: `grep -c "RESPONSE_CODES" packages/core/constants/response-codes.ts`
Expected: at least `1` (confirms the example name is real).

- [ ] **Step 4: Format and commit**

```bash
pnpm exec prettier --write docs/ai/architecture.md docs/ai/code-style.md
git add docs/ai/architecture.md docs/ai/code-style.md
git commit -m "docs(ai): add core layout and no-magic-values rules"
````

---

### Task 3: API clients as classes

**Files:**

- Modify: `docs/ai/architecture.md` (new `## API clients` after `## Backend (NestJS)`)

**Interfaces:**

- Consumes: `code-style.md#keep-it-simple-kiss` (scope sentence).
- Produces: anchor `architecture.md#api-clients`, linked from Task 1.

Evidence for the rule: `packages/uni-hub/services/api.auth.ts` (`AuthApi`) and `api.moodle.ts` (`MoodleApi`) already are classes exported as singletons; the transport layer in `api.request.ts` (`request`, `buildQueryString`, `getErrorMessage`) and `api.storage.ts` (`safeStorage`) is still function-based; `packages/backend/moodle/moodle-files/moodle-files.service.ts` and `packages/backend/utils/get-creds.ts` call `fetch` directly.

- [ ] **Step 1: Add the section**

```markdown
## API clients

HTTP access is class-based so that transport settings and dependencies live in one place.

- **Frontend (`packages/uni-hub/services/`)**: one class per backend domain (`AuthApi`, `MoodleApi`), in `api.<domain>.ts`, exported as one shared instance (`export const authApi = new AuthApi()`). Components and hooks call methods on the instance; they never call `fetch` or a raw `request` function.
- Shared transport (base URL, auth header, timeout, retries, error mapping) lives in a single `ApiClient` base class that the domain classes extend, with a protected `request<T>()` method. Do not copy transport logic into a domain class.
- **Backend**: one injectable client service per external system (Moodle: `MoodleClientService`). Other services depend on it through DI and never call `fetch` directly.
- Pure functions stay functions: query-string building, message mapping and other stateless helpers are not wrapped in a class. Put them where [shared code lives](code-style.md#reuse-before-writing-dry), or make them `private` members of the client when only it uses them.
- Existing function-based transport code is migrated when a PR changes it; do not refactor it in unrelated PRs.
```

- [ ] **Step 2: Verify**

Run: `grep -n "Pure functions stay functions" docs/ai/architecture.md docs/ai/code-style.md`
Expected: one line in each file (the KISS bullet and this section).

Run: `grep -n "^## API clients" docs/ai/architecture.md`
Expected: one line.

- [ ] **Step 3: Format and commit**

```bash
pnpm exec prettier --write docs/ai/architecture.md
git add docs/ai/architecture.md
git commit -m "docs(ai): require class-based API clients"
```

---

### Task 4: Config, environment, documentation and PR hygiene

**Files:**

- Modify: `docs/ai/workflow.md` (two sections, one list item)

_The PR template (`.github/pull_request_template.md`) is deliberately left out: the owner will handle it separately._

- [ ] **Step 1: Add the config and documentation sections to `workflow.md`**

Before `## Pre-commit checklist`, add:

```markdown
## Config and environment

- `.env.example` is the single source of truth for environment variables. A new variable is added there in the same PR; developers copy it to `.env`.
- Code reads configuration from `process.env` and does not carry fallback defaults for values that `.env.example` or the server always provides. Never hardcode URLs or hosts.
- Do not duplicate `.env` files or entries in `.gitignore`, `tsconfig` paths or `package.json`; search for an existing entry first. A workspace alias is declared once (`workspace:*` in `package.json`, one path in `tsconfig.json`).
- Secrets are never committed. In README or docs write "ask the Project coordinator" for private values.

## Documentation

- Documentation is in English.
- Anything a developer must run or configure (script, service, Storybook, env variable) is documented in `README.md` or `docs/` in the same PR. Every command in a doc must exist; verify it.
- When a package gains a public API, add a Markdown file describing it.
```

Delete the old `## Documentation` section (which holds only the public-API bullet), because the bullet moved into the new section.

- [ ] **Step 2: Add the PR rules to the branches section**

Append to `## Branches, commits, pull requests`:

```markdown
- UI changes include screenshots in the PR description.
- When people or ownership change, update `.github/CODEOWNERS` in the same PR.
```

- [ ] **Step 3: Verify**

Run: `grep -c "^## Documentation" docs/ai/workflow.md`
Expected: `1`

Run: `grep -n "env.example" docs/ai/workflow.md | head -3`
Expected: at least one line.

- [ ] **Step 4: Format and commit (after the owner's approval)**

```bash
pnpm exec prettier --write docs/ai/workflow.md
git add docs/ai/workflow.md
git commit -m "docs(ai): add config, docs and PR hygiene rules"
```

---

### Task 5: Components, files, imports and i18n details

**Files:**

- Modify: `docs/ai/code-style.md` (new `## Components, files and imports`)
- Modify: `docs/ai/frontend.md` (RSC bullet in "Server vs client components"; placeholder bullet in "Localization")

- [ ] **Step 1: Add to `code-style.md`** (after "Co-located types")

```markdown
## Components, files and imports

- One component per file. Subcomponents go in their own files.
- Inside a domain folder do not repeat the folder name in a frontend file name: `components/auth/helpers.ts`, not `auth.helpers.ts`. Backend modules keep `<module>.helpers.ts`.
- One `import` statement per package, listing every name: `import { Modal, Button, useToast } from '@una';`. For `@universe/core` import the specific module ([core layout](architecture.md#core-layout)).
- Do not add a dependency that another workspace package already provides (use `@ui`, not a second copy).
- After a refactor, remove what is now unused: exports, files, dependencies, translation keys. Before keeping something that "might be needed", check that it is used.
```

- [ ] **Step 2: Add to `frontend.md`**

In "Server vs client components" append:

```markdown
- Components in `packages/ui` stay usable as Server Components. Put `"use client"` only on the part that needs interactivity, and compose the rest as `children` of that client wrapper (for example `Chart`). Before adding `"use client"` to an app component, check that it really needs state, effects or browser APIs.
```

In "Localization (i18n)" append:

```markdown
- Dynamic values go through placeholders in the translation string (`'Grade for {course}'`), never through string concatenation around `formatMessage`. If `formatMessage` cannot take parameters for the case, extend it first. Keep one translation function name; do not add aliases such as `t`.
```

- [ ] **Step 2b: Verify**

Run: `grep -n "One component per file" docs/ai/code-style.md`
Expected: one line.

Run: `grep -n "placeholders in the translation string" docs/ai/frontend.md`
Expected: one line.

- [ ] **Step 3: Format and commit**

```bash
pnpm exec prettier --write docs/ai/code-style.md docs/ai/frontend.md
git add docs/ai/code-style.md docs/ai/frontend.md
git commit -m "docs(ai): add component, file, import and i18n rules"
```

---

### Task 6: Self-review gate, review rubric, instruction-update rule

**Files:**

- Modify: `AGENTS.md` (Working agreements)
- Modify: `docs/ai/review.md` (new failure modes)
- Modify: `docs/ai/workflow.md` (Pre-commit checklist)

- [ ] **Step 1: `AGENTS.md` working agreements**

Add these bullets to `## Working agreements` (keep the file short; the rules live in the linked docs):

```markdown
- Keep it simple and reuse before writing: [KISS](docs/ai/code-style.md#keep-it-simple-kiss), [DRY and where shared code lives](docs/ai/code-style.md#reuse-before-writing-dry).
- Rules apply to code you write or touch. Do not refactor unrelated code to match them; mention a violation you notice in the PR description instead.
- Before saying a task is done, walk the [pre-commit checklist](docs/ai/workflow.md#pre-commit-checklist) and fix what it flags.
- If a reviewer asks to "add this to the instructions", update the matching file in `docs/ai/` (not a skill) and keep each rule in one place.
```

- [ ] **Step 2: `review.md` failure modes**

Items 1 (over-engineering) and 2 (DRY) already exist in the rubric, so extend them instead of adding duplicates: item 1 gains "a layer, class, option or abstraction with a single caller is a finding" plus a link to `code-style.md#keep-it-simple-kiss`; item 2 gains "same behavior under another name; shared logic left at a lower level when it belongs one level up" plus a link to `code-style.md#reuse-before-writing-dry`. After item 11 add:

```markdown
12. **MAGIC VALUES:** bare numbers or domain strings in logic instead of core constants. Rule: [code-style](code-style.md#no-magic-values).
13. **MISSING OPERATIONAL CHANGES:** a new env variable absent from `.env.example`, a new script or service without docs, UI changes without screenshots. Rule: [workflow](workflow.md#config-and-environment).
14. **API ACCESS OUTSIDE CLIENT CLASSES:** direct `fetch` or raw `request` calls in components or services. Rule: [architecture](architecture.md#api-clients).
```

- [ ] **Step 3: Extend the checklist in `workflow.md`**

Add to `## Pre-commit checklist`:

```markdown
- [ ] I searched for an existing helper, constant, type or component before writing a new one; shared code is in the right place ([code-style](code-style.md#reuse-before-writing-dry)).
- [ ] The solution is the simplest that meets the requirement ([code-style](code-style.md#keep-it-simple-kiss)).
- [ ] No magic values; API calls go through client classes ([code-style](code-style.md#no-magic-values), [architecture](architecture.md#api-clients)).
- [ ] Unused exports, files, dependencies and translation keys are removed; new env variables and docs are in place ([workflow](#config-and-environment)).
```

- [ ] **Step 4: Verify links resolve**

Run: `grep -on "(\(\.\./\)*docs/ai/[a-z-]*\.md#[a-z-]*)\|([a-z-]*\.md#[a-z-]*)" AGENTS.md docs/ai/*.md | sort -u`
Expected: every anchor listed exists as a heading in the target file (check by eye against `grep -n "^#" docs/ai/*.md`).

- [ ] **Step 5: Format and commit**

```bash
pnpm exec prettier --write AGENTS.md docs/ai/review.md docs/ai/workflow.md
git add AGENTS.md docs/ai/review.md docs/ai/workflow.md
git commit -m "docs(ai): add self-review gate and new review failure modes"
```

---

### Task 7: Which of these rules can a linter enforce? (investigation only)

Instructions are skipped by agents; a failing lint is not. This task produces a proposal; it does **not** edit lint config. The restructure spec put lint changes out of scope, so the user decides.

**Files:**

- Create (scratchpad, not committed): a table in the chat reply.

- [ ] **Step 1: Check which rules exist in our toolchain**

Run: `pnpm exec oxlint --rules 2>/dev/null | grep -iE "max-params|max-lines|no-multi-comp|jsx-no-literals|no-restricted-imports|no-magic-numbers"`
Expected: a list of the available rules (if `--rules` is unsupported, read the oxlint docs for the installed version: `pnpm exec oxlint --version`).

- [ ] **Step 2: Map rules to candidates**

Candidates and the review comment each one would replace:

| Rule                                                                                                     | Replaces                                     |
| -------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `max-params: 3`                                                                                          | "more than 3 params → object"                |
| `react/no-multi-comp`                                                                                    | "one component per file"                     |
| `react/jsx-no-literals`                                                                                  | hardcoded UI strings                         |
| `no-restricted-imports` (`../../..` across packages; `@universe/core` root; `@universe/ui` root for Una) | cross-package relative imports, root barrels |
| `max-lines` for `*.tsx`                                                                                  | decomposition                                |
| `no-magic-numbers` (limited to `==`/`===` comparisons)                                                   | magic numbers                                |
| `no-restricted-syntax` on `TSEnumDeclaration`                                                            | enum under Node type-stripping               |

- [ ] **Step 3: Report to the user**

Report which rules exist, the number of current violations each would create (`pnpm exec oxlint --deny-warnings` with the rule enabled in a scratch config, not committed), and a recommendation (enable at `warn` first, then `error`). Wait for approval before any change. If approved, it becomes a separate plan.

---

### Task 8: Final verification

**Files:** none modified unless a check fails.

- [ ] **Step 1: Always-loaded size**

Run: `wc -c AGENTS.md docs/ai/code-style.md docs/ai/architecture.md docs/ai/frontend.md docs/ai/quality.md`
Expected: total under `25600` bytes. If over, move the least universal always-loaded section (`frontend.md` "Meaningful empty states" or "Responsive breakpoints") to an on-demand doc and add it to the routing table in `AGENTS.md`. Do not shorten rules.

- [ ] **Step 2: Each new rule exists once**

Run:

```bash
for p in "Keep it simple (KISS)" "Reuse before writing (DRY)" "### Core layout" "## No magic values" "## API clients" "One component per file" "## Config and environment"; do echo "$p: $(grep -rlF "$p" docs/ai | tr '\n' ' ')"; done
```

Expected: each phrase maps to exactly one file.

- [ ] **Step 3: Formatting and lint**

Run: `pnpm format:check && pnpm lint`
Expected: both exit 0 with no warnings.

- [ ] **Step 4: Spot-check with an agent**

In a fresh `claude` session in the repo root ask: "I need a function that parses a grade score from a Moodle item and is used in the backend and in uni-hub. Where do I put it and how do I check that it does not exist yet?" Expected: the answer names `@universe/core/utils/grades` and says to search by behavior first, without invoking a skill. Then ask: "Add a client for a new `/schedule` endpoint." Expected: a class extending `ApiClient`, exported as an instance.

If either answer is wrong, the rule is missing or buried; fix the wording in the owning doc and re-run.

- [ ] **Step 5: Final commit if Step 1 or 3 changed files**

```bash
git add AGENTS.md docs/ai
git commit -m "docs(ai): rebalance always-loaded instructions"
```

---

## Self-review (done while writing)

- **Coverage:** KISS (Task 1, 6), DRY and shared-code ladder (Task 1), class-based API (Task 3), items 1–5, 7–14 of the review analysis (Tasks 2, 4, 5), item 15 and the self-review gate (Task 6), lint enforcement idea (Task 7). Item 6 of the analysis (backend service complexity) is covered by Task 1's last bullet ("helper used by exactly one other function") plus KISS; no separate rule was added to avoid duplicating the 150–200 line decomposition rule.
- **Placeholders:** none; every edit shows its text.
- **Consistency:** anchors `#keep-it-simple-kiss`, `#reuse-before-writing-dry`, `#no-magic-values`, `#core-layout`, `#api-clients`, `#config-and-environment`, `#pre-commit-checklist` are defined in Tasks 1–4 and 6 and used consistently.
