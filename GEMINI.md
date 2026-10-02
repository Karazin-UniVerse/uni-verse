<!-- GENERATED FILE, do not edit. Source: the @docs/ai/*.md imports in CLAUDE.md. Regenerate: pnpm gemini:sync -->

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
- Pure functions stay functions. Use a class only where the rules say so ([API clients](api-and-config.md#api-clients)) or where state and dependencies are really shared.

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
- Pure calculations, formatting, score-tone mapping and regex utilities MUST NOT be written inside the body of a component or hook, a service class or a DTO file. A non-exported module-level function in the same file is allowed when only that file uses it.
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

---

# Architecture

## Packages and dependency rules

```
uni-verse/
├── packages/
│   ├── core/       # @universe/core — contracts, domain models, grade logic, constants, utils
│   │   └── types/  # import as '@universe/core/types'
│   ├── ui/         # @universe/ui — Una design system (@una), SCSS tokens, Storybook
│   ├── backend/    # @universe/backend — NestJS gateway over the Moodle LMS
│   ├── database/   # @universe/database — Prisma ORM data layer
│   └── uni-hub/    # @universe/uni-hub — Next.js 16 App Router student portal
├── configs/        # shared oxlint, ESLint and TypeScript presets
└── tests/e2e/      # standalone requirement-driven Vitest suite
```

- **`@universe/core`**: Zero internal dependencies. Holds all shared types, DTO contracts, constants and grading math. Shared types and DTOs used by both frontend and backend live in `@universe/core/types`.
- Never create a standalone `packages/types` package. An empty `packages/types` directory may exist locally; it is not a package.
- **`@universe/ui`**: consumed by frontend packages.
- **`@universe/backend`**: all DTOs and models must align with `@universe/core/types`.
- **`@universe/uni-hub`**: prefer React Server Components, see [frontend](frontend.md).

### Core layout

- One file per domain, grouped by kind: `constants/grades.ts`, `constants/breakpoints.ts`, `utils/grades.ts`, `utils/browser.ts`. Import the specific module (`@universe/core/utils/browser`, or the `@core/utils/browser` alias inside uni-hub), never the package root.
- No barrel `index.ts` in `constants/` and `utils/`. Barrels hide where code lives and force a split later; add domain files from the start.
- Types, constants and functions never share a file. Types stay under `types/`.
- Tests sit next to the code in a sibling `tests/` directory (`utils/tests/grades.test.ts`).
- Do not write unit tests for types and constants; test behavior only.

## Monorepo rules

- Keep packages isolated. Never use relative paths such as `../../../` to reach code outside the current workspace; import through the package name (for example `import { Button } from '@una'`).
- Workspace dependencies in `package.json` must use `"workspace:*"`.

## UI components (`packages/ui`)

- All shared UI components live under `packages/ui/components/`.
- Una design system components (`packages/ui/components/una/`) are imported through the `@una` alias, for example `import { Button, Tag } from '@una';`.
- Do NOT export Una components from the `@universe/ui` root (`packages/ui/index.ts`). That file is reserved for non-Una exports such as complex components and hooks.

### Three placement tiers

| Tier                                                           | Contains                                                                                                                         | Rules                                                                                                                                         |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Design system primitives — `packages/ui/components/una/`       | Atomic elements: buttons, inputs, modal, toast, tag                                                                              | Language-agnostic, zero application logic, imported via `@una`                                                                                |
| Complex UI-Only Components — `packages/ui/components/complex/` | Composite presentational components built from Una primitives                                                                    | **Strictly UI-only**: no business logic, no domain data fetching, no application store or context; driven purely by props and event callbacks |
| Application components — `packages/uni-hub/components/`        | Business logic, domain workflows, store subscriptions (for example `useGamificationStore`), API calls (Moodle auth, assignments) | Compose and reuse `complex` components from `@universe/ui` instead of embedding composite presentation layouts inside logic components        |

Before creating any component, decide which tier fits. If the placement is ambiguous, ask the user before writing code.

## Storybook

- Stories are written only for components in `packages/ui` (`@universe/ui`). Writing stories in `packages/uni-hub`, `packages/backend` or any other package is STRICTLY PROHIBITED.
- Sidebar sections: Una components go under `Una/*` (for example `title: 'Una/Buttons/Button'`); complex components go under `Complex/*` (for example `title: 'Complex/ExampleComponent'`).
- Use Component Story Format 3 with `satisfies Meta<typeof Component>` and `StoryObj<typeof meta>`. No untyped parameters (`any`) in story templates.
- Procedure for writing a story: the `storybook-story-writing` skill.

## Backend (NestJS)

- Follow Clean Architecture.
- Controllers only handle HTTP routing, request parsing and response formatting.
- Services contain all business logic.
- Inject Prisma as a service (managed through `@universe/database`).
- Use dependency injection and keep modules highly cohesive.

---

# Frontend (Next.js and React)

## Server vs client components

Prioritize React Server Components. Use client components (`"use client"`) only when interactivity or browser APIs (`useState`, `useEffect`, `window`) are required.

- Components in `packages/ui` stay usable as Server Components. Put `"use client"` only on the part that needs interactivity, and compose the rest as `children` of that client wrapper. Before adding `"use client"` to an app component, check that it really needs state, effects or browser APIs.

## Component decomposition

- Components over ~150-200 lines, or with several distinct UI sections (cards, grids, feeds, action panels), MUST be split into focused subcomponents. Examples: `StudentCard`, `StatCardGrid`, `UpcomingEventsList`; `DeanContactModal` into `DeanContactInfo` and `DeanTopicChips`.
- Complex stateful logic, data fetching, localStorage caching and lifecycle listeners MUST be extracted into custom hooks (for example `useDashboardData`, `useAssignmentStatuses`).
- Keep pages and tab views declarative and thin: layout composition only.
- Never let a component become a monolith that mixes data fetching, caching, several UI sections and inline business math.
- Helper placement rules: [code-style](code-style.md#reuse-before-writing-dry).

## Localization (i18n)

- Zero hardcoded strings in the UI. All user-facing text (headings, button labels, tooltips, placeholders, toast notifications, aria-labels) goes through translation keys: `useLanguage().formatMessage('some.key')`.
- Define every key in both `packages/uni-hub/i18n/locales/uk.ts` and `packages/uni-hub/i18n/locales/en.ts`, satisfying `Record<TranslationKey, string>`. Keep the two files in sync.
- `@universe/ui` components stay language-agnostic: no hardcoded Ukrainian or English text. Accessibility labels come in as props (for example `closeLabel?: string`), and the consumer supplies the localized value.
- Dynamic values go through placeholders in the translation string and the `values` argument: `'Go to assignment: {name}'` with `formatMessage('recentGrades.viewAssignment', { name })`. Never concatenate strings around `formatMessage`. Keep one translation function name; do not add aliases such as `t`.

## Responsive breakpoints

- Never use magic numbers (`768`) or string literals (`'md'`) for breakpoints in TypeScript logic. Use the `BREAKPOINTS` map from `@core/constants/breakpoints` (numbers: `xs 480`, `sm 640`, `md 768`, `lg 1024`, `xl 1280`, `xxl 1536`; `Breakpoint` is `keyof typeof BREAKPOINTS`).
- Observe breakpoints with `useMediaQuery` from `packages/uni-hub/hooks/useMediaQuery.ts`:

```ts
import { BREAKPOINTS } from '@core/constants/breakpoints';

const isMobile = useMediaQuery('less', BREAKPOINTS.md);
const isDesktop = useMediaQuery('wider', BREAKPOINTS.lg);
```

- `BREAKPOINTS` is the single source of truth. Do not create a second breakpoint object next to it.
- In SCSS use the mixins from `@universe/ui/breakpoints.scss`:

```scss
@use '@universe/ui/breakpoints.scss' as *;

.container {
  @include narrower-than('md') {
    flex-direction: column;
  }

  @include wider-than('lg') {
    max-width: 1200px;
  }
}
```

## SSR safety and hydration

- No window initializers in `useState`; they cause hydration mismatches. Use `useMediaQuery` (built on `useSyncExternalStore`) for browser state.

```ts
// ❌ FORBIDDEN
const [isMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);

// ✅ CORRECT
const isMobile = useMediaQuery('less', BREAKPOINTS.md);
```

- No synchronous `setState` directly inside a top-level `useEffect` without an event or subscription (lint rule `react/set-state-in-effect`). Use `useSyncExternalStore` for external browser-state subscriptions.

## Meaningful empty states

When a view supports filters (for example `AssignmentsTab`), distinguish:

1. Filtered empty: «Завдань за обраними фільтрами не знайдено» (neutral prompt).
2. Truly empty: «Ура, всі завдання виконані! 🎉» (celebratory completion).

---

# Quality: Accessibility, SonarCloud, Runtime Compatibility

## Accessible interactive elements

- Never attach `onClick` to a `<div>` or `<span>`. Use a semantic `<button type="button">`.
- Use native `<dialog open ...>` instead of `<div role="dialog">` for popups and pickers.
- Toggles carry `aria-expanded={isOpen}`; popup triggers link to the popup with `aria-controls={popupId}`.
- Radio groups use `role="radiogroup"` with an `aria-label`.
- Every input has an associated label or an `aria-label`. Modal dialogs specify a `title` and an accessible close button.

## Modal lifecycle and focus trap

When implementing or changing a modal (for example `Modal.tsx`):

1. **Initial focus**: on open, move focus into the modal via `requestAnimationFrame` (first focusable child, or the dialog container itself with `tabIndex={-1}`).
2. **Focus Restoration**: save `document.activeElement` before opening and restore it when the modal closes.
3. **Topmost Escape**: with stacked modals or sheets, `Escape` closes ONLY the topmost one:

   ```ts
   if (event.key === 'Escape') {
     if (modalStack.at(-1) === modalId) {
       onCloseRef.current();
     }

     return;
   }
   ```

4. **Tab focus trap**: cycle Tab and Shift+Tab between `firstFocusable` and `lastElement`.

## SonarCloud rules

| Rule       | Requirement                           | Pattern to use                                                                                                            |
| :--------- | :------------------------------------ | :------------------------------------------------------------------------------------------------------------------------ |
| **S3358**  | No nested ternaries in JSX            | Extract nested conditional rendering into a `const emptyState = ...` before `return`.                                     |
| **S1854**  | No redundant assignments / dead store | Use an immutable `const` with a direct ternary instead of a `let` reassigned to a default.                                |
| **S4323**  | No redundant union types              | Avoid `string \| Breakpoint` when `Breakpoint` is already a subtype of `string`. Use overloads for type narrowing.        |
| **S7763**  | Clean re-exports                      | Avoid `import { X } from 'y'; export { X };`. Use `export { X } from 'y';` or `export * from 'y';`.                       |
| **S2245**  | No insecure PRNG                      | Never use `Math.random()` for keys, IDs, tokens or mock data. Use deterministic index math or `crypto.getRandomValues()`. |
| **S6847**  | Use native HTML elements              | Use `<dialog>` instead of `role="dialog"` on a `<div>`.                                                                   |
| **ES2022** | Modern array indexing                 | Prefer `array.at(-1)` over `array[array.length - 1]`.                                                                     |

When re-exporting shared types from a library or service, use `export * from '@universe/core/types'`. It avoids both ESLint `no-duplicate-imports` and Sonar S7763.

## Node.js 22+ type-stripping

TypeScript `enum` fails in Node strip-only mode (`SyntaxError: TypeScript enum is not supported in strip-only mode`). Use the const object plus type pattern:

```ts
export const Status = {
  Active: 'active',
  Archived: 'archived',
} as const;

export type Status = (typeof Status)[keyof typeof Status];
```
