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
- **Autofix (`--fix`)**: Safely reorders properties so non-defaults precede defaults without altering runtime semantics.

### Situation 4: Intra-Package Import Aliasing (`universe/enforce-package-utils-alias` & `no-restricted-imports`)

Prevents deep or ambiguous relative parent imports within packages:

- In `packages/uni-hub`, relative parent imports to `utils` (e.g. `../utils/...` or `../../utils/...`) are banned in favor of package aliases (e.g. `@uni-hub/utils/...`).
- **Autofix (`--fix`)**: Automatically rewrites relative import paths to the package alias.

### Situation 5: Duplicate Imports & Re-exports (`no-duplicate-imports` & `import/no-duplicates`)

Detects redundant duplicate module imports and exports:

- `no-duplicate-imports` with `{ "includeExports": true }` flags files that import and re-export the same module redundantly (e.g. `import type { X } from './Y'` and `export type { X } from './Y'`).
- Prevents commits with unresolved duplicate statements.

---

## 3. Git Hook & Pre-commit Workflow

Commits are guarded by Husky in [`.husky/pre-commit`](../../.husky/pre-commit) executing `pnpm lint:fix` and `lint-staged`:

```sh
# .husky/pre-commit
pnpm lint:fix
npx lint-staged
```

1. **Pre-commit Lint & Fix**: On `git commit`, `pnpm lint:fix` runs `oxlint --fix --deny-warnings` across the project to automatically fix issues and deny warnings.
2. **Staged Files Processing**: `lint-staged` runs on staged files to ensure in-place fixes and formatting.
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
