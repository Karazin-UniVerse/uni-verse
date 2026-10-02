# AI Instructions Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the scattered AI instruction files with one entry point (`AGENTS.md`) plus topic docs in `docs/ai/`, readable by Claude Code, Gemini CLI and CodeRabbit, without losing any existing rule.

**Architecture:** `AGENTS.md` imports four always-loaded docs with `@docs/ai/…` and routes to four on-demand docs. `CLAUDE.md` is `@AGENTS.md`; Gemini reads `AGENTS.md` through `.gemini/settings.json`. Skills live in `.agents/skills/` and are mirrored into `.claude/skills/` by a copy script. A throw-away coverage script proves every old rule landed in a new file before the old files are deleted.

**Tech Stack:** Markdown, Node 22 (script), pnpm, prettier, husky/lint-staged (already present).

**Spec:** `docs/superpowers/specs/2026-10-02-ai-instructions-restructure-design.md` (executors read it together with this plan; its C/S coverage matrices define the IDs used below).

## Global Constraints

- Work on the current branch `chore/RS-115-restructure-ai-agents-instructions-part2`. Do not create a branch; do not push.
- Always-loaded set (`AGENTS.md` + `docs/ai/{code-style,architecture,frontend,quality}.md`) stays **under 25 KB** (spec: "~25 KB").
- Each rule is written **once**. Other files link to it; they never restate it.
- Docs are written in English (the existing instruction files are English). Ukrainian UI strings and grade terms stay in Ukrainian, verbatim.
- Spec corrections apply: `@universe/core/types` (not `@universe/types`); no re-export from `.types.ts`; branches `feature/ fix/ refactor/ chore/ hotfix/` and PRs to `develop`; paths `packages/ui/components/…` (no `src/`); `complex` components are strictly UI-only; one verification pipeline (`pnpm lint`, `pnpm lint:style`, `pnpm typecheck`, `pnpm test`, `pnpm build`).
- Breakpoint truth (verified in `packages/core/constants/breakpoints.ts`): `BREAKPOINTS` is a const object of numbers (`xs 480, sm 640, md 768, lg 1024, xl 1280, xxl 1536`) and `type Breakpoint = keyof typeof BREAKPOINTS`. There is **no** `Breakpoint.MD` enum/object. `useMediaQuery` (`packages/uni-hub/hooks/useMediaQuery.ts`) accepts `('less' | 'wider', BREAKPOINTS.x)` and `(BREAKPOINTS.x, 'less' | 'wider')`.
- Prettier formats `*.md`/`*.json` on commit (`lint-staged.config.cjs`). Run `pnpm exec prettier --write <files>` before each commit so the hook does not rewrite files mid-commit. `.agents/` and `.claude/` are in `.prettierignore` and `.oxlintrc.json`.
- Commit messages: Conventional Commits, plus the `Co-Authored-By` trailer required by the session.
- No changes to code, lint rules or CI (spec "Out of scope"). The only `package.json` change is the two `skills:*` scripts in Task 9.

## Review Focus

1. **`@docs/ai/*.md` imports not expanding in Gemini CLI.** Expected: asking Gemini a style question answers from the imported docs. Pinned in Task 12 Step 4 (manual check). If imports are not expanded, stop and report; do not work around it by duplicating rules (the design would then need a generated `GEMINI.md`).
2. **A rule present in the old file but dropped by hand-merging.** Pinned by the coverage script in Task 1 (runs red → green across Tasks 2–7, must be green before Task 11).
3. **Mirror script deleting a skill that exists only in `.claude/skills` (`playwright-cli`).** Pinned in Task 9: copy it into `.agents/skills` _before_ the first sync, and `--check` must fail on a deliberately edited file.
4. **Prettier/oxlint/`format:check` failing on new markdown tables.** Pinned in Task 12 (`pnpm format:check`, `pnpm lint`).
5. **Dangling references** to deleted files (`copilot-instructions`, `karazin-edean`, `CODE_STYLE`, `.agents/roles`, `universe-dev-standards`, `design-system-rules`). Pinned in Task 11 by a repo-wide grep that must return nothing outside `docs/superpowers/`.

---

## File Structure

Create:

- `AGENTS.md`, `CLAUDE.md`, `.gemini/settings.json`
- `docs/ai/code-style.md`, `architecture.md`, `frontend.md`, `quality.md`, `review.md`, `workflow.md`, `domain-edean.md`
- `docs/ai/design-system.md` (via `git mv docs/design-system-rules.md`)
- `scripts/sync-skills.mjs`
- `.agents/skills/playwright-cli/` (copied from `.claude/skills/playwright-cli/`)
- scratch only (not committed): `$SCRATCH/verify-coverage.mjs`

Modify: `.coderabbit.yaml`, `package.json` (2 scripts), `skills-lock.json`, `packages/uni-hub/AGENTS.md` (no change expected; verified only).

Delete (Task 11, after coverage is green): `.github/copilot-instructions.md`, `.agents/instructions/`, `.agents/roles/`, `.agents/README.md`, `CODE_STYLE.md`, `docs/CODE_STYLE.md`, `docs/contribution.md`, `docs/architecture.md`, `docs/api.md`, and from `.agents/skills` + `.claude/skills`: `universe-dev-standards`, and from `.agents/skills` only: `brainstorming`, `skill-creator`, `frontend-design` (the mirror then removes nothing else).

`SCRATCH` below means the session scratchpad: `/private/tmp/claude-502/-Users-ReDL-Documents-Programming-Projects-uni-verse/a33f9090-ea71-4914-b273-c2a9c831da79/scratchpad`.

Source-file cheat sheet (line numbers are in the current files):

- `CP` = `.github/copilot-instructions.md` (§1 l.15–28, §2 l.30–50, §3 l.52–58, §4 l.60–74, §5 l.76–79, §6 l.81–84, §7 l.86–117, §8 l.119–141, §9 l.143–145, §10 l.147–149)
- `KE` = `.agents/instructions/karazin-edean.md`
- `SK` = `.agents/skills/universe-dev-standards/SKILL.md`
- `CS` = `CODE_STYLE.md`, `CS2` = `docs/CODE_STYLE.md`
- `CR` = `.coderabbit.yaml` (`path_instructions`, l.13–88)

---

### Task 1: Housekeeping and the coverage harness (red)

**Files:**

- Modify: `docs/superpowers/specs/2026-10-02-ai-instructions-restructure-design.md`
- Create: `$SCRATCH/verify-coverage.mjs` (not committed), `docs/ai/` (directory)
- Delete: empty untracked dir `agent/`

**Interfaces:**

- Produces: `node $SCRATCH/verify-coverage.mjs [--dest <file>]` — prints `MISSING <ID> <dest> <anchor>` per absent anchor, exits 1 if anything is missing. `<file>` is `AGENTS.md` or a name under `docs/ai/`. Anchors are case-insensitive substrings; later tasks must include them verbatim.

- [ ] **Step 1: Remove the empty leftover directory**

```bash
rmdir agent && ls -d agent 2>&1 | head -1
```

Expected: `ls: agent: No such file or directory` (`agent/skills` was already deleted in `e42f65f`).

- [ ] **Step 2: Fix two nits in the spec**

In the spec: change `Status: draft, awaiting review` to `Status: approved (2026-10-02)`. In the C25 row the unescaped `|` in `` `@universe/core/utils|constants` `` splits the table; replace it with `` `@universe/core/utils` or `@universe/core/constants` ``.

- [ ] **Step 3: Write the coverage script**

Write `$SCRATCH/verify-coverage.mjs`:

```js
import { existsSync, readFileSync } from 'node:fs';

const file = (name) => (name === 'AGENTS.md' ? 'AGENTS.md' : `docs/ai/${name}`);
const text = (name) =>
  existsSync(file(name)) ? readFileSync(file(name), 'utf8').toLowerCase() : '';

const A = 'AGENTS.md';
const CS = 'code-style.md';
const AR = 'architecture.md';
const FE = 'frontend.md';
const QU = 'quality.md';
const RV = 'review.md';
const WF = 'workflow.md';
const DE = 'domain-edean.md';
const DS = 'design-system.md';

// [id, [dest files], [anchors that must all appear in every dest]]
const rows = [
  ['C01', [A], ['Next.js 16']],
  ['C02', [A], ['Turborepo']],
  ['C03', [CS], ['UPPER_SNAKE_CASE']],
  ['C04', [CS], ['fields without default values first']],
  ['C05', [CS], ['single-letter']],
  ['C06', [CS], ['empty line before', 'return']],
  ['C07', [CS], ['explicit return types']],
  ['C08', [AR], ['@universe/core/types']],
  ['C09', [AR], ['packages/ui/components/']],
  ['C10', [AR], ['Do NOT export Una components']],
  ['C11', [CS], ['Toast = ToastProvider']],
  ['C12', [AR], ['Complex UI-Only Components']],
  ['C13', [AR], ['ask the user before writing code']],
  ['C14', [CS], ['.types.ts', 'trivial']],
  ['C15', [AR], ['STRICTLY PROHIBITED']],
  ['C16', [AR], ['Complex/*', 'Una/*']],
  ['C17', [AR], ['satisfies Meta<typeof Component>', 'StoryObj<typeof meta>']],
  ['C18', [AR], ['HTTP routing', 'Clean Architecture']],
  ['C19', [FE], ['React Server Components', 'use client']],
  ['C20', [FE], ['150-200 lines']],
  ['C21', [FE], ['formatMessage']],
  ['C22', [FE], ['uk.ts', 'en.ts']],
  ['C23', [FE], ['language-agnostic']],
  ['C24', [CS], ['helpers.ts', 'helpers.test.ts']],
  ['C25', [CS], ['<module>.helpers.ts', '@universe/core/utils']],
  ['C26', [AR], ['../../../']],
  ['C27', [AR], ['workspace:*']],
  ['C28', [WF], ['feature/', 'fix/', 'refactor/', 'chore/', 'hotfix/']],
  ['C29', [WF], ['Conventional Commits']],
  ['C30', [A], ['think through the architecture']],
  ['C31', [A], ['explain why the bug occurred']],
  ['C32', [CS], ['comments only for complex logic']],
  ['C33', [WF], ['focused PRs']],
  ['C34', [CS], ['more than 3 parameters', 'object parameter']],
  ['C35', [CS], ['backwards-compatibility', 're-export']],
  ['C36', [CS], ['redundant alias', 'single canonical']],
  ['C37', [A, RV], ['iamredl-lab']],
  ['C38', [RV], ['Principal Software Engineer']],
  [
    'C39',
    [RV],
    [
      'OVER-ENGINEERING',
      'DRY',
      'TASK INTENT',
      'AI SLOP',
      'REGRESSION',
      'SECURITY',
      'ACCESSIBILITY',
      'LEGACY SHIMS',
      'MONOLITHIC COMPONENTS',
      'INLINE HELPERS',
      'HARDCODED UI TEXT',
    ],
  ],
  ['C40', [RV], ['LGTM - No architectural bloat detected.']],
  ['C41', [A], ['docs/ai/design-system.md']],
  ['C42', [A], ['docs/ai/domain-edean.md']],
  ['S01', [AR], ['Zero internal dependencies']],
  ['S02', [AR], ['packages/types']],
  ['S03', [CS], ['GradeScoreThreshold', 'SimpleButton']],
  ['S04', [FE], ['BREAKPOINTS', 'narrower-than', 'wider-than']],
  ['S05', [DE], ['GRADES_THRESHOLD', 'Fx']],
  ['S06', [DE], ['Картка студента', 'Заліковка та бали']],
  ['S07', [CS], ['vertical-spacing']],
  ['S08', [QU], ['aria-expanded', 'aria-controls', 'radiogroup', '<dialog>']],
  ['S09', [QU], ['requestAnimationFrame', 'Focus Restoration', 'topmost', 'focus trap']],
  ['S10', [FE], ['useSyncExternalStore', 'set-state-in-effect']],
  ['S11', [FE], ['Ура, всі завдання виконані']],
  ['S12', [QU], ['S3358', 'S1854', 'S4323', 'S7763', 'S2245', 'S6847', '.at(-1)']],
  ['S13', [QU], ['strip-only mode']],
  ['S14', [WF], ['pnpm lint', 'pnpm typecheck', 'pnpm test', 'build-storybook']],
  ['S15', [WF], ['Pre-commit checklist']],
  ['E01', [DE], ['moodle.universemvp.tech']],
  ['E02', [DE], ['Sidebar footer']],
  ['E03', [DE], ['3-tier']],
  ['E04', [DE], ['@universe/core/constants/grades']],
  ['E05', [QU], ['export * from']],
  ['E06', [WF], ['prettier --write pnpm-lock.yaml']],
  ['E07', [WF], ['oxlint --fix']],
  ['E08', [QU], ['associated label']],
  ['K01', [CS], ['kebab-case']],
  ['K02', [WF], ['husky', 'lint-staged']],
  ['K03', [WF], ['public API']],
  ['D01', [DS], ['vars.scss']],
];

const destFilter = process.argv.includes('--dest')
  ? process.argv[process.argv.indexOf('--dest') + 1]
  : null;
let missing = 0;

for (const [id, dests, anchors] of rows) {
  for (const dest of dests) {
    if (destFilter && dest !== destFilter) continue;
    const body = text(dest);
    for (const anchor of anchors) {
      if (!body.includes(anchor.toLowerCase())) {
        console.log(`MISSING ${id} ${dest} :: ${anchor}`);
        missing += 1;
      }
    }
  }
}

console.log(missing === 0 ? 'ALL COVERED' : `${missing} anchors missing`);
process.exit(missing === 0 ? 0 : 1);
```

- [ ] **Step 4: Run it and confirm it fails**

Run: `node $SCRATCH/verify-coverage.mjs | tail -3`
Expected: ends with `NNN anchors missing` (≈150), exit code 1.

- [ ] **Step 5: Commit the spec fix**

```bash
pnpm exec prettier --write docs/superpowers/specs/2026-10-02-ai-instructions-restructure-design.md
git add docs/superpowers/specs/2026-10-02-ai-instructions-restructure-design.md
git commit -m "docs(ai): mark restructure spec approved and fix C25 table row"
```

---

### Task 2: `docs/ai/code-style.md`

**Files:**

- Create: `docs/ai/code-style.md`

**Interfaces:**

- Consumes: coverage script from Task 1.
- Produces: file imported by `AGENTS.md` (Task 8). Covers IDs C03–C07, C11, C14, C24, C25, C32, C34–C36, S03, S07, K01.

Sections, with where each comes from (port the wording; keep ✅/❌ examples; merge duplicates into one copy, never two):

| Section                               | Source                                                                    | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Naming                                | CP §1 (l.17–19), CS §1                                                    | camelCase / PascalCase / UPPER_SNAKE_CASE; file names `PascalCase.tsx` or `kebab-case.ts`, consistent within a package (K01)                                                                                                                                                                                                                                                                                                             |
| Descriptive names                     | CP l.21, CR rule 1                                                        | include the `c` → `course` Bad/Good snippet from CR                                                                                                                                                                                                                                                                                                                                                                                      |
| Vertical spacing                      | CP l.22–25, CR rule 2, SK §2D, KE rule 5                                  | include the `findById … return user` Good snippet; mention the `universe(vertical-spacing)` oxlint rule and `pnpm exec oxlint --fix`                                                                                                                                                                                                                                                                                                     |
| Props and parameter order             | CP l.20, CR rule 3                                                        | include the `ComponentProps` Good snippet                                                                                                                                                                                                                                                                                                                                                                                                |
| TypeScript strictness                 | CP l.26, l.28                                                             | "explicit return types" verbatim; avoid `any`, unneeded `unknown`, implicit types                                                                                                                                                                                                                                                                                                                                                        |
| Functions with more than 3 parameters | CP l.101–104, KE rule 6                                                   | keep the ✅/❌ `getStatusInfo` example and "named `type` or `interface`"                                                                                                                                                                                                                                                                                                                                                                 |
| Co-located types                      | CP l.43, CR rule 4                                                        | `<ComponentName>.types.ts` only for non-trivial props/data models, not trivial files. **Do not** include the "re-export for backwards compatibility" clause; state instead: import types directly from the `.types.ts` file                                                                                                                                                                                                              |
| Helpers placement                     | CP l.71–74 + l.95–98, KE rule 8, CR n/a                                   | `helpers.ts` + `helpers.test.ts` next to the code; backend DTO helpers in `<module>.helpers.ts`; cross-package helpers in `@universe/core/utils` or `@universe/core/constants`; no pure helpers inside components, hooks or DTOs                                                                                                                                                                                                         |
| Comments                              | CP l.90                                                                   | "Add comments only for complex logic or business rules" → keep the phrase "comments only for complex logic"                                                                                                                                                                                                                                                                                                                              |
| No backwards-compatibility shims      | CP l.105–108 + l.109–114, KE rule 1, SK §2A, CS §1 last bullet, CR rule 5 | **One** section. Must contain: ❌/✅ example block from SK §2A (`GradeScoreThreshold`, `SimpleButton`), the "import as X then re-export as original" anti-pattern, redundant local variable aliases (`const isCompleted = isGraded`), "single canonical identifier", "update all call sites and delete old files", and the one-line reason "internal monorepo, no external consumers". Include the `Toast = ToastProvider` example (C11) |
| Clean re-exports                      | —                                                                         | one line pointing to `quality.md` (Sonar S7763); do not restate                                                                                                                                                                                                                                                                                                                                                                          |

- [ ] **Step 1: Confirm the red state for this file**

Run: `node $SCRATCH/verify-coverage.mjs --dest code-style.md | tail -1`
Expected: `NN anchors missing` (exit 1).

- [ ] **Step 2: Write `docs/ai/code-style.md`** following the table. Start the file with `# Code Style` and one sentence saying these rules apply to all packages. Keep it under 8 KB.

- [ ] **Step 3: Format and re-run the check**

```bash
pnpm exec prettier --write docs/ai/code-style.md
node $SCRATCH/verify-coverage.mjs --dest code-style.md
```

Expected: `ALL COVERED`.

- [ ] **Step 4: Commit**

```bash
git add docs/ai/code-style.md
git commit -m "docs(ai): add code-style rules as single source"
```

---

### Task 3: `docs/ai/architecture.md`

**Files:**

- Create: `docs/ai/architecture.md`

**Interfaces:**

- Produces: always-loaded doc. Covers C08–C10, C12, C13, C15–C18, C26, C27, S01, S02.

| Section                       | Source                                                        | Notes                                                                                                                                                                                                                                                                                                                                                           |
| ----------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Packages and dependency rules | SK §1 (package tree + rules), KE tree                         | Real packages: `core` (`@universe/core`, zero internal dependencies, `types/`, `constants/`, `utils/`), `ui`, `backend`, `database`, `uni-hub`; plus `tests/e2e`. State: types live in `@universe/core/types`; never create a standalone `packages/types` (S02). Backend DTOs align with `@universe/core/types`. Do **not** mention `.agents/` in the tree      |
| Monorepo rules                | CP §5                                                         | no `../../../` across packages, use package names; `workspace:*`                                                                                                                                                                                                                                                                                                |
| UI components (`packages/ui`) | CP l.32–37                                                    | everything under `packages/ui/components/`; `una/` imported via `@una`; "Do NOT export Una components from the `@universe/ui` root"; `packages/ui/index.ts` only for non-Una exports                                                                                                                                                                            |
| Three placement tiers         | CP l.38–42, SK §1                                             | una (primitives, language-agnostic, no app logic), complex (**strictly UI-only**: no business logic, no data fetching, no store/context; props + callbacks), `packages/uni-hub/components/` (logic, stores, API). Include the phrase "ask the user before writing code" for the ambiguous case, and "reuse `complex` components from `@universe/ui` in uni-hub" |
| Storybook                     | CP l.44–50, `.agents/skills/storybook-story-writing/SKILL.md` | stories only in `packages/ui`; writing them in `uni-hub` or `backend` is "STRICTLY PROHIBITED"; sections `Una/*` and `Complex/*` with the two example titles; CSF3 with `satisfies Meta<typeof Component>` and `StoryObj<typeof meta>`; no `any`. Add: "Procedure: see the `storybook-story-writing` skill"                                                     |
| Backend (NestJS)              | CP §3                                                         | Clean Architecture; controllers only HTTP routing, parsing, response formatting; services hold business logic; Prisma injected as a service via `@universe/database`; DI; cohesive modules                                                                                                                                                                      |

- [ ] **Step 1: Confirm red**

Run: `node $SCRATCH/verify-coverage.mjs --dest architecture.md | tail -1`
Expected: `NN anchors missing`.

- [ ] **Step 2: Write `docs/ai/architecture.md`** following the table (< 6 KB). Verify package facts before writing: `ls packages configs tests` and `grep '"name"' packages/*/package.json`.

- [ ] **Step 3: Format and check**

```bash
pnpm exec prettier --write docs/ai/architecture.md
node $SCRATCH/verify-coverage.mjs --dest architecture.md
```

Expected: `ALL COVERED`.

- [ ] **Step 4: Commit**

```bash
git add docs/ai/architecture.md
git commit -m "docs(ai): add architecture rules as single source"
```

---

### Task 4: `docs/ai/frontend.md`

**Files:**

- Create: `docs/ai/frontend.md`

**Interfaces:**

- Produces: always-loaded doc. Covers C19–C23, S04, S10, S11.

| Section                     | Source                                  | Notes                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Server vs client components | CP l.62                                 | RSC first; `"use client"` only for interactivity or browser APIs                                                                                                                                                                                                                                                                                                                          |
| Component decomposition     | CP l.63–66 + l.92–94, KE rule 7, SK n/a | "150-200 lines" verbatim; subcomponent examples (`StudentCard`, `StatCardGrid`, `UpcomingEventsList`, `DeanContactInfo`); custom hooks for fetching, caching, listeners (`useDashboardData`, `useAssignmentStatuses`); thin pages and tabs                                                                                                                                                |
| Localization (i18n)         | CP l.67–70 + l.99–100, KE rule 9        | zero hardcoded strings; `useLanguage().formatMessage('key')`; keys in both `packages/uni-hub/i18n/locales/uk.ts` and `en.ts` (`Record<TranslationKey, string>`); `@universe/ui` stays "language-agnostic", labels via props such as `closeLabel?: string`                                                                                                                                 |
| Responsive breakpoints      | SK §2B                                  | Rewrite against the verified truth in Global Constraints: use the `BREAKPOINTS` map from `@universe/core` (never `768` or `'md'` literals in TS), `useMediaQuery('less', BREAKPOINTS.md)` / `useMediaQuery('wider', BREAKPOINTS.lg)` (or the swapped argument order), no second breakpoint object. Verify the import path with `grep -rn "BREAKPOINTS" packages/uni-hub --include='_.ts_' | head`. SCSS: `@use '@universe/ui/vars' as *;`with`narrower-than('md')`/`wider-than('lg')`(verify mixin names in`packages/ui/styles`) |
| SSR safety and hydration    | SK §3C                                  | no `window` initializers in `useState` (❌ example); use `useMediaQuery`/`useSyncExternalStore`; no synchronous `setState` in effects (rule name `react/set-state-in-effect` — keep the string `set-state-in-effect`). Replace the `Breakpoint.MD` call in the ✅ snippet with `useMediaQuery('less', BREAKPOINTS.md)`                                                                    |
| Meaningful empty states     | SK §3D                                  | filtered-empty vs truly-empty, with both Ukrainian strings verbatim ("Завдань за обраними фільтрами не знайдено", "Ура, всі завдання виконані! 🎉")                                                                                                                                                                                                                                       |

- [ ] **Step 1: Confirm red**

Run: `node $SCRATCH/verify-coverage.mjs --dest frontend.md | tail -1`
Expected: `NN anchors missing`.

- [ ] **Step 2: Verify the two facts the table asks to check**

```bash
grep -rn "narrower-than\|wider-than" packages/ui --include='*.scss' | grep -v node_modules | head -3
grep -rn "from '@universe/core'\|from '@core/constants/breakpoints'" packages/uni-hub --include='*.ts' --include='*.tsx' | grep -i breakpoint | head -3
```

Expected: the mixin definitions and at least one import showing the real path. Use what you see in the doc.

- [ ] **Step 3: Write `docs/ai/frontend.md`** following the table (< 6 KB).

- [ ] **Step 4: Format and check**

```bash
pnpm exec prettier --write docs/ai/frontend.md
node $SCRATCH/verify-coverage.mjs --dest frontend.md
```

Expected: `ALL COVERED`.

- [ ] **Step 5: Commit**

```bash
git add docs/ai/frontend.md
git commit -m "docs(ai): add frontend rules as single source"
```

---

### Task 5: `docs/ai/quality.md`

**Files:**

- Create: `docs/ai/quality.md`

**Interfaces:**

- Produces: always-loaded doc. Covers S08, S09, S12, S13, E05, E08. This is where the former skill's accessibility and Sonar content lives.

| Section                         | Source                          | Notes                                                                                                                                                                                                                                                                               |
| ------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Accessible interactive elements | SK §3A, KE rule 4 (last bullet) | semantic `<button type="button">`, never `onClick` on `div`/`span`; native `<dialog>`; `aria-expanded`, `aria-controls`, `role="radiogroup"` + `aria-label`; inputs need an "associated label" or `aria-label`; modals need a `title` and an accessible close button                |
| Modal lifecycle and focus trap  | SK §3B                          | all four points, keep the Escape snippet with `modalStack.at(-1)`; use the words "Focus Restoration", "topmost", "focus trap"                                                                                                                                                       |
| SonarCloud rules                | SK §4 table, KE rule 4          | keep the table (S3358, S1854, S4323, S7763, S2245, S6847, `.at(-1)`); under S7763 add `export * from '@universe/core/types'` as the re-export form (E05); under S2245 keep the deterministic-index alternative                                                                      |
| Node 22+ type-stripping         | SK §4                           | no TS `enum` ("strip-only mode" in the error text); const object + type pattern. Replace the stale `Breakpoint` example with a neutral one: `export const Status = { Active: 'active', Archived: 'archived' } as const; export type Status = (typeof Status)[keyof typeof Status];` |

- [ ] **Step 1: Confirm red**

Run: `node $SCRATCH/verify-coverage.mjs --dest quality.md | tail -1`
Expected: `NN anchors missing`.

- [ ] **Step 2: Write `docs/ai/quality.md`** following the table (< 5 KB).

- [ ] **Step 3: Format and check**

```bash
pnpm exec prettier --write docs/ai/quality.md
node $SCRATCH/verify-coverage.mjs --dest quality.md
```

Expected: `ALL COVERED`.

- [ ] **Step 4: Commit**

```bash
git add docs/ai/quality.md
git commit -m "docs(ai): add quality rules (a11y, Sonar) migrated from the dev-standards skill"
```

---

### Task 6: `docs/ai/review.md` and `docs/ai/design-system.md`

**Files:**

- Create: `docs/ai/review.md`
- Move: `docs/design-system-rules.md` → `docs/ai/design-system.md`

**Interfaces:**

- Produces: on-demand docs referenced from the `AGENTS.md` routing table (Task 8) and from `.coderabbit.yaml` (Task 10). Covers C37 (review half), C38–C40, D01.

- [ ] **Step 1: Confirm red**

```bash
node $SCRATCH/verify-coverage.mjs --dest review.md | tail -1
node $SCRATCH/verify-coverage.mjs --dest design-system.md | tail -1
```

Expected: both report missing anchors.

- [ ] **Step 2: Move the design-system file and adjust its audience line**

```bash
git mv docs/design-system-rules.md docs/ai/design-system.md
```

In `docs/ai/design-system.md` change the intro sentence "яких МАЮТЬ дотримуватися всі AI-агенти (Copilot, Cursor, Claude тощо) та розробники" to "яких мають дотримуватися AI-агенти та розробники". Change nothing else (the rules stay in Ukrainian).

- [ ] **Step 3: Write `docs/ai/review.md`**

Port CP §8 (l.119–141) verbatim in structure: role sentence ("Principal Software Engineer"), the 11 numbered failure modes with their capitalised headings, and the output requirements, including the exact approval string `LGTM - No architectural bloat detected.` Add at the top: "Used by CodeRabbit and by any agent asked to review." Add a final section "Reviewer canon": PR feedback from team reviewers (e.g. `iamredl-lab`) is top-priority standard (CP l.115–117, KE rule 10). In failure modes 8–11, replace restated rules by a link to the owning doc: `[code-style](code-style.md)`, `[frontend](frontend.md)`, keeping the heading text and one line of what to flag. Add the accessibility pointer `[quality](quality.md)` to mode 7 and the Sonar table pointer to mode 4.

- [ ] **Step 4: Format and check**

```bash
pnpm exec prettier --write docs/ai/review.md docs/ai/design-system.md
node $SCRATCH/verify-coverage.mjs --dest review.md
node $SCRATCH/verify-coverage.mjs --dest design-system.md
```

Expected: both `ALL COVERED`.

- [ ] **Step 5: Commit**

```bash
git add docs/ai/review.md docs/ai/design-system.md docs/design-system-rules.md
git commit -m "docs(ai): add review rubric and move design-system rules into docs/ai"
```

---

### Task 7: `docs/ai/workflow.md` and `docs/ai/domain-edean.md`

**Files:**

- Create: `docs/ai/workflow.md`, `docs/ai/domain-edean.md`

**Interfaces:**

- Produces: on-demand docs. Covers C28, C29, C33, S14, S15, E06, E07, K02, K03 (workflow) and S05, S06, E01–E04 (domain).

**workflow.md** sections:

| Section                | Source                                                        | Notes                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Branches, commits, PRs | CP §6 + l.91, `CONTRIBUTING.md` §1–2                          | Prefixes exactly `feature/`, `fix/`, `refactor/`, `chore/`, `hotfix/`; PRs to `develop`; Conventional Commits types from CONTRIBUTING; "Prefer smaller, focused PRs and commits" (keep "focused PRs"). Link `[CONTRIBUTING.md](../../CONTRIBUTING.md)` for merge criteria, Code Freeze and release; do not copy them                                                                |
| Hooks                  | CS2 §4                                                        | husky + lint-staged run lint and prettier on staged files; one shared oxlint config in `configs/oxlint`                                                                                                                                                                                                                                                                             |
| Verification pipeline  | SK §5, KE "Verification Pipeline", `.github/workflows/ci.yml` | `pnpm lint`, `pnpm lint:style`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm format:check`; `pnpm --filter @universe/ui build-storybook` when touching `packages/ui`; `pnpm test:e2e` for the Vitest suite; all with 0 errors and 0 warnings. If you edit anything under `.agents/skills`, run `pnpm skills:sync`, then `pnpm skills:check` (both are `package.json` scripts) |
| Tooling notes          | KE rule 5                                                     | `pnpm exec oxlint --fix` fixes vertical spacing; format the lockfile with `pnpm exec prettier --write pnpm-lock.yaml` (keep the string `prettier --write pnpm-lock.yaml`)                                                                                                                                                                                                           |
| Documentation          | CS2 §5                                                        | add a Markdown file describing the public API of a package ("public API")                                                                                                                                                                                                                                                                                                           |
| Pre-commit checklist   | SK §5                                                         | Heading `Pre-commit checklist`; each item one line that **links** to the owning doc instead of restating (aliases → code-style, breakpoints → frontend, nested ternaries/`.at(-1)`/`Math.random` → quality, placement tiers and Storybook scope → architecture, tests/typecheck/lint green)                                                                                         |

**domain-edean.md** sections:

| Section             | Source            | Notes                                                                                                                                                                                                                              |
| ------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Moodle gateway      | KE rule 2         | default host `https://moodle.universemvp.tech` (never `moodle.karazin.ua`); DTOs match `@universe/core/types`                                                                                                                      |
| Shared domain types | KE rule 1         | where entities and grade constants are imported from; keep `@universe/core/constants/grades` and `@universe/core/utils/grades`; drop the alias bullets (owned by code-style)                                                       |
| Portal navigation   | KE rule 3, SK §2D | the 5 Ukrainian tabs once, with «Заліковка та бали» described as "3-tier display" (100-point score, ECTS A–F, traditional mark); sidebar footer shows Moodle status with link `https://moodle.universemvp.tech` ("Sidebar footer") |
| Grading scale       | SK §2C            | the four bands with ECTS letters and Ukrainian exam/credit wording; the `GRADES_THRESHOLD` constants. Before writing, confirm against `packages/core/constants/grades.ts` and use the code as truth if it differs                  |

- [ ] **Step 1: Confirm red**

```bash
node $SCRATCH/verify-coverage.mjs --dest workflow.md | tail -1
node $SCRATCH/verify-coverage.mjs --dest domain-edean.md | tail -1
```

Expected: both report missing anchors.

- [ ] **Step 2: Check the grading source of truth**

Run: `sed -n 1,60p packages/core/constants/grades.ts`
Expected: threshold constants; reconcile any difference with SK §2C in favour of the code.

- [ ] **Step 3: Write both files** following the tables (workflow < 4 KB, domain < 3 KB).

- [ ] **Step 4: Format and check**

```bash
pnpm exec prettier --write docs/ai/workflow.md docs/ai/domain-edean.md
node $SCRATCH/verify-coverage.mjs --dest workflow.md
node $SCRATCH/verify-coverage.mjs --dest domain-edean.md
```

Expected: both `ALL COVERED`.

- [ ] **Step 5: Commit**

```bash
git add docs/ai/workflow.md docs/ai/domain-edean.md
git commit -m "docs(ai): add workflow and E-Dean domain docs"
```

---

### Task 8: Entry points — `AGENTS.md`, `CLAUDE.md`, `.gemini/settings.json`

**Files:**

- Create: `AGENTS.md`, `CLAUDE.md`, `.gemini/settings.json`
- Verify unchanged: `packages/uni-hub/AGENTS.md`, `packages/uni-hub/CLAUDE.md`

**Interfaces:**

- Consumes: the eight `docs/ai/*.md` files from Tasks 2–7.
- Produces: the always-loaded context for Claude and Gemini. Covers C01, C02, C30, C31, C37 (entry half), C41, C42.

- [ ] **Step 1: Write `AGENTS.md`**

```markdown
# UniVerse — Agent Instructions

Karazin UniVerse is a monorepo (Turborepo + pnpm workspaces): Next.js 16 (App Router), React 19, SCSS Modules and the Una design system on the front end; NestJS on the back end; PostgreSQL with Prisma; strict TypeScript everywhere.

## Packages

- `packages/core` — `@universe/core`: shared contracts, grade logic, constants (`@universe/core/types`)
- `packages/ui` — `@universe/ui`: Una design system (`@una`), SCSS tokens, Storybook
- `packages/uni-hub` — `@universe/uni-hub`: Next.js student portal
- `packages/backend` — `@universe/backend`: NestJS gateway over Moodle
- `packages/database` — `@universe/database`: Prisma data layer
- `tests/e2e` — Vitest requirement-driven suite

## Commands

`pnpm lint` · `pnpm lint:style` · `pnpm typecheck` · `pnpm test` · `pnpm build` · `pnpm format:check` — all must pass with zero warnings. Details in [workflow](docs/ai/workflow.md).

## Working agreements

- Before generating code, think through the architecture and how it fits the monorepo.
- When fixing a bug, explain why the bug occurred before providing the fix.
- Feedback from team reviewers on GitHub PRs (e.g. `iamredl-lab`) is top-priority canon; prevent previously flagged issues proactively.
- Do not add compatibility aliases, re-export shims or redundant names; update all call sites instead.
- Every UI string goes through a translation key; every new component is placed in the right tier first.

## Always-loaded rules

@docs/ai/code-style.md
@docs/ai/architecture.md
@docs/ai/frontend.md
@docs/ai/quality.md

## Read on demand

| When you are…                                 | Read                                                 |
| --------------------------------------------- | ---------------------------------------------------- |
| styling UI (colors, spacing, shadows, motion) | [docs/ai/design-system.md](docs/ai/design-system.md) |
| reviewing code or a PR                        | [docs/ai/review.md](docs/ai/review.md)               |
| branching, committing, running checks         | [docs/ai/workflow.md](docs/ai/workflow.md)           |
| touching Moodle, grades, or the E-Dean portal | [docs/ai/domain-edean.md](docs/ai/domain-edean.md)   |
```

The two last bullets of "Working agreements" are pointers, not new rules; each one-line summary of a rule that lives in a `docs/ai` file must not grow beyond one line. Keep the anchors `think through the architecture`, `explain why the bug occurred`, `iamredl-lab`, `docs/ai/design-system.md`, `docs/ai/domain-edean.md` verbatim.

- [ ] **Step 2: Write `CLAUDE.md`** (one line) and `.gemini/settings.json`

`CLAUDE.md`:

```markdown
@AGENTS.md
```

`.gemini/settings.json`:

```json
{
  "context": {
    "fileName": ["AGENTS.md"]
  }
}
```

- [ ] **Step 3: Confirm `uni-hub` files are untouched**

Run: `git diff --stat -- packages/uni-hub`
Expected: empty output.

- [ ] **Step 4: Format, check, measure**

```bash
pnpm exec prettier --write AGENTS.md CLAUDE.md .gemini/settings.json
node $SCRATCH/verify-coverage.mjs --dest AGENTS.md
wc -c AGENTS.md docs/ai/code-style.md docs/ai/architecture.md docs/ai/frontend.md docs/ai/quality.md
```

Expected: `ALL COVERED`; the five sizes sum to **under 25600 bytes**. If over, apply the spec rule: move the least universal section (candidate: Storybook from `architecture.md`) into an on-demand doc and add a row to the routing table. Do not shorten rules.

- [ ] **Step 5: Commit**

```bash
git add AGENTS.md CLAUDE.md .gemini/settings.json
git commit -m "docs(ai): add AGENTS.md entry point with Claude and Gemini wiring"
```

---

### Task 9: Skills — canonical `.agents/skills`, mirror script, cleanup

**Files:**

- Create: `scripts/sync-skills.mjs`, `.agents/skills/playwright-cli/` (copy)
- Modify: `package.json` (scripts), `skills-lock.json`
- Delete: `.agents/skills/{brainstorming,skill-creator,frontend-design,universe-dev-standards}`, `.claude/skills/universe-dev-standards` (the sync removes the latter)

**Interfaces:**

- Produces: `pnpm skills:sync` (make `.claude/skills` identical to `.agents/skills`), `pnpm skills:check` (exit 1 and list differences if not identical). Referenced by `workflow.md` (Task 7).

- [ ] **Step 1: Write the script**

`scripts/sync-skills.mjs`:

```js
import { cpSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(import.meta.url), '..', '..');
const source = join(root, '.agents', 'skills');
const target = join(root, '.claude', 'skills');
const isCheck = process.argv.includes('--check');

function listFiles(directory) {
  const files = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...listFiles(entryPath));
    } else {
      files.push(entryPath);
    }
  }

  return files;
}

function safeList(directory) {
  try {
    statSync(directory);

    return listFiles(directory).map((file) => relative(directory, file));
  } catch {
    return [];
  }
}

function findDifferences() {
  const sourceFiles = safeList(source);
  const targetFiles = safeList(target);
  const differences = [];

  for (const file of sourceFiles) {
    if (!targetFiles.includes(file)) {
      differences.push(`missing in .claude/skills: ${file}`);
    } else if (!readFileSync(join(source, file)).equals(readFileSync(join(target, file)))) {
      differences.push(`differs: ${file}`);
    }
  }

  for (const file of targetFiles) {
    if (!sourceFiles.includes(file)) {
      differences.push(`extra in .claude/skills: ${file}`);
    }
  }

  return differences;
}

if (isCheck) {
  const differences = findDifferences();

  if (differences.length > 0) {
    console.error(differences.join('\n'));
    console.error('\n.claude/skills is out of sync with .agents/skills. Run: pnpm skills:sync');
    process.exit(1);
  }

  console.log('.claude/skills matches .agents/skills');
} else {
  rmSync(target, { recursive: true, force: true });
  cpSync(source, target, { recursive: true });
  console.log('Synced .agents/skills -> .claude/skills');
}
```

- [ ] **Step 2: Add the scripts**

In `package.json` `scripts`, after `"format:check"`, add:

```json
    "skills:sync": "node scripts/sync-skills.mjs",
    "skills:check": "node scripts/sync-skills.mjs --check",
```

- [ ] **Step 3: Pull `playwright-cli` into the canonical folder first**

```bash
cp -R .claude/skills/playwright-cli .agents/skills/playwright-cli
git status --short .agents/skills/playwright-cli | head -3
```

Expected: `??` entries. This must happen **before** any sync, otherwise the mirror would delete it.

- [ ] **Step 4: Delete the skills that should not live in the repo**

```bash
git rm -r -q .agents/skills/universe-dev-standards .agents/skills/brainstorming .agents/skills/skill-creator .agents/skills/frontend-design
```

Only after the coverage script is green for S01–S15 is the **content** of `universe-dev-standards` considered migrated (Task 11 re-runs the full script). The skill text stays recoverable from git history (`git show HEAD:.agents/skills/universe-dev-standards/SKILL.md`).

- [ ] **Step 5: Prove `--check` detects drift, then sync**

```bash
pnpm skills:check; echo "exit=$?"
```

Expected: lists `extra in .claude/skills: universe-dev-standards/SKILL.md` (and nothing about `playwright-cli`, which now exists in both), then `exit=1`.

```bash
pnpm skills:sync
pnpm skills:check; echo "exit=$?"
```

Expected: `Synced …`, then `.claude/skills matches .agents/skills`, `exit=0`.

- [ ] **Step 6: Prove a hand edit is caught**

```bash
echo "x" >> .claude/skills/storybook-story-writing/SKILL.md
pnpm skills:check; echo "exit=$?"
pnpm skills:sync && pnpm skills:check
```

Expected: `differs: storybook-story-writing/SKILL.md`, `exit=1`; after sync, matches.

- [ ] **Step 7: Update `skills-lock.json`**

Remove the entries `brainstorming`, `frontend-design`, `skill-creator` (they no longer exist in the repo). Leave all other entries. `playwright-cli` has no known upstream source and is not added to the lock. Validate: `node -e "JSON.parse(require('fs').readFileSync('skills-lock.json','utf8')); console.log('ok')"` → `ok`.

- [ ] **Step 8: Commit**

```bash
pnpm exec prettier --write package.json skills-lock.json scripts/sync-skills.mjs
git add scripts/sync-skills.mjs package.json skills-lock.json .agents .claude
git commit -m "chore(skills): make .agents/skills canonical with a .claude mirror script and drop redundant skills"
```

---

### Task 10: CodeRabbit configuration

**Files:**

- Modify: `.coderabbit.yaml`

**Interfaces:**

- Consumes: `AGENTS.md`, `docs/ai/review.md`, rest of `docs/ai/`.

- [ ] **Step 1: Replace the file content**

```yaml
# yaml-language-server: $schema=https://coderabbit.ai/integrations/schema.v2.json
language: 'en-US'
knowledge_base:
  code_guidelines:
    enabled: true
    filePatterns:
      - 'AGENTS.md'
      - 'docs/ai/**/*.md'
  mcp:
    usage: enabled
reviews:
  path_instructions:
    - path: '**/*.{ts,tsx}'
      instructions: |
        Apply the review rubric and output format from docs/ai/review.md.
        The rules themselves live in AGENTS.md and docs/ai/*.md; do not rely on rules restated here.
```

The four formatting rules that were inlined here now live in `docs/ai/code-style.md` (covered by C03–C07, C14, S03, S07), so nothing is lost. The `path_instructions` entry is a pointer, not a rule copy.

- [ ] **Step 2: Validate YAML syntax**

Run: `python3 -c "import yaml,sys; yaml.safe_load(open('.coderabbit.yaml')); print('yaml ok')"`
Expected: `yaml ok`. (If `yaml` is missing: `node -e "require('node:fs').readFileSync('.coderabbit.yaml','utf8')"` plus a visual check; do not install packages.)

- [ ] **Step 3: Commit**

```bash
pnpm exec prettier --write .coderabbit.yaml
git add .coderabbit.yaml
git commit -m "chore(coderabbit): read AGENTS.md and docs/ai, drop duplicated inline rules"
```

---

### Task 11: Full coverage check, then delete the old files

**Files:**

- Delete: `.github/copilot-instructions.md`, `.agents/instructions/`, `.agents/roles/`, `.agents/README.md`, `CODE_STYLE.md`, `docs/CODE_STYLE.md`, `docs/contribution.md`, `docs/architecture.md`, `docs/api.md`

**Interfaces:**

- Consumes: green coverage across all files. Nothing after this task reads the deleted files.

- [ ] **Step 1: Full coverage run (gate)**

Run: `node $SCRATCH/verify-coverage.mjs; echo "exit=$?"`
Expected: `ALL COVERED`, `exit=0`. If any `MISSING` line appears, fix the owning doc (Tasks 2–7) and commit before continuing. Do not delete anything while this is red.

- [ ] **Step 2: Human pass on corrected and dropped rows**

Read the spec's "Corrections made during migration" (7 items) and confirm each in the new docs:

```bash
grep -rn "@universe/types" AGENTS.md docs/ai; echo "---"
grep -n "backwards compat" docs/ai/code-style.md
grep -n "bugfix/" docs/ai
grep -rn "packages/ui/src" AGENTS.md docs/ai
grep -rn "Breakpoint\.\(MD\|md\)" AGENTS.md docs/ai
```

Expected: no `@universe/types` outside an explicit "never create" sentence; the `.types.ts` text does not tell people to re-export; no `bugfix/`; no `packages/ui/src`; no `Breakpoint.MD`.

- [ ] **Step 3: Delete the old files**

```bash
git rm -r -q .github/copilot-instructions.md .agents/instructions .agents/roles .agents/README.md CODE_STYLE.md docs/CODE_STYLE.md docs/contribution.md docs/architecture.md docs/api.md
```

- [ ] **Step 4: Find dangling references**

```bash
grep -rnE "copilot-instructions|karazin-edean|CODE_STYLE|\.agents/(instructions|roles)|universe-dev-standards|design-system-rules" . \
  --include='*.md' --include='*.yaml' --include='*.yml' --include='*.json' --include='*.cjs' --include='*.mjs' \
  -I 2>/dev/null | grep -vE "node_modules|pnpm-lock|^./docs/superpowers/"
```

Expected: no output. For each hit, update the reference to the new file (usually `docs/ai/…`) or remove it.

- [ ] **Step 5: Commit**

```bash
git add -A .github .agents docs CODE_STYLE.md
git commit -m "docs(ai): remove superseded instruction files now covered by AGENTS.md and docs/ai"
```

---

### Task 12: Final verification

**Files:** none changed unless a check fails.

- [ ] **Step 1: Repo checks**

```bash
pnpm format:check
pnpm lint
pnpm skills:check
node $SCRATCH/verify-coverage.mjs
```

Expected: all pass; `ALL COVERED`. (`pnpm typecheck`, `pnpm test` and `pnpm build` are unaffected by Markdown-only changes plus one script, so they are not part of this gate; run them only if `package.json` changes beyond the two scripts.)

- [ ] **Step 2: Size budget**

```bash
wc -c AGENTS.md docs/ai/code-style.md docs/ai/architecture.md docs/ai/frontend.md docs/ai/quality.md | tail -1
```

Expected: total under `25600`.

- [ ] **Step 3: Claude check** (run by the user; requires a fresh session in the repo root)

Start `claude`, run `/memory` (or `/context`) and confirm `AGENTS.md` plus the four `docs/ai` files are listed. Ask: "Where should a new card component that shows grades from the store live?" Expected: answer names the three tiers and chooses `packages/uni-hub/components/`, with no skill invocation.

- [ ] **Step 4: Gemini check** (run by the user)

Start `gemini` in the repo root, run `/memory show`, and ask the same question. Expected: same answer, and the memory dump contains text from `docs/ai/architecture.md`. If the imports are not expanded (memory shows `AGENTS.md` with literal `@docs/ai/…` lines), do not duplicate rules into another file; report back so the design can be revisited (Review Focus 1).

- [ ] **Step 5: CodeRabbit check** (after the branch is pushed by the user)

On the PR, confirm CodeRabbit's summary or comments cite `docs/ai` rules and no longer fail on missing files. No action in this plan.

- [ ] **Step 6: Report**

Summarise: files created, files deleted, coverage result, size, and which manual checks (3–5) are pending.
