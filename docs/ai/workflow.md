# Workflow: Git, Checks, Tooling

## Branches, commits, pull requests

- Branch prefixes: `feature/`, `fix/`, `refactor/`, `chore/`, `hotfix/` followed by a descriptive name (for example `feature/user-auth`).
- All working PRs target `develop`, never `main`.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`.
- Prefer smaller, focused PRs and commits.
- Merge criteria, protected branches, Code Freeze and the release cycle: see [CONTRIBUTING.md](../../CONTRIBUTING.md).

## Hooks

husky runs lint-staged on commit: oxlint and prettier for source files, stylelint and prettier for styles, prettier for `json`, `md`, `yml`. A single shared oxlint config lives in `configs/oxlint`.

## Verification pipeline

Run before committing or opening a PR. CI runs `pnpm lint`, `pnpm lint:style`, `pnpm typecheck`, the backend coverage tests (`pnpm --filter @universe/backend test:cov`) and `pnpm build`; the rest are local checks. Everything you run must pass with zero errors and zero warnings.

```bash
pnpm lint            # oxlint --deny-warnings
pnpm lint:style      # stylelint
pnpm typecheck       # all workspace packages
pnpm test            # unit and integration tests
pnpm build
pnpm exec prettier --check <files you changed>
```

- When you touch `packages/ui`, also run `pnpm --filter @universe/ui build-storybook`.
- The requirement-driven Vitest suite: `pnpm test:e2e`.
- `GEMINI.md` is generated from the `@docs/ai/*.md` imports in `CLAUDE.md` (Gemini CLI and Antigravity do not expand `@` imports). Never edit it by hand: change `docs/ai/`, then run `pnpm gemini:sync` (the pre-commit hook does this too); `pnpm gemini:check` verifies it.
- If you edit anything under `.agents/skills`, run `pnpm skills:sync`, then `pnpm skills:check` (`.claude/skills` is a mirror of `.agents/skills`). `skills:sync` never deletes files that exist only in `.claude/skills`; add `--prune` to delete them.

## Tooling notes

- `pnpm exec oxlint --fix` fixes vertical-spacing violations automatically.
- Format the lockfile with `pnpm exec prettier --write pnpm-lock.yaml`.

## Documentation

When a package gains a public API, add a Markdown file describing the public API of that package.

## Pre-commit checklist

- [ ] No redundant aliases or compatibility shims ([code-style](code-style.md)).
- [ ] Breakpoints come from `BREAKPOINTS`; no hardcoded UI strings ([frontend](frontend.md)).
- [ ] No nested ternaries in JSX, no `Math.random()` for IDs, last element via `.at(-1)`, accessible interactive elements ([quality](quality.md)).
- [ ] Components sit in the right tier; Storybook stories only in `packages/ui` ([architecture](architecture.md)).
- [ ] Vertical spacing and an empty line before `return` ([code-style](code-style.md)).
- [ ] Lint, typecheck, tests and build pass with zero errors and zero warnings.
