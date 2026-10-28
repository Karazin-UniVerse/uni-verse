# Knip: manual unused-code audit

[Knip](https://knip.dev/) analyzes unused files, exports and dependencies across the pnpm workspaces. RS-221 introduces a manual audit, not a cleanup or a new CI gate. Findings are candidates for review, not permission to delete code.

## Run

Use Node.js 22.12+ or 24 LTS, then run from the repository root:

```sh
pnpm install --frozen-lockfile
pnpm db:generate
pnpm knip
```

Knip is pinned to 6.43.0 in the root devDependencies. No server or database connection is needed for the audit; `db:generate` only prepares the local Prisma Client. Knip loads tool configurations, so run it only against trusted repository code.

Useful focused commands:

```sh
pnpm knip --workspace packages/uni-hub
pnpm knip --dependencies
pnpm knip --reporter json
pnpm knip --trace-export isSemesterMaster
```

Workspace filters can include related workspaces. The default run includes tests, stories and development dependencies; it is not a production-only reachability report.

Exit codes are meaningful:

- **0:** analysis completed without reported issues.
- **1:** analysis completed and found issues. This is expected while adopting the tool; it does not mean the application tests failed.
- **2:** analysis could not complete, for example because of invalid configuration or a plugin load error. Investigate rather than treating it as an unused-code report.

For a local advisory run, `pnpm knip --no-exit-code` still prints findings but returns 0 for issue reports; configuration/internal errors still return 2. No command is added to CI, Turbo checks, lint or Git hooks.

## What is analyzed

`knip.jsonc` adds only repository-specific discovery:

- The root workspace covers operational scripts, GitHub automation, Oxlint helpers, styles and the requirement-driven tests. GitHub scripts are explicit entrypoints; package scripts and tool plugins discover the other command/config/test entrypoints, including `scripts/dev.mjs`.
- The root Vitest plugin reads `tests/e2e/vitest.config.mjs`.
- Nest's `main.ts` is an explicit backend entrypoint because this backend has no `src/` directory.
- pnpm discovers the remaining workspaces. Built-in plugins discover Next.js routes, Storybook stories/configuration, Jest, Vitest, Node tests and Prisma configuration.
- `.agents/` resources are invoked through skill prose rather than application imports; `.claude/` mirrors them. Both are outside the root project patterns. Generated `packages/database/client/` and build outputs are already excluded by `.gitignore`.

There is no broad ignore list for reported dependencies or exports and no stored issue-count baseline to make the report artificially green.

## Review findings before cleanup

The initial report contains existing candidates, including an unused application barrel, unused exports/types, duplicate named/default exports, and undeclared `@storybook/react` imports in stories. Do not fix these as part of installing Knip.

Some results need additional context:

- Prisma-generated imports are outside the graph, so runtime dependencies declared in `packages/database/package.json` may appear unused even though generated code needs them. Do not remove them based on this report.
- Runtime metadata, dynamic loading, package export patterns and configured TypeScript aliases can require manual tracing. For example, the report may call a workspace dependency unused while its source is reached through an alias.
- Test/story usage is included by default. A test-referenced symbol is not necessarily used by production; conversely, an unused export can coexist with a used implementation.
- Check actual consumers and operational commands before removing any reported file or dependency. Make cleanup in a separate, scoped change with behavioral tests.

Never run `--fix` or `--allow-remove-files` as part of the audit workflow. Validate suspected false positives against source/configuration and use `--trace-file`, `--trace-export` or `--trace-dependency` before considering a narrowly documented exception.
