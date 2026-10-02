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

## Components, files and imports

- One component per file. Subcomponents go in their own files.
- Inside a domain folder do not repeat the folder name in a frontend file name: `components/auth/helpers.ts`, not `auth.helpers.ts`. Backend modules keep `<module>.helpers.ts`.
- One `import` statement per package, listing every name: `import { Modal, Button, useToast } from '@una';`. For `@universe/core` import the specific module ([core layout](architecture.md#core-layout)).
- Do not add a dependency that another workspace package already provides (use `@ui`, not a second copy).
- After a refactor, remove what is now unused: exports, files, dependencies, translation keys. Before keeping something that "might be needed", check that it is used.

## Keep it simple (KISS)

- Choose the simplest solution that meets the current requirement. Five direct lines beat a fifty-line generalization.
- Do not abstract for a hypothetical future: no factories, generic wrappers, strategy layers, extra options or flags with a single caller.
- Before adding a layer, class, hook or helper, ask: "what would I delete if this did not exist?" If the answer is "nothing", do not add it.
- If the solution needs a paragraph to explain, look for a simpler one first. When two designs both work, take the one with fewer moving parts.
- No defensive code for states that the types or the callers already rule out.
- Pure functions stay functions. Use a class only where the rules say so ([API clients](architecture.md#api-clients)) or where state and dependencies are really shared.

## Reuse before writing (DRY)

Before writing a function, constant, type, hook or component, search the repo for an existing one **by behavior, not only by name**: grep for the formula, regex or domain term. Equivalent code often hides under another name (`parseGradeScore` and a local score parser are the same thing).

- Equivalent exists: use it. Near match exists: extend it; do not fork it.
- Never leave two functions with the same or near-identical behavior in different places. If you find a pair, consolidate it in the same PR, or say in the PR description that a follow-up task is needed.

Where shared code lives. Take the first row that fits:

| Used by                                                        | Location                                                                                                                         |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| One file                                                       | A non-exported function in that file                                                                                             |
| Several files of one component or view                         | Co-located `helpers.ts` with `helpers.test.ts`                                                                                   |
| Several places in one package                                  | The package-level helpers directory (`packages/uni-hub/utils/`, `packages/backend/utils/`), one file per domain                  |
| More than one package, or expected to be used by more than one | `@universe/core`: `utils/` for functions, `constants/` for values, `types/` for types. One file per domain (`grades`, `browser`) |

Rules:

- Promote code up one row when its second consumer appears at that level. Do not promote ahead of need, except code that is clearly cross-package (grades, Moodle contracts, HTTP codes).
- Pure calculations, formatting, score-tone mapping and regex utilities MUST NOT live inside React components, hooks, backend services or DTOs.
- Backend DTO helpers go into `<module>.helpers.ts`; never keep helper functions in DTO files.
- A helper used by exactly one other function stays in that function's module as a private function, not a new file.

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

## No magic values

Never put bare numbers or domain strings into logic: HTTP status codes, grade thresholds, filter names, storage keys, timeouts. Declare a const object with a derived type once, in `@universe/core/constants` when more than one package can use it ([where shared code lives](#reuse-before-writing-dry)), and import it. Do not use TS `enum`; see [quality](quality.md).

```typescript
// ❌ if (response.status === 401)
// ✅ if (response.status === RESPONSE_CODES.UNAUTHORIZED)
export const RESPONSE_CODES = { UNAUTHORIZED: 401 } as const;
export type ResponseCode = (typeof RESPONSE_CODES)[keyof typeof RESPONSE_CODES];
```
