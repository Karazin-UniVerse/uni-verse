# Oxlint Configuration & Custom UniVerse Rules

This directory contains configuration and plugins for **Oxlint** — the sole linter for the UniVerse monorepo.

> **Note**: ESLint is not used. The previously present `.eslintrc.cjs` has been removed (Phase 2 cleanup). All linting goes through Oxlint with the custom `universe-rules.mjs` plugin, while code formatting (line wrapping, EOF newline, quotes) is delegated to Prettier.

## 1. Overview

Oxlint runs in CLI and Git pre-commit hooks via **Husky** and **lint-staged**.

- **Root Config**: [`.oxlintrc.json`](../../.oxlintrc.json)
- **Plugin Implementation**: [`configs/oxlint/plugins/universe-rules.mjs`](./plugins/universe-rules.mjs)
- **Pre-commit Hook**: [`lint-staged.config.cjs`](../../lint-staged.config.cjs)
- **Prettier Config**: [`prettier.config.js`](../../prettier.config.js)

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

### Situation 4: Intra-Package & Monorepo Import Boundaries (`no-restricted-imports`)

Enforces strict architectural separation across the monorepo via `no-restricted-imports` in `.oxlintrc.json`:

- **`packages/uni-hub`**: Banned relative parent imports to `utils` (`../utils/**`, `../../utils/**`, `../../../utils/**`) in favor of `@uni-hub/utils/...`. Direct imports of backend code (`@universe/backend/**`, `@universe/database/**`, `prisma`) are prohibited; data must be accessed via API clients.
- **`packages/ui`**: Cannot import application packages (`@uni-hub/**`, `@universe/backend/**`, `@universe/database/**`). The design system remains 100% presentational.
- **`packages/backend`**: Cannot import frontend packages or React libraries (`react`, `react-dom`, `next`, `@uni-hub/**`, `@universe/ui/**`).
- **`packages/core`**: Pure domain package. Framework-specific dependencies (`@nestjs/**`, `react`, `next`, `express`, `zustand`, database packages) are prohibited.

### Situation 5: Duplicate Imports & Re-exports (`no-duplicate-imports` + `import/no-duplicates`)

Detects redundant duplicate module imports and re-exports using native `no-duplicate-imports` with `{ "includeExports": true }` alongside `import/no-duplicates`.

### Situation 6: Unused Variables & Imports (`no-unused-vars`)

- `no-unused-vars` (`"warn"`) — flags imported identifiers and variables never referenced in the module.

### Situation 7: End of File Newline (Prettier)

Enforced via **Prettier** across all supported files to ensure every file ends with a trailing newline character.

- **Autoformat**: Automatically formatted during commit via `lint-staged` (`prettier --write`) and verifiable across the repository via `pnpm run format:check`.

### Situation 8: Line Length & Code Wrapping (Prettier `printWidth: 100`)

Formatting and line wrapping conventions are delegated to **Prettier** rather than hard linter failures, configured with `printWidth: 100` in [`prettier.config.js`](../../prettier.config.js).

- Prettier intelligently wraps long expressions, multi-line arguments, JSX attributes, and object literals while naturally accommodating unbroken URLs, long string literals, and RegExp patterns.
- **Autoformat**: Enforced automatically during commit via `lint-staged` (`prettier --write`) and verifiable via `pnpm run format:check`.

### Situation 9: Hydration Warning Suppression (`universe/no-suppress-hydration-without-comment`)

Custom rule. Detects any JSX element with `suppressHydrationWarning` and requires an explanatory comment on the same line or the line immediately above.

**Rationale**: `suppressHydrationWarning` should only be used for _known_ intentional mismatches (e.g. random IDs, dates, locale-specific formatting). Without a comment, it silently hides real hydration bugs.

**Correct usage**:

```tsx
{
  /* intentional: suppressHydrationWarning – locale date differs server/client */
}
<span suppressHydrationWarning>{new Date().toLocaleString()}</span>;
```

- Level: `warn`.

### Situation 10: React Rendering Quality

Native Oxlint `react` plugin rules:

| Rule                            | Level   | Rationale                                                                                          |
| ------------------------------- | ------- | -------------------------------------------------------------------------------------------------- |
| `react/jsx-no-useless-fragment` | `warn`  | Unnecessary fragments inflate the DOM                                                              |
| `react/no-danger`               | `warn`  | `dangerouslySetInnerHTML` requires human review; off in `providers/**` for no-flicker init pattern |
| `react/self-closing-comp`       | `error` | Keeps JSX concise; consistent with Prettier output                                                 |
| `react-hooks/exhaustive-deps`   | `error` | Stale closures are a primary cause of hydration mismatches                                         |

---

## 3. NestJS / Backend Rules (Custom)

| Rule                                            | Files              | Description                                                                     |
| ----------------------------------------------- | ------------------ | ------------------------------------------------------------------------------- |
| `universe/nestjs-require-api-response-type`     | `*.controller.ts`  | `@ApiResponse` on 200/201 endpoints must include `type` for Orval codegen       |
| `universe/nestjs-require-bearer-auth-decorator` | `*.controller.ts`  | Endpoints using `@GetUser()` must have `@ApiBearerAuth()` or `@ApiCookieAuth()` |
| `universe/nestjs-controller-return-type`        | `*.controller.ts`  | HTTP handler methods must declare explicit return types                         |
| `universe/nestjs-controller-no-prisma`          | `*.controller.ts`  | Controllers must not import `PrismaService` directly                            |
| `universe/no-empty-catch-in-services`           | `*.service.ts`     | `catch` blocks that silently return empty data must log or rethrow              |
| `universe/una-primitive-purity`                 | `ui/**/una/**`     | Design system components must not import business-layer packages                |
| `universe/core-package-isolation`               | `packages/core/**` | `@universe/core` must not import NestJS, Prisma, React, or Next                 |

---

## 4. Git Hook & Pre-commit Workflow

Commits are guarded by Husky in [`.husky/pre-commit`](../../.husky/pre-commit) executing `npx lint-staged`:

```sh
# .husky/pre-commit
npx lint-staged
```

1. **Scoped Staged Processing**: `lint-staged` runs `oxlint --fix --deny-warnings` and `prettier --write` scoped strictly to staged files to ensure in-place fixes and formatting without affecting unrelated working directory changes.
2. **Quality Guarantee**: If any unfixable warnings or errors remain, the hook aborts the commit.
3. **Format**: `prettier --write` formats modified files and stages them.

---

## 5. Useful Commands

```bash
# Run linter across the repository
pnpm run lint

# Run linter and autofix issues
pnpm run lint:fix

# Run format check
pnpm run format:check
```
