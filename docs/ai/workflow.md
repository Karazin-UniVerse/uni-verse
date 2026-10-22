# Workflow: Git, Checks, Tooling

## Branches, commits, pull requests

- Branch prefixes: `feature/`, `fix/`, `refactor/`, `chore/`, `hotfix/` followed by a descriptive name (for example `feature/user-auth`).
- All working PRs target `develop`, never `main`.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`.
- Prefer smaller, focused PRs and commits.
- Large changes ship as a stack of small PRs: each branch is cut from the previous one and each PR targets the branch below it; the first one targets `develop`. Manage the stack with `gh stack`: `gh stack init --base develop <branches…>` adopts existing branches (bottom to top), `gh stack add <branch>` adds a layer, `gh stack submit` pushes the branches and creates or updates the PRs, and `gh stack sync` and `gh stack rebase` keep the layers current after a lower PR merges.
- Specs (`docs/superpowers/specs/`) and implementation plans (`docs/superpowers/plans/`) are committed; the plan for a later PR of a stack may ship earlier in a docs PR.
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
- Lighthouse audit: build with `NEXT_PUBLIC_API_URL=http://localhost:3001`, `NEXT_PUBLIC_FEATURE_OPPORTUNITIES=true`, and `NEXT_PUBLIC_FEATURE_MOODLE=false`, `NEXT_PUBLIC_FEATURE_EDEAN=false`, `NEXT_PUBLIC_FEATURE_PANEL=false`, then run `pnpm build --force` and `pnpm lhci`. In PowerShell set each variable with `$env:NAME='value'` before the build; POSIX shells support `NAME=value command`. Keep these settings local to the audit, not deployment hosts. Build cache keys include these variables.
- `pnpm test:lhci` tests strict mock routing and browser smoke checks (requires installed Chrome, or `CHROME_PATH`). `pnpm lhci` starts the production frontend and mock API, checks fixture headings and redirects before/after each of six measurements, and enforces the existing median-run budgets. Smoke checks use a separate browser to avoid warming the Lighthouse browser cache. They prove the pages load, not that Lighthouse LCP measures the API-rendered card; TBT is a lab responsiveness proxy, not measured INP. Production feature flags are configured at build time rather than through disabled localStorage overrides.
- Lighthouse HTML/JSON and assertion reports are stored in `.lighthouseci/` and uploaded by CI as `lighthouse-reports` for 14 days, including when the audit fails. There is no external report upload.
- `GEMINI.md` is generated from the `@docs/ai/*.md` imports in `CLAUDE.md` (Gemini CLI and Antigravity do not expand `@` imports). Never edit it by hand: change `docs/ai/`, then run `pnpm gemini:sync` (the pre-commit hook does this too); `pnpm gemini:check` verifies it.
- If you edit anything under `.agents/skills`, the pre-commit hook runs `pnpm skills:sync` and stages the result (`.claude/skills` is an exact mirror of `.agents/skills`, so sync also deletes files that no longer exist in the source); `pnpm skills:check` verifies it and fails if `.agents/skills` is missing. To remove a skill, delete it from `.agents/skills` and run `pnpm skills:sync`.
- The pre-commit hook rejects the commit while `CLAUDE.md`, `docs/ai`, or `.agents/skills` has unstaged or untracked changes, because `GEMINI.md` and `.claude/skills` are generated from the working tree. `git add` those sources (or stash the rest) and commit again.

## Tooling notes

- `pnpm exec oxlint --fix` fixes vertical-spacing violations automatically.
- Format the lockfile with `pnpm exec prettier --write pnpm-lock.yaml`.

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
- [ ] I searched for an existing helper, constant, type or component before writing a new one; shared code is in the right place ([code-style](code-style.md#reuse-before-writing-dry)).
- [ ] The solution is the simplest that meets the requirement ([code-style](code-style.md#keep-it-simple-kiss)).
- [ ] No magic values; API calls go through client classes ([api-and-config](api-and-config.md#no-magic-values)).
- [ ] Unused exports, files, dependencies and translation keys are removed; new env variables and docs are in place ([config and environment](api-and-config.md#config-and-environment)).
- [ ] Lint, typecheck, tests and build pass with zero errors and zero warnings.
