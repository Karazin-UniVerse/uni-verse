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
- Before saying a task is done, walk the [pre-commit checklist](docs/ai/workflow.md#pre-commit-checklist) and fix what it flags.
- If a reviewer asks to "add this to the instructions", update the matching file in `docs/ai/` (not a skill) and keep each rule in one place.

## Always-loaded rules

These four files are loaded into every session: Claude Code imports them from `CLAUDE.md`, Gemini CLI and Antigravity read them from the generated `GEMINI.md`. Edit the files in `docs/ai/`, never `GEMINI.md`.

- [docs/ai/code-style.md](docs/ai/code-style.md)
- [docs/ai/architecture.md](docs/ai/architecture.md)
- [docs/ai/frontend.md](docs/ai/frontend.md)
- [docs/ai/quality.md](docs/ai/quality.md)

## Read on demand

| When you are…                                                                                                       | Read                                                   |
| ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| building or styling UI components (colors, typography, spacing, radii, shadows, z-index, motion) — you MUST read it | [docs/ai/design-system.md](docs/ai/design-system.md)   |
| reviewing code or a PR                                                                                              | [docs/ai/review.md](docs/ai/review.md)                 |
| writing an API client, constants or magic values, env variables or config                                           | [docs/ai/api-and-config.md](docs/ai/api-and-config.md) |
| branching, committing, running checks                                                                               | [docs/ai/workflow.md](docs/ai/workflow.md)             |
| touching Moodle, grades, or the E-Dean portal                                                                       | [docs/ai/domain-uni-hub.md](docs/ai/domain-uni-hub.md) |
