# UniVerse Project - Copilot Instructions

You are an expert AI programming assistant helping build the "UniVerse" platform.
The project is a monorepo managed with **Turborepo** and **pnpm workspaces**.

## Core Technology Stack

- **Frontend:** Next.js 16 (App Router), React 19, SCSS Modules, Una Design System.
- **Backend:** NestJS, Node.js.
- **Database:** PostgreSQL with Prisma ORM.
- **Language:** Strict TypeScript across the entire repository.

## Coding Style & Best Practices

### 1. Code Style & Naming Conventions

- **Variables/Functions**: Use `camelCase`.
- **Classes/Components**: Use `PascalCase`.
- **Constants**: Use `UPPER_SNAKE_CASE`.
- **Props & Parameter Order**: In type/interface definitions and component destructuring, declare fields without default values first, followed by optional fields and fields with default values.
- **Meaningful Names over Short Abbreviations**: Always use descriptive, self-explanatory names for variables, parameters, and callback arguments. Avoid single-letter or cryptic abbreviations (e.g. use `course` instead of `c`, `user` instead of `u`, `error` instead of `e`).
- **Vertical Spacing**: Maintain clear vertical spacing (empty lines) between logical code blocks:
  - Between variable/constant declarations and subsequent logic blocks.
  - Between conditional statements (`if`/`else`), loops, and following function calls.
  - Always keep an empty line before `return` statements.
- Always write strict TypeScript. Avoid `any`, `unknown` (unless strictly necessary), and implicit types.
- Shared interfaces, types, and DTOs should be placed in the `@universe/types` package to be imported by both frontend and backend.
- Favor explicit return types for all functions.

### 2. UI Components Architecture (`packages/ui`)

- All shared UI components MUST be placed inside `packages/ui/components/`.
- **Design System Components (`@una`)**: Core, simple, and reusable design system components (buttons, inputs, modal, toast, etc.) reside in `packages/ui/components/una/`.
  - **Do NOT export Una components from the `@universe/ui` root (`packages/ui/index.ts`)**.
  - Always consume Una components separately via the `@una` alias (e.g., `import { Button, Tag } from '@una';`).
  - Keep the root `packages/ui/index.ts` reserved strictly for top-level non-Una library exports (such as complex components and hooks).
- **No Unnecessary Component Aliases**: Export and use components by their canonical names (e.g., `ToastProvider` for toast context, not `Toast = ToastProvider`).
- **Component Placement Tiers & Separation of Concerns**:
  - **Design System Primitives (`packages/ui/components/una/`)**: Reusable atomic design system elements, inputs, and base primitives. Language-agnostic, zero application logic, imported via `@una`.
  - **Complex UI-Only Components (`packages/ui/components/complex/`)**: Composite presentational UI components composed of Una primitives. **STRICTLY UI-ONLY**: must contain zero business logic, zero domain data-fetching, and zero application store/context dependencies (driven purely via props and event callbacks). Storybook stories belong under `Complex/*`.
  - **Application Components with Logic (`packages/uni-hub/components/`)**: Components containing application business logic, domain workflows, store subscriptions (e.g. `useGamificationStore`), or API service calls (e.g. Moodle auth/assignments).
  - **Pre-Implementation Architectural Consideration**: Before creating any new component, AI assistants and developers MUST evaluate which tier is the most suitable. If placement is ambiguous, ask the user before writing code. When implementing domain components in `packages/uni-hub/components/`, actively consider composing and reusing `complex` UI components from `@universe/ui` rather than embedding composite presentation layouts directly inside logic components.
- **Component Types Extraction (`.types.ts`)**: For React UI components with non-trivial prop interfaces or data models, extract types into a co-located `<ComponentName>.types.ts` file (e.g. `Chart.types.ts` adjacent to `Chart.tsx`). Re-export types from the component file or module index for backwards compatibility. Do NOT create separate `.types.ts` files for simple utilities, single helper functions, or trivial components to avoid unnecessary fragmentation.
- **Storybook Stories Scope Restriction & Section Separation**:
  - Storybook stories are strictly written **ONLY for components inside `packages/ui` (`@universe/ui`)**.
  - Writing Storybook stories in any other workspace packages (such as `packages/uni-hub` or `packages/backend`) is **STRICTLY PROHIBITED**.
  - Storybook sidebar hierarchy:
    - Una design system components (`packages/ui/components/una/`) are placed under the `Una/*` section (e.g. `title: 'Una/Buttons/Button'`, `title: 'Una/Inputs/TextInput'`).
    - Complex composite components (`packages/ui/components/complex/`) are placed under the dedicated `Complex/*` section (e.g. `title: 'Complex/ExampleComponent'`).
  - All stories must follow Component Story Format 3 (CSF3) using `satisfies Meta<typeof Component>` and `StoryObj<typeof meta>`. Avoid untyped parameters (`any`) in story templates.

### 3. Backend (NestJS)

- Follow Clean Architecture.
- **Controllers** should only handle HTTP routing, request parsing, and response formatting.
- **Services** should contain all business logic.
- **Prisma** should be injected as a service for database access (managed via the `@universe/database` package).
- Always use dependency injection and keep modules highly cohesive.

### 4. Frontend (Next.js & React)

- Prioritize **React Server Components (RSC)**. Use client components (`"use client"`) only when interactivity or browser APIs (like `useState`, `useEffect`, `window`) are required.
- **Component Decomposition**:
  - Components exceeding ~150-200 lines or containing multiple distinct UI sections (cards, grids, feeds, action panels) MUST be decomposed into focused subcomponents (e.g. `StudentCard`, `StatCardGrid`, `UpcomingEventsList`).
  - Complex stateful logic, data fetching, localStorage caching, and lifecycle listeners MUST be extracted into custom hooks (e.g. `useDashboardData`, `useAssignmentStatuses`).
  - Keep page and tab views declarative and thin.
- **Strict UI Localization via Translation Keys (i18n)**:
  - ZERO hardcoded strings in UI. ALL user-facing text (headings, button labels, tooltips, placeholders, toast notifications, aria-labels) MUST use translation keys via `useLanguage().formatMessage('key')`.
  - Every translation key MUST be defined symmetrically in BOTH `packages/uni-hub/i18n/locales/uk.ts` and `packages/uni-hub/i18n/locales/en.ts` satisfying `Record<TranslationKey, string>`.
  - Design system components in `@universe/ui` must remain language-agnostic and receive accessibility labels via props (e.g. `closeLabel?: string`).
- **Helper Functions & Utilities Placement**:
  - Pure calculation, formatting, score tone mapping, and regex utilities MUST NOT live inside React components, hooks, or backend DTOs.
  - Extract component/view utilities into co-located `helpers.ts` files with companion `helpers.test.ts`.
  - If a helper or calculation is intended for general/cross-package reuse, place it canonically in `@universe/core/utils/` or `@universe/core/constants/`.

### 5. Monorepo (Turborepo)

- Keep packages isolated. Do not use relative paths `../../../` to access code outside of the current workspace. Use the package names instead (e.g., `import { Button } from '@una'`).
- Ensure `package.json` dependencies correctly reference workspace packages (`"workspace:*"`).

### 6. Git Flow & Commits

- **Branch Naming**: Use standard prefixes such as `feature/`, `bugfix/`, `hotfix/`, `chore/` followed by a descriptive name (e.g., `feature/user-auth`).
- **Commit Messages**: Follow Conventional Commits format (e.g., `feat: add user login`, `fix: correct typo in header`, `chore: update dependencies`).

### 7. General AI Instructions

- Before generating code, think through the architecture and how it fits into the monorepo structure.
- When fixing bugs, explain _why_ the bug occurred before providing the code.
- Write clean, self-documenting code. Add comments only for complex logic or business rules.
- Prefer smaller, focused PRs and commits.
- **Decompose Large and Complex Components**:
  - Always break down complex components into subcomponents, custom hooks, and helpers.
  - Never allow a component to become a monolith that mixes data fetching, caching, multiple UI sections, and inline business math.
- **Helper Functions Placement**:
  - Component/module helpers → `<directory>/helpers.ts` (with unit tests in `helpers.test.ts`).
  - Backend DTO helpers → `<module>.helpers.ts` (never keep helper functions in DTO files).
  - General / cross-package utilities → `@universe/core/utils/` or `@universe/core/constants/`.
- **Strict i18n Translation Keys**:
  - Never write raw text in JSX/TSX. Always use `formatMessage('some.key')` and keep `uk.ts` and `en.ts` in sync.
- **Functions with more than 3 parameters MUST use an object parameter** instead of positional arguments.
  - ✅ Correct: `function getStatusInfo({ status, isGraded, isAwaitingReview, isOverdue }: StatusInfoParams)`
  - ❌ Incorrect: `function getStatusInfo(status: string, isGraded: boolean, isAwaitingReview: boolean, isOverdue?: boolean)`
  - Define a named `type` or `interface` for the parameter shape.
- **No Premature Backwards Compatibility / Legacy Shims (No "Backtracking")**:
  - When moving, renaming, or refactoring code (such as migrating components into `@universe/ui` or renaming functions/mixins), **never** create backwards-compatibility aliases, re-export proxies, wrapper functions, or deprecated shim files (e.g., `export { Button as SimpleButton } from '@universe/ui'` inside deprecated paths).
  - Directly update all call sites, imports, and usages across the entire codebase to the new location/name.
  - Completely delete obsolete files and aliases. We are an active internal monorepo with no external library consumers — maintain zero legacy dead code and zero transitional proxy layers.
- **No Redundant Aliases for Types, Enums, Variables, or Constants**:
  - NEVER introduce redundant aliases or duplicate exports for backwards compatibility (e.g. `export const GradeScoreThreshold = GRADES_THRESHOLD; export type GradeScoreThreshold = GradesThreshold;`).
  - NEVER import a type from another module under an alias only to re-export it under its original name (e.g. `import type { TraditionalGrade as CoreTraditionalGrade } from '../constants/grades'; export type TraditionalGrade = CoreTraditionalGrade;`). This is a redundant alias anti-pattern.
  - NEVER introduce redundant variable aliases inside functions (e.g. `const isCompleted = isGraded; const overdue = isAwaitingReview;`). Use canonical variable names directly.
  - Enforce a single canonical source of truth per entity. When types and constants belong to a specific domain submodule (such as grades in `@universe/core/constants/grades.ts`), declare them there and import them directly where needed without re-aliasing in `packages/core/types/index.ts`.
  - Enforce a single canonical identifier per entity. When renaming or unifying identifiers, update all call sites across the codebase and remove the previous name completely.
- **Incorporating GitHub PR Review Feedback**:
  - Patterns, architectural requests, and reviews from team reviewers (e.g. `iamredl-lab`) on GitHub Pull Requests are top-priority canon standards.
  - Always learn from and incorporate PR review patterns into future implementations and code reviews.

### 8. AI Code Review Culture & Complexity Management

Since we actively use AI for code generation, you (as an AI Reviewer) must enforce a strict, uncompromising review culture to keep the codebase clean, simple, and maintainable. Act as a rigorous Principal Software Engineer.

Evaluate the code strictly against these failure modes:

1. **OVER-ENGINEERING & PREMATURE ABSTRACTION (Complexity):** Flag any abstract classes, factories, generic wrappers, or layers that solve hypothetical future problems rather than immediate requirements. Review the code from a perspective of complexity: if 5 lines of direct, simple code suffice, reject any 50-line generalized architecture. Always look for opportunities to simplify the code.
2. **DRY VIOLATIONS & DUPLICATION:** Enforce DRY (Don't Repeat Yourself) principles. Ensure the author reuses existing core components, local helpers, and shared UI libraries (`packages/ui`) instead of creating duplicate implementations.
3. **TASK INTENT & ARCHITECTURAL MATCH:** Ensure the code precisely matches architectural requirements and the specific task intent. Strictly flag any code that hallucinates extra features, adds out-of-scope functionality, or strays from the original requirements.
4. **AI SLOP & VERBOSITY:** Flag excessive defensive checks, redundant comments explaining what the code does, dead code, or unnecessary helper utilities commonly generated by AI.
5. **REGRESSION PREVENTION:** Look critically at whether the proposed changes break existing logic elsewhere in the system.
6. **SECURITY:** Review the code from a security perspective. Flag any potential vulnerabilities (e.g., injections, insecure data handling, missing authorization).
7. **ACCESSIBILITY (a11y):** Review UI components from an accessibility perspective. Ensure proper ARIA roles, keyboard navigability, and sufficient contrast.
8. **LEGACY SHIMS & RETROACTIVE RE-EXPORTS (Backtracking):** Flag any backwards-compatibility aliases, proxy re-exports, or transitional wrapper shims introduced during refactoring. Require the author to update all consumer imports directly and remove obsolete files.
9. **MONOLITHIC COMPONENTS & MISSING DECOMPOSITION:** Flag large components (>150-200 lines) that contain inline data fetching, stateful side-effects, or multiple UI sections without decomposing into subcomponents and hooks.
10. **INLINE HELPERS & DTO POLLUTION:** Flag any pure helper functions, calculation utilities, date formatters, or query transformers kept inline inside React components, custom hooks, or backend DTOs. Demand extraction into `helpers.ts` (with unit tests) or `@universe/core`.
11. **HARDCODED UI TEXT (i18n):** Flag any hardcoded strings in JSX/TSX. Enforce translation keys across both `uk.ts` and `en.ts`.

Output requirements for Review:

- Rate findings by severity.
- For every issue found, quote the exact lines, explain the concrete maintenance burden it introduces, and provide a simpler, direct replacement snippet.
- Prefer NO finding over a weak or speculative nitpick. If the code is clean, simple, and matches the intent, output "LGTM - No architectural bloat detected."

### 9. Design System Strict Rules (UniDesign)

All strict rules regarding the usage of colors, typography, spacing, shadows, and animations are documented in `docs/design-system-rules.md`. You MUST read this document and strictly adhere to its rules when working on UI components.

### 10. Karazin E-Dean Guidelines & Architecture

All architecture guidelines, package boundaries, Moodle LMS API conventions, and quality enforcement rules for E-Dean features are documented in `.agents/instructions/karazin-edean.md`. AI assistants and developers must adhere to these guidelines when working on E-Dean components, shared domain contracts, or gateway endpoints.
