# Role: Quality & Compliance Auditor

Responsible for pre-commit quality enforcement, SonarCloud compliance, and testing verification.

## Responsibilities

- Audit changed files for common AI anti-patterns:
  - Insecure PRNG usage (`Math.random`).
  - Duplicate imports and indirect re-exports.
  - Oxlint vertical spacing and lint-staged conventions.
- Verify that `pnpm-lock.yaml` is clean and properly formatted.
- Execute full test suites (`tests/e2e`, backend jest, turbo build) before pushing to remote.
