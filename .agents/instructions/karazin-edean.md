# Karazin UniVerse E-Dean Development & Review Guidelines

This document guides development, code review, and quality enforcement across the Karazin UniVerse monorepo (pnpm + Turborepo), specifically for the E-Dean Office (UniHub) and Moodle LMS integration layer.

## Monorepo Architecture & Package Boundaries

```
uni-verse/
├── packages/
│   ├── core/           # @universe/core - Single source of truth for contracts & utilities
│   │   └── types/      # Exported via '@universe/core/types' (DO NOT create a separate package)
│   ├── ui/             # @universe/ui - Una UI design system components & SCSS tokens
│   ├── backend/        # @universe/backend - NestJS Moodle LMS gateway proxy
│   └── uni-hub/        # @universe/uni-hub - Next.js 16 App Router student portal
├── tests/e2e/          # Standalone requirement-driven integration test suite (Vitest)
└── .agents/            # Agent instructions, skills, and reusable agent role templates
```

### Critical Rules & Anti-Patterns to Prevent

1. **Shared Types & Domain Models**:
   - Import shared types from their canonical source: domain entities (`StudentProfile`, `CurriculumItem`, `GradeRecord`, etc.) from `@universe/core/types`, grade constants & calculation contracts (`CONTROL_TYPES`, `TRADITIONAL_GRADES`, `TraditionalGrade`, `ControlType`, `EctsGrade`, `GradeAccumulationParams`, `GradeAccumulationResult`) from `@universe/core/constants/grades` (or `@universe/core/utils/grades`).
   - NEVER create a standalone `packages/types/package.json` — all core types reside in `@universe/core`.
   - NEVER introduce redundant aliases or duplicate exports for backwards compatibility (e.g. `export const GradeScoreThreshold = GRADES_THRESHOLD; export type GradeScoreThreshold = GradesThreshold;`).
   - NEVER create cross-module proxy type aliases (e.g. `import type { TraditionalGrade as CoreTraditionalGrade } from '../constants/grades'; export type TraditionalGrade = CoreTraditionalGrade;`). Types must be defined once in their canonical module and imported directly from there.
   - Use a single canonical identifier everywhere.
   - When re-exporting in libraries/services, use `export * from '@universe/core/types'` to prevent ESLint `no-duplicate-imports` and SonarCloud `typescript:S7763`.

2. **Backend Moodle Gateway (`@universe/backend`)**:
   - Default Moodle host MUST be `https://moodle.universemvp.tech` (not `moodle.karazin.ua`).
   - DTOs in controllers and services must match contracts in `@universe/core/types`.

3. **Frontend E-Dean Portal (`packages/uni-hub`)**:
   - Consume UI components from `@universe/ui` package root or configured aliases.
   - Use 5 canonical Ukrainian navigation tabs:
     - «Картка студента / Огляд»
     - «Індивідуальний план»
     - «Заліковка та бали» (3-tier display: 100-point score, ECTS letter A-F, traditional mark)
     - «Розклад занять»
     - «Завдання»
   - Sidebar footer displays Moodle status indicator with active link `https://moodle.universemvp.tech`.

4. **Security & Clean Code (SonarCloud Compliance)**:
   - **No insecure PRNG**: NEVER use `Math.random()` for mock data or component loops. Use deterministic index-based algorithms (`(Math.abs(i) % N)`) or `crypto.getRandomValues()` (SonarCloud S2245).
   - **Clean re-exports**: Avoid `import { X } from 'y'; export { X };`. Use `export { X } from 'y';` or `export * from 'y';` (SonarCloud S7763).
   - **Accessible UI**: All inputs must have associated labels or `aria-label`, modal dialogs must specify `title` and accessible close buttons.

5. **Code Formatting & Linters**:
   - Oxlint rule `universe(vertical-spacing)` requires an empty line between variable declarations and subsequent logic blocks.
   - Run `npx oxlint --fix` to automatically format spacing.
   - Ensure `pnpm-lock.yaml` is formatted with `npx prettier --write pnpm-lock.yaml`.

6. **Function Parameters**:
   - **Functions with more than 3 parameters MUST use an object parameter** instead of positional arguments. This improves readability and avoids argument-order mistakes.
   - ✅ Correct: `function getStatusInfo({ status, isGraded, isAwaitingReview, isOverdue }: StatusInfoParams)`
   - ❌ Incorrect: `function getStatusInfo(status: string, isGraded: boolean, isAwaitingReview: boolean, isOverdue?: boolean)`
   - Define a named `type` or `interface` for the object parameter shape.

7. **Component Decomposition (Subcomponents & Custom Hooks)**:
   - **Decompose large and complex components**: Components growing beyond ~150-200 lines or containing multiple distinct UI sections (e.g. cards, grids, event lists, forms) MUST be split into dedicated subcomponents.
     - Examples: `OverviewTab` decomposed into `StudentCard`, `StatCardGrid`, and `UpcomingEventsList`; `DeanContactModal` decomposed into `DeanContactInfo` and `DeanTopicChips`.
   - **Extract complex logic into custom hooks**: Extract data fetching, localStorage caching, lifecycle synchronization, and event listeners out of UI components into dedicated custom hooks (e.g. `useDashboardData`, `useAssignmentStatuses`).
   - Keep page and tab components thin, declarative, and focused solely on layout composition.

8. **Helper Functions & Utilities Placement (`helpers.ts` & `@universe/core`)**:
   - **Extract helpers from components and hooks**: Pure functions, calculations, date formatting, score tone mappers, and regex matchers MUST NOT reside inline inside React components or hooks. Extract them into co-located `helpers.ts` files with corresponding unit tests in `helpers.test.ts`.
   - **Shared helpers go to `@universe/core`**: If a function or utility is intended for general/cross-package use (e.g., grade accumulation algorithms, date calculations, browser checks), place it in `@universe/core/utils/` or `@universe/core/constants/`.
   - **Backend DTO helpers**: Never keep utility functions (e.g., query string transformers, boolean parsers) inside DTO files. Always extract them to a companion `<module>.helpers.ts` file.
   - **No Redundant Variable Aliases**: Do not re-assign variables solely for naming convenience (e.g., `const isCompleted = isGraded; const overdue = isAwaitingReview;`). Use canonical variable names directly.

9. **Strict UI Localization via Translation Keys (i18n)**:
   - **Zero hardcoded text in UI**: ALL user-facing text (titles, descriptions, badges, button labels, tooltips, placeholders, toast notifications, aria-labels) MUST be retrieved using translation keys via `useLanguage().formatMessage('key')`.
   - **Bilingual synchronization**: Every new translation key MUST be added to BOTH `packages/uni-hub/i18n/locales/uk.ts` and `packages/uni-hub/i18n/locales/en.ts` to satisfy `Record<TranslationKey, string>`.
   - **Language-agnostic UI library (`@universe/ui`)**: Shared design system components must not have hardcoded Ukrainian or English text. Accept accessible labels via props (e.g., `closeLabel?: string`) and supply localized values from the consumer.

10. **Incorporating GitHub PR Review Feedback**:
    - **Reviewer comments are project law**: All patterns, critiques, and preferences established by code reviewers (e.g., `iamredl-lab`) on GitHub Pull Requests must be strictly observed as core codebase standards.
    - **Proactive prevention**: When generating or reviewing code, proactively check for and prevent all previously flagged review issues:
      - ❌ No component aliases like `Button as SimpleButton`.
      - ❌ No redundant aliases for types, variables, or functions.
      - ❌ No functions with >3 positional parameters.
      - ❌ No inline helpers inside components or DTO files.
      - ❌ No monolithic components without subcomponents or custom hooks.
      - ❌ No hardcoded UI strings without i18n translation keys.

---

## Verification Pipeline

Always verify your changes before committing:

```bash
# 1. Lint check (zero warnings allowed)
npx oxlint --deny-warnings

# 2. Format check
npx prettier --check .

# 3. Backend test suite with coverage
npx pnpm --filter @universe/backend test

# 4. E2E integration test suite
node packages/ui/node_modules/vitest/vitest.mjs run --config tests/e2e/vitest.config.mjs

# 5. Typecheck
npx tsc --noEmit -p packages/core/tsconfig.json
npx tsc --noEmit -p packages/uni-hub/tsconfig.json
```

---

## Reusable Agent Roles

When delegating tasks to subagents, refer to the reusable role templates in `.agents/roles/`:

- `core-architect.md`: Managing domain contracts and grade calculations.
- `ui-specialist.md`: Developing accessible Una UI components and tokens.
- `backend-gateway-dev.md`: NestJS Moodle API integration and controller tests.
- `quality-auditor.md`: Pre-commit auditing for SonarCloud, Oxlint, and test coverage.
