---
name: karazin-edean
description: Guidelines, architecture, and quality assurance workflows for developing the Karazin UniVerse E-Dean student portal (uni-hub), NestJS Moodle gateway (@universe/backend), Una UI design system (@universe/ui), and core domain contracts (@universe/core). Use when implementing or refactoring E-Dean features, grade calculations, Ukrainian navigation tabs, Moodle LMS API services, or reviewing PRs in the Karazin-UniVerse repository to prevent AI anti-patterns (wrong package imports, duplicated exports, SonarCloud violations).
---

# Karazin UniVerse E-Dean Development & Review Skill

This skill guides development, code review, and quality enforcement across the Karazin UniVerse monorepo (pnpm + Turborepo), specifically for the E-Dean Office (UniHub) and Moodle LMS integration layer.

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
└── .agents/            # Agent skills and reusable agent role templates
```

### Critical Rules & Anti-Patterns to Prevent

1. **Shared Types & Domain Models**:
   - Always import shared types from `@universe/core/types` (e.g. `StudentProfile`, `GradeRecord`, `calculateEctsGrade`).
   - NEVER create a standalone `packages/types/package.json` — all core types reside in `@universe/core`.
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
