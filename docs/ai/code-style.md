# Code Style

These rules apply to every package in the monorepo.

## Naming

- Variables and functions: `camelCase`.
- Components, classes, types and interfaces: `PascalCase`.
- Constants: `UPPER_SNAKE_CASE`.
- Component files: `PascalCase.tsx`; other files: `kebab-case.ts`. Stay consistent within a package.

### Descriptive names

Use self-explanatory names for variables, parameters and callback arguments. Avoid single-letter or cryptic abbreviations (`course` instead of `c`, `user` instead of `u`, `error` instead of `e`, `response` instead of `res`).

```typescript
// Bad:
const names = data.map((c: Course) => c.fullname);

// Good:
const names = data.map((course: Course) => course.fullname);
```

## Vertical spacing

Keep an empty line between logical blocks:

- between variable or constant declarations and the logic that follows;
- between `if`/`else` blocks and loops and the code after them;
- always keep an empty line before `return`.

The oxlint rule `universe(vertical-spacing)` enforces this; `pnpm exec oxlint --fix` fixes it automatically.

```typescript
const user = await this.userService.findById(id);

if (!user) {
  throw new NotFoundException('User not found');
}

await this.logService.record(id);

return user;
```

## Props and parameter order

In type and interface definitions and in component destructuring, declare fields without default values first, then optional fields and fields with defaults.

```typescript
export type ComponentProps = {
  data: Item[];
  height?: number;
  title?: string;
  variant?: string;
};

export function Component({ data, height, title, variant = 'default' }: ComponentProps) {
  // ...
}
```

## TypeScript strictness

- Strict TypeScript everywhere. Avoid `any`, avoid `unknown` unless it is truly needed, avoid implicit types.
- Declare explicit return types for all functions.

## Functions with more than 3 parameters

Functions with more than 3 parameters MUST take a single object parameter with a named `type` or `interface`.

```typescript
// ✅ Correct
function getStatusInfo({ status, isGraded, isAwaitingReview, isOverdue }: StatusInfoParams) {}

// ❌ Incorrect
function getStatusInfo(
  status: string,
  isGraded: boolean,
  isAwaitingReview: boolean,
  isOverdue?: boolean,
) {}
```

## Co-located types

For React components with non-trivial prop interfaces or data models, extract the types into `<ComponentName>.types.ts` next to the component (`Chart.types.ts` beside `Chart.tsx`). Do not create `.types.ts` files for simple utilities, single helpers or trivial components. Import the types directly from the `.types.ts` file; do not re-export them from the component file (see the shim rule below).

## Helpers placement

- Pure calculations, formatting, score-tone mapping and regex utilities MUST NOT live inside React components, hooks or backend DTOs.
- Component and view helpers go into a co-located `helpers.ts` with a companion `helpers.test.ts`.
- Backend DTO helpers go into `<module>.helpers.ts`; never keep helper functions in DTO files.
- Helpers meant for cross-package reuse go into `@universe/core/utils` or `@universe/core/constants`.

## Comments

Write self-documenting code. Add comments only for complex logic or business rules.

## No backwards-compatibility shims or redundant aliases

We are an internal monorepo with no external library consumers, so keep zero legacy code and zero transitional layers.

- When moving, renaming or refactoring, never add backwards-compatibility aliases, re-export proxies, wrapper functions or deprecated shim files.
- Update every call site and import to the new location or name, and delete the obsolete files.
- Export and use components under their canonical names (`ToastProvider`, not `Toast = ToastProvider`).
- Never introduce redundant aliases for types, enums, constants or variables, and never import a type under another name only to re-export it under its original name.
- Never add redundant local aliases such as `const isCompleted = isGraded`.
- Keep a single canonical identifier and a single source of truth per entity. When a type or constant belongs to a domain submodule (for example grades in `@universe/core/constants/grades.ts`), declare it there and import it directly.

```typescript
// ❌ FORBIDDEN: redundant aliases and shims
export const GradeScoreThreshold = GRADES_THRESHOLD;
export type GradeScoreThreshold = GradesThreshold;
export { Button as SimpleButton } from '@una';

import type { TraditionalGrade as CoreTraditionalGrade } from '../constants/grades';
export type TraditionalGrade = CoreTraditionalGrade;

// ✅ CORRECT: one canonical name everywhere
export const GRADES_THRESHOLD = { ... } as const;
export type GradesThreshold = (typeof GRADES_THRESHOLD)[keyof typeof GRADES_THRESHOLD];
```

For the clean `export { X } from 'y'` form, see [quality](quality.md).
