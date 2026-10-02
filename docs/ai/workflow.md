# Workflow: Git, Checks, Tooling

## Branches, commits, pull requests

- Branch prefixes: `feature/`, `fix/`, `refactor/`, `chore/`, `hotfix/` followed by a descriptive name (for example `feature/user-auth`).
- All working PRs target `develop`, never `main`.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`.
- Prefer smaller, focused PRs and commits.
- UI changes include screenshots in the PR description.
- When people or ownership change, update `.github/CODEOWNERS` in the same PR.
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
- If you edit anything under `.agents/skills`, the pre-commit hook runs `pnpm skills:sync` and stages the result (`.claude/skills` is an exact mirror of `.agents/skills`, so sync also deletes files that no longer exist in the source); `pnpm skills:check` verifies it and fails if `.agents/skills` is missing. To remove a skill, delete it from `.agents/skills` and run `pnpm skills:sync`.
- The pre-commit hook rejects the commit while `CLAUDE.md`, `docs/ai`, or `.agents/skills` has unstaged or untracked changes, because `GEMINI.md` and `.claude/skills` are generated from the working tree. `git add` those sources (or stash the rest) and commit again.

## Tooling notes

- `pnpm exec oxlint --fix` fixes vertical-spacing violations automatically.
- Format the lockfile with `pnpm exec prettier --write pnpm-lock.yaml`.

## Config and environment

- `.env.example` is the single source of truth for environment variables. A new variable is added there in the same PR; developers copy it to `.env`.
- Code reads configuration from `process.env` and does not carry fallback defaults for values that `.env.example` or the server always provides. Never hardcode URLs or hosts.
- Do not duplicate `.env` files or entries in `.gitignore`, `tsconfig` paths or `package.json`; search for an existing entry first. A workspace alias is declared once (`workspace:*` in `package.json`, one path in `tsconfig.json`).
- Secrets are never committed. In README or docs write "ask the Project coordinator" for private values.

## Documentation

- Documentation is in English.
- Anything a developer must run or configure (script, service, Storybook, env variable) is documented in `README.md` or `docs/` in the same PR. Every command in a doc must exist; verify it.
- When a package gains a public API, add a Markdown file describing the public API of that package.

## Pre-commit checklist

- [ ] No redundant aliases or compatibility shims ([code-style](code-style.md)).
- [ ] Breakpoints come from `BREAKPOINTS`; no hardcoded UI strings ([frontend](frontend.md)).
- [ ] No nested ternaries in JSX, no `Math.random()` for IDs, last element via `.at(-1)`, accessible interactive elements ([quality](quality.md)).
- [ ] Components sit in the right tier; Storybook stories only in `packages/ui` ([architecture](architecture.md)).
- [ ] Vertical spacing and an empty line before `return` ([code-style](code-style.md)).
- [ ] Lint, typecheck, tests and build pass with zero errors and zero warnings.
