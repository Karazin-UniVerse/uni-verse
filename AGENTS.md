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

`pnpm lint` · `pnpm lint:style` · `pnpm typecheck` · `pnpm test` · `pnpm build` must pass with zero warnings, and prettier must pass on the files you changed. Details in [workflow](docs/ai/workflow.md).

## Working agreements

- Before generating code, think through the architecture and how it fits the monorepo.
- When fixing a bug, explain why the bug occurred before providing the fix.
- Feedback from team reviewers on GitHub PRs (for example `iamredl-lab`) is top-priority canon; prevent previously flagged issues proactively.
- Do not add compatibility aliases, re-export shims or redundant names; update all call sites instead.
- Every UI string goes through a translation key; decide the component tier before creating a component.
- Keep it simple and reuse before writing: [KISS](docs/ai/code-style.md#keep-it-simple-kiss), [DRY and where shared code lives](docs/ai/code-style.md#reuse-before-writing-dry).
- Rules apply to code you write or touch. Do not refactor unrelated code to match them; mention a violation you notice in the PR description.
- Preserve business logic: [preservation of business logic](docs/ai/code-style.md#preservation-of-business-logic).
- Before saying a task is done, walk the [pre-commit checklist](docs/ai/workflow.md#pre-commit-checklist) and fix what it flags.
- If a reviewer asks to "add this to the instructions", update the matching file in `docs/ai/` (not a skill) and keep each rule in one place.

## Always-loaded rules

These four files are loaded into every session: Claude Code imports them from `CLAUDE.md`, Gemini CLI and Antigravity read them from the generated `GEMINI.md`. Edit the files in `docs/ai/`, never `GEMINI.md`.

- [docs/ai/code-style.md](docs/ai/code-style.md)
- [docs/ai/architecture.md](docs/ai/architecture.md)
- [docs/ai/frontend.md](docs/ai/frontend.md)
- [docs/ai/quality.md](docs/ai/quality.md)

## Read on demand

| When you are…                                                                                                           | Read                                                                                                                                                                                    |
| ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| building or styling UI components (colors, typography, spacing, radii, shadows, z-index, motion) — you MUST read it     | [docs/ai/design-system.md](docs/ai/design-system.md)                                                                                                                                    |
| reviewing code or a PR                                                                                                  | [docs/ai/review.md](docs/ai/review.md)                                                                                                                                                  |
| writing an API client, constants or magic values, env variables or config                                               | [docs/ai/api-and-config.md](docs/ai/api-and-config.md)                                                                                                                                  |
| branching, committing, running checks                                                                                   | [docs/ai/workflow.md](docs/ai/workflow.md)                                                                                                                                              |
| reading or writing API data in `uni-hub` (queries, mutations, caching), or adding a type shared by frontend and backend | [docs/ai/data-and-contracts.md](docs/ai/data-and-contracts.md)                                                                                                                          |
| touching Moodle, grades, or the E-Dean portal                                                                           | [docs/ai/domain-uni-hub.md](docs/ai/domain-uni-hub.md)                                                                                                                                  |
| optimizing performance, fixing slow queries, profiling Core Web Vitals (LCP, INP, CLS) or bundle size                   | [.agents/skills/performance-optimization/SKILL.md](.agents/skills/performance-optimization/SKILL.md) & [docs/ai/references/performance-checklist.md](docs/ai/references/performance-checklist.md) |
| debugging interactive UI in a live browser, verifying DOM state, console errors, or hydration mismatches                | [.agents/skills/browser-testing-with-devtools/SKILL.md](.agents/skills/browser-testing-with-devtools/SKILL.md)                                                                         |
| refactoring and simplifying code for readability without altering behavior (Chesterton's Fence)                        | [.agents/skills/code-simplification/SKILL.md](.agents/skills/code-simplification/SKILL.md)                                                                                               |
| designing or modifying API endpoints, DTOs, interfaces, or package boundaries in `@universe/core`                       | [.agents/skills/api-and-interface-design/SKILL.md](.agents/skills/api-and-interface-design/SKILL.md) & [docs/ai/data-and-contracts.md](docs/ai/data-and-contracts.md)                   |
| auditing security, handling auth tokens, SSO sessions, user input validation, or external Moodle integrations           | [.agents/skills/security-and-hardening/SKILL.md](.agents/skills/security-and-hardening/SKILL.md) & [docs/ai/references/security-checklist.md](docs/ai/references/security-checklist.md) |
| setting up or checking repository constraints, test thresholds, or verifying no quality bar was weakened                | [.agents/skills/constraint-driven-development/SKILL.md](.agents/skills/constraint-driven-development/SKILL.md) & [CONSTRAINTS.md](CONSTRAINTS.md)                                       |
| removing, renaming, or migrating database columns, Prisma models, or legacy API endpoints with zero downtime            | [.agents/skills/deprecation-and-migration/SKILL.md](.agents/skills/deprecation-and-migration/SKILL.md)                                                                                 |
| stress-testing critical, security-sensitive, or high-stakes logic (auth, grading algorithms, irreversible operations)   | [.agents/skills/doubt-driven-development/SKILL.md](.agents/skills/doubt-driven-development/SKILL.md)                                                                                   |
| handling an underspecified task, unclear requirements, or when the user invokes "interview me" or "grill me"            | [.agents/skills/interview-me/SKILL.md](.agents/skills/interview-me/SKILL.md)                                                                                                           |
