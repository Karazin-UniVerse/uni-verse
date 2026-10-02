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

Run before committing or opening a PR (CI runs the same). All must pass with zero errors and zero warnings.

```bash
pnpm lint            # oxlint --deny-warnings
pnpm lint:style      # stylelint
pnpm typecheck       # all workspace packages
pnpm test            # unit and integration tests
pnpm build
pnpm format:check
```

- When you touch `packages/ui`, also run `pnpm --filter @universe/ui build-storybook`.
- The requirement-driven Vitest suite: `pnpm test:e2e`.
- If you edit anything under `.agents/skills`, run `pnpm skills:sync`, then `pnpm skills:check` (`.claude/skills` is a mirror of `.agents/skills`).

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
