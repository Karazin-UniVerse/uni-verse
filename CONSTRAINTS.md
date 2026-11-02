# Project Constraints & Quality Bar: UniVerse

This document records non-negotiable technical constraints enforced across the repository. AI agents and contributors must uphold these rules on every change.

## 1. Zero-Tolerance Code Quality

- **Oxlint:** Zero errors, zero warnings (`oxlint --deny-warnings`). No newly added `// oxlint-disable` comments.
- **Stylelint:** Zero errors, zero warnings (`stylelint "**/*.{css,scss}"`). No newly added `/* stylelint-disable */`.
- **TypeScript:** Strict typecheck with 0 errors (`tsc --noEmit`). No newly introduced `// @ts-ignore`, `// @ts-expect-error` without team approval, and no fallback to `any`.
- **Tests:** 100% test passing rate across package suites (`pnpm test`). No skipped tests (`it.skip`, `describe.skip`) or stripped assertions.

## 2. Monorepo Architecture & Contracts

- Shared contracts between NestJS and Next.js must reside in `@universe/core` (`packages/core/types`).
- Never introduce circular package dependencies.
- Do not create compatibility aliases, re-export shims, or redundant wrapper names; update all call sites instead.

## 3. Security & Institutional Identity

- Corporate Google SSO domain restriction (`@student.karazin.ua`, `@karazin.ua`) is mandatory for authentication.
- All NestJS controller endpoints receiving payload must validate input using `class-validator` DTOs.
- Never expose internal database IDs, secrets, or JWT tokens in client-side logs or public responses.
