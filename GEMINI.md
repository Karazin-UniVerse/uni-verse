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

## Component decomposition

- Components over ~150-200 lines, or with several distinct UI sections (cards, grids, feeds, action panels), MUST be split into focused subcomponents. Examples: `StudentCard`, `StatCardGrid`, `UpcomingEventsList`; `DeanContactModal` into `DeanContactInfo` and `DeanTopicChips`.
- Complex stateful logic, data fetching, localStorage caching and lifecycle listeners MUST be extracted into custom hooks (for example `useDashboardData`, `useAssignmentStatuses`).
- Keep pages and tab views declarative and thin: layout composition only.
- Never let a component become a monolith that mixes data fetching, caching, several UI sections and inline business math.
- Helper placement rules: [code-style](code-style.md#helpers-placement).

## Localization (i18n)

- Zero hardcoded strings in the UI. All user-facing text (headings, button labels, tooltips, placeholders, toast notifications, aria-labels) goes through translation keys: `useLanguage().formatMessage('some.key')`.
- Define every key in both `packages/uni-hub/i18n/locales/uk.ts` and `packages/uni-hub/i18n/locales/en.ts`, satisfying `Record<TranslationKey, string>`. Keep the two files in sync.
- `@universe/ui` components stay language-agnostic: no hardcoded Ukrainian or English text. Accessibility labels come in as props (for example `closeLabel?: string`), and the consumer supplies the localized value.

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
