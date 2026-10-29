# Knip: unused-code audit

[Knip](https://knip.dev/) reports unused files, exports and dependencies across the pnpm workspaces. Run from the repository root after installing dependencies:

```sh
pnpm db:generate
pnpm knip
```

`pnpm knip` returns **1** when it finds issues. CI runs `pnpm knip --no-exit-code` after Prisma Client generation: findings remain visible without failing the job, but configuration, plugin-load and internal errors still fail with **2**. Local Git hooks are unchanged.

Review findings before deleting anything. Generated Prisma runtime dependencies, dynamic loading and TypeScript aliases can need manual tracing; tests and stories are included by default. Agent skill resources and gitignored generated/build outputs are outside the product graph configured in `knip.jsonc`.

Use `pnpm knip --workspace packages/uni-hub` to focus on a workspace and its related workspaces, or `pnpm knip --trace-export isSemesterMaster` to inspect an export. Do not run `--fix` or `--allow-remove-files` blindly; cleanup belongs in separate reviewed changes. Knip loads tool configurations, so run it only on trusted code.
