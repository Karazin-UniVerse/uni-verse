# Oxlint Configuration & Custom UniVerse Rules

This directory contains configuration, plugins, and custom rules for **Oxlint** and Git hooks.

## 1. Overview

Oxlint is the primary linter across the UniVerse monorepo. It runs in CLI and Git pre-commit hooks via **Husky** and **lint-staged**.

- **Root Config**: [`.oxlintrc.json`](../../.oxlintrc.json)
- **Plugin Implementation**: [`configs/oxlint/plugins/universe-rules.mjs`](./plugins/universe-rules.mjs)
- **Pre-commit Hook**: [`lint-staged.config.cjs`](../../lint-staged.config.cjs)

---

## 2. Enforced Rules & Situations

### Situation 1 & 2: Vertical Spacing (`universe/vertical-spacing`)

Enforces vertical blank lines between logical sections of code to ensure readability:

- Empty line between variable/constant declarations (`const`, `let`) and subsequent control-flow or logic blocks.
- Empty line between consecutive conditional statements (`if`, `for`, `while`, `switch`, `try`).
- Empty line before `return` statements (unless it is the only/first statement in a block).
- **Autofix (`--fix`)**: Automatically inserts the missing blank lines.

### Situation 3: Props & Parameter Destructuring Order (`universe/destructuring-props-order`)

Enforces the convention that required properties must appear before optional properties:

- In function and React component parameter destructuring (`ObjectPattern`), properties without default values (`data`, `height`, `className`) must appear before properties with default values (`type = 'bar'`, `layout = 'horizontal'`).
- **Autofix (`--fix`)**: Safely reorders properties with pure literal defaults. Automatically falls back to report-only whenever function calls, variable references, rest elements, or comments are present to guarantee semantic safety.

### Situation 4: Intra-Package Import Aliasing (`universe/enforce-package-utils-alias` & `no-restricted-imports`)

Prevents deep or ambiguous relative parent imports within packages:

- In `packages/uni-hub`, relative parent imports to `utils` (e.g. `../utils/...` or `../../utils/...`) are banned in favor of package aliases (e.g. `@uni-hub/utils/...`).
- **Autofix (`--fix`)**: Automatically rewrites relative import paths to the package alias.

### Situation 5: Duplicate Imports & Re-exports (`no-duplicate-imports` & `import/no-duplicates`)

Detects redundant duplicate module imports and exports:

- `no-duplicate-imports` with `{ "includeExports": true }` flags files that import and re-export the same module redundantly (e.g. `import type { X } from './Y'` and `export type { X } from './Y'`).

### Situation 6: Unused Imports (`universe/no-unused-imports`)

Enforces removal of unused imports:

- Flags any imported identifier that is not referenced in the module (while correctly recognizing React in JSX environments).
- Level: `error`.

### Situation 7: End of File Newline (`universe/eol-last`)

Enforces that every file ends with a trailing newline character.

- **Autofix (`--fix`)**: Automatically appends the newline if missing.
- Level: `error`.

### Situation 8: Maximum Line Length (`universe/max-len`)

Enforces that source lines do not exceed the configured length (`code: 120`), ignoring long URLs, imports, and strings.

- Level: `error`.

---

## 3. Git Hook & Pre-commit Workflow

Commits are guarded by Husky in [`.husky/pre-commit`](../../.husky/pre-commit) executing `npx lint-staged`:

```sh
# .husky/pre-commit
npx lint-staged
```

1. **Scoped Staged Processing**: `lint-staged` runs `oxlint --fix --deny-warnings` and `prettier --write` scoped strictly to staged files to ensure in-place fixes and formatting without affecting unrelated working directory changes.
2. **Quality Guarantee**: If any unfixable warnings or errors remain, the hook aborts the commit.
3. **Format**: `prettier --write` formats modified files and stages them.

---

## 4. Useful Commands

```bash
# Run linter across the repository
pnpm run lint

# Run linter and autofix issues
pnpm run lint:fix

# Run format check
pnpm run format:check
```
