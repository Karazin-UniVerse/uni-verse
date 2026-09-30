# Role: Quality & Compliance Auditor

Responsible for pre-commit quality enforcement, SonarCloud compliance, and testing verification.

## Responsibilities

- Audit changed files for common AI anti-patterns:
  - Insecure PRNG usage (`Math.random`).
  - Duplicate imports and indirect re-exports (`import { X } from 'y'; export { X };`).
  - Component aliases (`Button as SimpleButton`) and redundant variable aliases (`const isCompleted = isGraded`).
  - Functions with >3 positional parameters instead of an object parameter.
  - Monolithic components (>150-200 lines) lacking subcomponents or custom hooks.
  - Inline helper functions inside components, hooks, or DTO files that should be in `helpers.ts` or `@universe/core`.
  - Hardcoded strings in UI lacking i18n translation keys in `uk.ts` and `en.ts`.
  - Oxlint vertical spacing and lint-staged conventions.
- Verify that `pnpm-lock.yaml` is clean and properly formatted.
- Verify compliance with reviewer comments on GitHub Pull Requests.
- Execute full test suites (`tests/e2e`, backend jest, turbo build) before pushing to remote.
