# AI Instructions Restructure — Design

Date: 2026-10-02
Status: approved (2026-10-02)

## Goal

One source of truth for AI-facing project rules, readable by Claude Code and Gemini CLI (the only two agents we support) and by the CodeRabbit reviewer. No rule is stated in more than one place; other places link to it.

## Problems being fixed

1. No root `CLAUDE.md` / `AGENTS.md` / `GEMINI.md`. Claude sees the rules only if the `universe-dev-standards` skill triggers; Gemini sees them the same way. `copilot-instructions.md`, `karazin-edean.md` and `CODE_STYLE.md` are read only by Copilot and CodeRabbit.
2. The same rules (i18n, helpers placement, >3 params, no aliases/shims, decomposition, PR feedback) are repeated in 4–5 files: `copilot-instructions.md`, `karazin-edean.md`, `universe-dev-standards/SKILL.md`, `.agents/roles/*`, `.coderabbit.yaml`.
3. Skills exist in three drifting copies: `agent/skills`, `.claude/skills`, `.agents/skills`.
4. Contradictions and stale facts (see "Corrections made during migration").

## Target structure

```
AGENTS.md                      # entry point: core rules + @imports of the always-loaded docs
CLAUDE.md                      # one line: @AGENTS.md
.gemini/settings.json          # { "context": { "fileName": ["AGENTS.md"] } }
packages/<pkg>/AGENTS.md       # package-local rules only (+ CLAUDE.md = @AGENTS.md)
docs/ai/
  # always loaded (imported from AGENTS.md)
  code-style.md                # naming, spacing, params, aliases/shims, helpers, TS strictness
  architecture.md              # packages, UI tiers, Storybook, NestJS layering, monorepo rules
  frontend.md                  # RSC, decomposition, i18n, breakpoints, SSR/hydration
  quality.md                   # a11y, modal lifecycle, Sonar rules, Node type-stripping (from the old skill)
  # on demand (routing table in AGENTS.md)
  design-system.md             # moved from docs/design-system-rules.md
  review.md                    # review criteria, used by CodeRabbit and Claude
  workflow.md                  # git flow, commits, verification pipeline, pre-commit checklist
  domain-edean.md              # Moodle gateway, grading scale, E-Dean tabs
.agents/skills/                # canonical third-party/procedural skills (Gemini reads this natively)
.claude/skills/                # mirror of .agents/skills for Claude
```

### Always-loaded vs on-demand

Project rules are plain instructions, not skills: a skill only loads when its description matches, which is exactly why agents "don't see" the code style today. `AGENTS.md` therefore imports `code-style`, `architecture`, `frontend` and `quality` with `@docs/ai/….md` (Claude Code and Gemini CLI both expand `@file.md` imports), so they are in context every session. The rest are reached through a routing table "working on X → read `docs/ai/Y.md`".

Budget: the always-loaded set (AGENTS.md + 4 imports) stays under ~25 KB. If it grows past that, move the least universal section to on-demand, do not shorten rules. `AGENTS.md` itself holds the stack, commands, package map, and a short list of non-negotiables; it must not restate details that live in `docs/ai/`.

CodeRabbit and Copilot do not expand `@` imports, so they read the same files directly through `code_guidelines.filePatterns` (`docs/ai/**`).

Package `AGENTS.md` in `packages/uni-hub` keeps the `next dev`-managed block (`BEGIN/END:nextjs-agent-rules`) untouched; our rules go outside it.

## Skills

- `.agents/skills/` is canonical. `.claude/skills/` mirrors it (mechanism — symlink vs sync script with CI check — decided at implementation; the repo has Windows contributors, so symlinks need verification).
- `universe-dev-standards` is **deleted** (from `.agents/skills` and `.claude/skills`). Its content becomes plain instructions per the S-matrix below.
- `storybook-story-writing` stays as a skill (it is a procedure, not a standing rule); scope/section rules are referenced from `docs/ai/architecture.md`, not duplicated.
- After this change the only project-specific skill is `storybook-story-writing`; everything else in `skills/` is third-party.
- Delete `agent/skills/` (stale leftover).
- Remove vendor copies already provided globally: `brainstorming`, `skill-creator`, `frontend-design`. Remaining vendor skills are kept and listed in `skills-lock.json`.
- Add missing `playwright-cli` to `.agents/skills` (present only in `.claude`).

## Reviewer integration

`.coderabbit.yaml`: `code_guidelines.filePatterns` → `AGENTS.md`, `docs/ai/**/*.md`. Remove the inline `path_instructions` for `**/*.{ts,tsx}` (all four rules move to `docs/ai/code-style.md`). The "AI Code Review Culture" section becomes `docs/ai/review.md`, the single review rubric.

## Removals

| File                                                                               | Disposition                                                                                    |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `.github/copilot-instructions.md`                                                  | delete after coverage check (below)                                                            |
| `.agents/skills/universe-dev-standards/`, `.claude/skills/universe-dev-standards/` | content split into `docs/ai/*` (S-matrix), skill deleted                                       |
| `.agents/instructions/karazin-edean.md`                                            | content split into `docs/ai/*`, file deleted                                                   |
| `.agents/roles/*`                                                                  | delete (rules duplicated elsewhere; not loaded by any agent)                                   |
| `.agents/README.md`                                                                | delete                                                                                         |
| `CODE_STYLE.md`, `docs/CODE_STYLE.md`                                              | merged into `docs/ai/code-style.md`, deleted                                                   |
| `docs/contribution.md`, `docs/architecture.md`, `docs/api.md`                      | stubs; delete (human docs can be rewritten separately)                                         |
| `CONTRIBUTING.md`                                                                  | keep for humans; branch/commit/PR rules in `docs/ai/workflow.md` link to it instead of copying |

Also deleted: `PROJECT.md`, `ORIGINAL_REQUEST.md`, `TEST_INFRA.md`, `TEST_READY.md` (stale pipeline artifacts with Windows paths; not referenced by any tooling).

## Coverage matrix: `copilot-instructions.md` → new home

Every rule below must exist in the destination before the file is deleted. IDs are used by the verification script.

| ID  | Rule (source section)                                                                                                                                                                       | Destination                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| C01 | Tech stack: Next.js 16 App Router, React 19, SCSS Modules, Una, NestJS, PostgreSQL + Prisma, strict TS (Core stack)                                                                         | `AGENTS.md`                                                      |
| C02 | Monorepo = Turborepo + pnpm workspaces (intro)                                                                                                                                              | `AGENTS.md`                                                      |
| C03 | camelCase / PascalCase / UPPER_SNAKE_CASE (§1)                                                                                                                                              | `code-style.md`                                                  |
| C04 | Props and params order: required first, then optional/defaulted (§1)                                                                                                                        | `code-style.md`                                                  |
| C05 | Descriptive names, no `c`/`u`/`e` (§1)                                                                                                                                                      | `code-style.md`                                                  |
| C06 | Vertical spacing, empty line before `return` (§1)                                                                                                                                           | `code-style.md`                                                  |
| C07 | Strict TS: avoid `any`/`unknown`/implicit types; explicit return types (§1)                                                                                                                 | `code-style.md`                                                  |
| C08 | Shared types/DTOs in one shared package for frontend and backend (§1)                                                                                                                       | `architecture.md` — **corrected to `@universe/core/types`**      |
| C09 | All shared UI under `packages/ui/components/` (§2)                                                                                                                                          | `architecture.md`                                                |
| C10 | Una not exported from `@universe/ui` root; import via `@una` (§2)                                                                                                                           | `architecture.md`                                                |
| C11 | No unnecessary component aliases, canonical names (§2)                                                                                                                                      | `code-style.md` (merged with C26)                                |
| C12 | Three placement tiers: una / complex (UI-only) / uni-hub (logic) (§2)                                                                                                                       | `architecture.md`                                                |
| C13 | Decide tier before creating a component; ask the user if ambiguous; reuse `complex` in uni-hub (§2)                                                                                         | `architecture.md`                                                |
| C14 | `<Component>.types.ts` for non-trivial props; not for trivial files (§2)                                                                                                                    | `code-style.md` — re-export clause **dropped**, see corrections  |
| C15 | Stories only in `packages/ui`; never in uni-hub/backend (§2)                                                                                                                                | `architecture.md` (+ `storybook-story-writing` skill links here) |
| C16 | Storybook sections `Una/*` and `Complex/*` (§2)                                                                                                                                             | `architecture.md`                                                |
| C17 | CSF3 with `satisfies Meta<typeof Component>` / `StoryObj<typeof meta>`, no `any` (§2)                                                                                                       | `architecture.md`                                                |
| C18 | NestJS Clean Architecture: controllers routing only, services hold logic, Prisma injected via `@universe/database`, DI, cohesive modules (§3)                                               | `architecture.md`                                                |
| C19 | RSC first; `"use client"` only for interactivity/browser APIs (§4)                                                                                                                          | `frontend.md`                                                    |
| C20 | Decompose components >~150–200 lines into subcomponents; logic into hooks; thin pages/tabs (§4, §7)                                                                                         | `frontend.md`                                                    |
| C21 | Zero hardcoded UI strings; `useLanguage().formatMessage('key')` (§4, §7)                                                                                                                    | `frontend.md`                                                    |
| C22 | Keys symmetric in `uk.ts` and `en.ts` (§4, §7)                                                                                                                                              | `frontend.md`                                                    |
| C23 | `@universe/ui` language-agnostic; labels via props (§4)                                                                                                                                     | `frontend.md`                                                    |
| C24 | Helpers not inside components/hooks/DTOs; co-located `helpers.ts` + `helpers.test.ts` (§4, §7)                                                                                              | `code-style.md`                                                  |
| C25 | Cross-package helpers go to `@universe/core/utils` or `@universe/core/constants`; backend DTO helpers in `<module>.helpers.ts` (§4, §7)                                                     | `code-style.md`                                                  |
| C26 | No cross-package `../../../`; use package names (§5)                                                                                                                                        | `architecture.md`                                                |
| C27 | Workspace deps as `workspace:*` (§5)                                                                                                                                                        | `architecture.md`                                                |
| C28 | Branch prefixes (§6)                                                                                                                                                                        | `workflow.md` — aligned with CONTRIBUTING, see corrections       |
| C29 | Conventional Commits (§6)                                                                                                                                                                   | `workflow.md`                                                    |
| C30 | Think through architecture before generating code (§7)                                                                                                                                      | `AGENTS.md`                                                      |
| C31 | When fixing a bug, explain why it occurred before the fix (§7)                                                                                                                              | `AGENTS.md`                                                      |
| C32 | Self-documenting code; comments only for complex logic/business rules (§7)                                                                                                                  | `code-style.md`                                                  |
| C33 | Small focused PRs and commits (§7)                                                                                                                                                          | `workflow.md`                                                    |
| C34 | Functions with >3 params take an object param with a named type (with ✅/❌ example) (§7)                                                                                                   | `code-style.md`                                                  |
| C35 | No backwards-compat shims, re-export proxies, deprecated files; update all call sites, delete old files (§7)                                                                                | `code-style.md`                                                  |
| C36 | No redundant aliases for types/enums/constants/variables; no import-as-then-re-export; single canonical identifier (§7)                                                                     | `code-style.md`                                                  |
| C37 | Reviewer (`iamredl-lab`) PR feedback is canon; learn from it (§7)                                                                                                                           | `AGENTS.md` + `review.md`                                        |
| C38 | Review role: rigorous Principal Engineer (§8)                                                                                                                                               | `review.md`                                                      |
| C39 | Review failure modes 1–11: over-engineering, DRY, task intent, AI slop, regressions, security, a11y, legacy shims, monolithic components, inline helpers/DTO pollution, hardcoded text (§8) | `review.md` (all 11 kept)                                        |
| C40 | Review output: severity, quoted lines, maintenance burden, simpler replacement, prefer no finding, "LGTM - No architectural bloat detected." (§8)                                           | `review.md`                                                      |
| C41 | Design-system rules live in `docs/design-system-rules.md`; must be read for UI work (§9)                                                                                                    | `AGENTS.md` routing table → `docs/ai/design-system.md`           |
| C42 | E-Dean guidelines in `.agents/instructions/karazin-edean.md` (§10)                                                                                                                          | `AGENTS.md` routing table → `docs/ai/domain-edean.md`            |

## Coverage matrix: `universe-dev-standards/SKILL.md` → new home

Same verification as above (anchor phrase per ID, grep in the new files before deleting the skill).

| ID  | Content (skill section)                                                                                                                                                                     | Destination                                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| S01 | Package tree and dependency rules: core has zero internal deps, ui consumed by frontends, backend DTOs align with core types, uni-hub RSC-first (§1)                                        | `architecture.md` (shared with C08–C13)                                          |
| S02 | `packages/types` must never be a standalone package; types live in `@universe/core/types` (§1)                                                                                              | `architecture.md`                                                                |
| S03 | Zero redundant aliases / legacy shims, with ❌/✅ examples (§2A)                                                                                                                            | `code-style.md` (merged with C35/C36, one copy)                                  |
| S04 | Breakpoints: no magic numbers or string literals, `BREAKPOINTS` map + `useMediaQuery(bp, 'less'\|'wider')`, no duplicate breakpoint objects, SCSS mixins `narrower-than`/`wider-than` (§2B) | `frontend.md` (breakpoint naming checked against `@universe/core`, correction 6) |
| S05 | Grading scale: EXCELLENT 90–100 (A), GOOD 70–89 (B 82–89 / C 70–81), SATISFACTORY 50–69 (D/E), FAIL 0–49 (Fx/F), exam/credit wording, `GRADES_THRESHOLD` constants (§2C)                    | `domain-edean.md`                                                                |
| S06 | The 5 Ukrainian portal tab labels (§2D)                                                                                                                                                     | `domain-edean.md` (single copy; also removed from `karazin-edean.md`)            |
| S07 | `universe(vertical-spacing)` blank-line rule (§2D)                                                                                                                                          | `code-style.md` (merged with C06)                                                |
| S08 | Semantic `<button>`, no `onClick` on `div`/`span`; native `<dialog>`; `aria-expanded`, `aria-controls`, `radiogroup` + `aria-label` (§3A)                                                   | `quality.md`                                                                     |
| S09 | Modal lifecycle: initial focus via `requestAnimationFrame`, focus restoration, topmost-only Escape (with snippet), Tab focus trap (§3B)                                                     | `quality.md`                                                                     |
| S10 | SSR/hydration: no `window` initializers in `useState`, use `useSyncExternalStore`/`useMediaQuery`; no synchronous `setState` in effects (§3C)                                               | `frontend.md`                                                                    |
| S11 | Meaningful empty states: filtered-empty vs truly-empty (§3D)                                                                                                                                | `frontend.md`                                                                    |
| S12 | Sonar table: S3358 nested ternaries, S1854 dead stores, S4323 redundant unions, S7763 clean re-exports, S2245 insecure PRNG, S6847 native HTML, ES2022 `.at(-1)` (§4)                       | `quality.md` (also feeds `review.md`)                                            |
| S13 | Node 22+ type-stripping: no TS `enum`, const object + type pattern (§4)                                                                                                                     | `quality.md`                                                                     |
| S14 | Verification pipeline: lint, typecheck, test, Storybook build when touching `packages/ui` (§5)                                                                                              | `workflow.md` (aligned with CI, correction 7)                                    |
| S15 | Pre-commit checklist (§5)                                                                                                                                                                   | `workflow.md`, referencing rules instead of restating them                       |

Rules C11/C14/C35/C36 overlap with `karazin-edean.md`, `universe-dev-standards` and `CODE_STYLE.md`; during migration each is written once in its destination and the other copies are deleted, not merged line by line.

## Corrections made during migration

These are existing contradictions; the spec picks one side. Override any of them in review.

1. **Shared types package.** `copilot-instructions.md` says `@universe/types`; that package no longer exists (`packages/types` is an untracked empty dir). Canonical is `@universe/core/types`.
2. **`.types.ts` re-export.** The "re-export types from the component file for backwards compatibility" clause contradicts the no-shims rule (C35). Resolution: consumers import types from `<Component>.types.ts` directly; no re-export.
3. **Branch prefixes.** `copilot-instructions.md` uses `bugfix/`; `CONTRIBUTING.md` uses `fix/` plus `refactor/`. Resolution: follow `CONTRIBUTING.md` (`feature/`, `fix/`, `refactor/`, `chore/`, `hotfix/`). PRs target `develop`, not `main`.
4. **Component paths.** `CODE_STYLE.md` says `packages/ui/src/components/…`; `src/` was removed in #144. Use `packages/ui/components/…`.
5. **`complex` components.** `CODE_STYLE.md` allows them to manage UI state and be composed freely; the newer rule (RS-117) makes them strictly UI-only. The stricter rule wins.
6. **Breakpoints.** `universe-dev-standards` mixes `BREAKPOINTS.md` and `Breakpoint.MD`. Verify against `@universe/core` source during implementation and keep only the real one.
7. **Verification pipeline.** `pnpm lint`, `pnpm typecheck`, `pnpm test` (+ `pnpm lint:style`, `pnpm build` as in CI) replace the `npx oxlint` / `tsc -p` variants.

## Verification before deleting `copilot-instructions.md`

1. For each ID C01–C42, pick one distinctive anchor phrase from the original and `grep` for it in the new files; the script lists any ID with no match. Run it from the scratchpad, not committed.
2. A human pass on the matrix rows marked "corrected" or "dropped".
3. Only after both pass: delete `copilot-instructions.md`, `karazin-edean.md`, roles, old style guides.

## Verification of the new setup

- Measure the always-loaded size (`wc -c AGENTS.md docs/ai/{code-style,architecture,frontend,quality}.md`) and confirm it is under ~25 KB.
- `claude` in the repo root: ask "what are the rules for adding a new component?" — the answer cites the 3 tiers without invoking any skill. Run `/memory` (or `/context`) to confirm the four imported docs are loaded.
- `gemini` in the repo root: same question, same answer.
- Open a throwaway PR (or re-run CodeRabbit on an existing one) and confirm it quotes rules from `docs/ai/*`.
- `pnpm lint` and `prettier --check` pass (docs now live under `docs/`, not in the oxlint-ignored `.agents/`).

## Out of scope

- Rewriting human-facing docs (`ONBOARDING.md`, `README.md`, `api.md`).
- The four stale pipeline artifacts in the repo root.
- Choosing the `.claude/skills` mirroring mechanism (decided in the plan).
- Any change to code, lint rules or CI.
