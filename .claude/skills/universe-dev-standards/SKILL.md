---
name: universe-dev-standards
description: Enforces Karazin UniVerse monorepo engineering standards, architectural boundaries, teacher/reviewer guidelines (iamredl-lab), CodeRabbit accessibility & hydration rules, and SonarCloud clean code quality gates. Use whenever planning, writing, refactoring, or reviewing code in the repository.
---

# Karazin UniVerse Engineering & Code Quality Standards

This skill guides programming and code review in the **Karazin UniVerse** monorepo. It synthesizes requirements from the project architect/teacher (`iamredl-lab`), CodeRabbit automated reviews, and SonarCloud Quality Gate rules into actionable patterns and checklists.

---

## 1. Monorepo Architecture & Package Boundaries

The repository is managed via **Turborepo** and **pnpm workspaces**:

```
uni-verse/
├── packages/
│   ├── core/           # @universe/core - Contracts, domain models, grade logic, Breakpoint enum
│   │   └── types/      # Import as '@universe/core/types' (NEVER create a standalone packages/types)
│   ├── ui/             # @universe/ui - Una design system (@una) and SCSS tokens/mixins
│   ├── backend/        # @universe/backend - NestJS Moodle proxy and PostgreSQL Prisma ORM
│   └── uni-hub/        # @universe/uni-hub - Next.js 16 App Router student portal
├── tests/e2e/          # Standalone requirement-driven Vitest integration suite
└── .agents/            # Agent instructions, skills, and role definitions
```

### Dependency Rules:

- **`@universe/core`**: Zero internal dependencies. Holds all shared types, schemas, and math/grading logic.
- **`@universe/ui`**: Consumed by frontend packages. Primitives in `components/una/` must be imported via `@una` (e.g. `import { Button, Tag, Empty } from '@una';`).
- **`@universe/backend`**: NestJS gateway. All DTOs and models must align with `@universe/core/types`.
- **`@universe/uni-hub`**: Next.js student portal. Must use React Server Components where possible; mark client interactive components with `'use client'`.

---

## 2. Teacher & Reviewer Requirements (`iamredl-lab`)

### A. Zero Tolerance for Redundant Aliases & Legacy Shims

- **Rule**: Never create backwards-compatibility aliases, re-export shims, or duplicate types/constants:
  ```ts
  // ❌ FORBIDDEN: Redundant aliases
  export const GradeScoreThreshold = GRADES_THRESHOLD;
  export type GradeScoreThreshold = GradesThreshold;
  export { Button as SimpleButton } from '@una';

  // ✅ CORRECT: Single canonical name everywhere
  export const GRADES_THRESHOLD = { ... } as const;
  export type GradesThreshold = (typeof GRADES_THRESHOLD)[keyof typeof GRADES_THRESHOLD];
  ```
- When renaming or unifying an identifier, update all call sites across the entire repository directly. Maintain zero transitional dead code.

### B. Responsive Breakpoints & `useMediaQuery`

- **Rule**: Never use magic numbers (`768`) or raw string literals (`'md'`) directly for breakpoints in TypeScript logic.
- Always use the `BREAKPOINTS` constant map from `@universe/core`:
  ```ts
  import { BREAKPOINTS } from '@universe/core';
  import { useMediaQuery } from '@uni-hub/hooks/useMediaQuery';

  // ✅ Pass the breakpoint from BREAKPOINTS and comparison indicator ('less' | 'wider')
  const isMobile = useMediaQuery(BREAKPOINTS.md, 'less');
  const isDesktop = useMediaQuery(BREAKPOINTS.lg, 'wider');
  ```
- Do not create duplicate objects (e.g. do NOT maintain a separate `const Breakpoint = { md: 'md' }` alongside `BREAKPOINTS = { md: 768 }`). `BREAKPOINTS` is the single canonical source of truth for breakpoints.
- In SCSS, mirror this using the design system mixins from `breakpoints.scss`:
  ```scss
  @use '@universe/ui/vars' as *;

  .container {
    @include narrower-than('md') {
      flex-direction: column;
    }
    @include wider-than('lg') {
      max-width: 1200px;
    }
  }
  ```

### C. Academic Grading & Accumulation System

- Boundaries for the 100-point Karazin University grading scale:
  - **`EXCELLENT`**: `90 – 100` (ECTS: `A`, Exam: `відмінно`)
  - **`GOOD`**: `70 – 89` (ECTS: `B` [82-89] / `C` [70-81], Exam: `добре`)
  - **`SATISFACTORY`**: `50 – 69` (ECTS: `D` / `E`, Exam: `задовільно`, Credit: `зараховано`)
  - **`FAIL`**: `0 – 49` (ECTS: `Fx` / `F`, Exam: `незадовільно`, Credit: `не зараховано`)
- Threshold constants in `GRADES_THRESHOLD`:
  - `GRADES_THRESHOLD.EXCELLENT = 90`
  - `GRADES_THRESHOLD.GOOD = 70`
  - `GRADES_THRESHOLD.SATISFACTORY = 50`

### D. UI Localization & Vertical Spacing

- UI labels for student portal tabs and standard actions must be in Ukrainian:
  - «Картка студента / Огляд»
  - «Індивідуальний план»
  - «Заліковка та бали»
  - «Розклад занять»
  - «Завдання»
- Enforce vertical blank lines (`universe(vertical-spacing)`):
  - Between variable/constant declarations and subsequent logic blocks.
  - Between conditional blocks (`if`/`else`) and following code.
  - Always keep an empty line before `return` statements.

---

## 3. CodeRabbit Accessibility (a11y) & Hydration Standards

### A. Accessible Interactive Elements & Dialogs

- **Buttons vs Divs**: Never attach `onClick` handlers to `<div>` or `<span>`. Use semantic `<button type="button">`.
- **Native `<dialog>`**: Use `<dialog open ...>` instead of `<div role="dialog">` for popups and pickers.
- **ARIA Attributes**:
  - Toggles must have `aria-expanded={isOpen}`.
  - Popup triggers must link to the popup id via `aria-controls={popupId}`.
  - Radio groups must have `role="radiogroup"` and `aria-label`.

### B. Modal Dialog Lifecycle & Focus Trap

Whenever implementing or updating modals (e.g. `Modal.tsx`):

1. **Initial Focus**: Move focus into the modal upon opening via `requestAnimationFrame` (first focusable child, or the dialog container itself with `tabIndex={-1}`).
2. **Focus Restoration**: Save `document.activeElement` before opening and restore focus when the modal closes.
3. **Topmost Escape Key**: When multiple modals or sheets are stacked, pressing `Escape` must close ONLY the topmost active modal:
   ```ts
   if (event.key === 'Escape') {
     if (modalStack.at(-1) === modalId) {
       onCloseRef.current();
     }
     return;
   }
   ```
4. **Tab Key Focus Trap**: Cycle Tab and Shift+Tab between `firstFocusable` and `lastElement`.

### C. SSR Safety & Hydration Consistency

- **No Window Initializers in `useState`**:
  ```ts
  // ❌ FORBIDDEN: Triggers SSR hydration mismatch
  const [isMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);

  // ✅ CORRECT: useSyncExternalStore with matchMedia
  const isMobile = useMediaQuery(Breakpoint.MD, 'less');
  ```
- **No Synchronous `setState` in Effects**:
  - Never call `setState` directly inside top-level `useEffect` without an event/subscription (`react/set-state-in-effect`).
  - Use `useSyncExternalStore` for external browser state subscriptions.

### D. Meaningful Empty States

- When a view supports filters (e.g. `AssignmentsTab`), distinguish between:
  1. **Filtered Empty**: `"Завдань за обраними фільтрами не знайдено"` (neutral prompt).
  2. **Truly Empty**: `"Ура, всі завдання виконані! 🎉"` (celebratory completion).

---

## 4. SonarCloud Quality Gate Rules

| Sonar Rule | Requirement                           | Pattern to Use                                                                                                      |
| :--------- | :------------------------------------ | :------------------------------------------------------------------------------------------------------------------ |
| **S3358**  | No nested ternaries in JSX            | Extract nested conditional rendering into independent `const emptyState = ...` before `return`.                     |
| **S1854**  | No redundant assignments / dead store | Use immutable `const` with direct ternaries instead of `let` reassigned to default values.                          |
| **S4323**  | No redundant union types              | Avoid `string \| Breakpoint` when `Breakpoint` is a subtype of `string`. Use function overloads for type narrowing. |
| **S7763**  | Clean re-exports                      | Avoid `import { X } from 'y'; export { X };`. Use `export { X } from 'y';` or `export * from 'y';`.                 |
| **S2245**  | No insecure PRNG                      | Never use `Math.random()` for keys, IDs, or tokens. Use deterministic index hashing or `crypto.getRandomValues()`.  |
| **S6847**  | Use native HTML elements              | Use `<dialog>` instead of `role="dialog"` on `<div>`.                                                               |
| **ES2022** | Modern array indexing                 | Prefer `array.at(-1)` over `array[array.length - 1]`.                                                               |

### Node.js 22+ Type-Stripping Compatibility

- TypeScript `enum` fails in Node.js strip-only mode (`SyntaxError: TypeScript enum is not supported in strip-only mode`).
- Always implement enums using the **const object + type** pattern:
  ```ts
  export const Breakpoint = {
    xs: 'xs',
    sm: 'sm',
    md: 'md',
    lg: 'lg',
    xl: 'xl',
    xxl: 'xxl',
    XS: 'xs',
    SM: 'sm',
    MD: 'md',
    LG: 'lg',
    XL: 'xl',
    XXL: 'xxl',
  } as const;

  export type Breakpoint = (typeof Breakpoint)[keyof typeof Breakpoint];
  ```

---

## 5. Development & Verification Workflow

Before committing any code or submitting a PR, execute this three-step verification pipeline:

```bash
# 1. Lint check (zero warnings allowed, strict deny-warnings)
pnpm lint

# 2. Typecheck across all 7 workspace packages
pnpm typecheck

# 3. Unit and integration tests
pnpm test
```

### Pre-Commit Quality Checklist:

- [ ] No redundant aliases or compatibility shims created.
- [ ] Responsive breakpoints use `Breakpoint.<NAME>` enum and direction indicator in `useMediaQuery`.
- [ ] No nested ternaries in JSX.
- [ ] All interactive elements are accessible (`<button>`, `<dialog>`, ARIA attributes).
- [ ] All arrays access last elements via `.at(-1)`.
- [ ] No `Math.random()` used for IDs or data rendering.
- [ ] Code formatted with proper vertical spacing and empty line before `return`.
- [ ] All tests, typecheck, and linter pass with 0 errors and 0 warnings.
