# RS-98 Unified Path Aliases Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify and standardize import paths across the monorepo to short canonical aliases (`@core/*`, `@ui`, `@una`), eliminating verbose and inconsistent `@universe/core/*` and `@universe/ui` paths.

**Architecture:** Add path mappings to TypeScript, Jest, and Vite configs in `packages/backend` and `packages/ui`, then refactor imports in backend, UI stories, and uni-hub to their canonical aliases. Finally, sync documentation and AI instructions and run the full test suite.

**Tech Stack:** TypeScript 6.0, NestJS 12, Next.js 16, Vite / Storybook 10, Turborepo, pnpm workspaces, Jest, Vitest, oxlint.

**Spec:** `docs/superpowers/specs/2026-10-12-rs-98-unified-path-aliases-design.md`

## Global Constraints

- Package names in `package.json` MUST remain `@universe/core`, `@universe/ui`, and `@universe/backend` (pnpm workspace dependencies use `"workspace:*"`).
- All shared contracts, constants, and utils from `packages/core` MUST be imported via `@core/*` (e.g. `@core/types`, `@core/constants/grades`, `@core/utils/grades`).
- All complex UI components MUST be imported from `@ui` (`packages/ui/index.ts`).
- All Una primitives MUST be imported from `@una` (`packages/ui/components/una/index.ts`).
- Zero lint warnings (`oxlint --deny-warnings`) and zero typecheck errors across all 7 packages.
- All 350+ backend Jest tests and 190 uni-hub Vitest tests must pass with zero failures.

## Review Focus

- Backend Jest runner fails to resolve `@core/*` due to missing `moduleNameMapper` entries.
- NestJS runtime / build cannot resolve `@core/*` when compiling with TypeScript.
- Storybook Vite build fails due to missing `@core` alias in `.storybook/main.ts`.
- Relative imports or residual `@universe/core/*` imports remain unmigrated.
- Turborepo builds fail due to unexported paths or wrong TS project references.

---

### Task 1: Configure Path Aliases in `packages/backend` and `packages/ui`

**Files:**

- Modify: `packages/backend/tsconfig.json`
- Modify: `packages/backend/package.json:65-75`
- Modify: `packages/ui/tsconfig.json`
- Modify: `packages/ui/.storybook/main.ts:15-25`

**Interfaces:**

- Produces: TypeScript, Jest, and Vite resolution for `@core/*` in backend and ui.

- [x] **Step 1: Add `@core/*` paths to `packages/backend/tsconfig.json`**

In `packages/backend/tsconfig.json`, add to `compilerOptions`:

```json
"paths": {
  "@core": ["../core/index.ts"],
  "@core/*": ["../core/*"]
}
```

- [x] **Step 2: Update Jest `moduleNameMapper` in `packages/backend/package.json`**

Replace:

```json
"^@universe/core/(.*)$": "<rootDir>/../core/$1",
"^@universe/core$": "<rootDir>/../core/index.ts",
```

with:

```json
"^@core/(.*)$": "<rootDir>/../core/$1",
"^@core$": "<rootDir>/../core/index.ts",
```

- [x] **Step 3: Add `@core/*` paths to `packages/ui/tsconfig.json`**

In `packages/ui/tsconfig.json`, add to `compilerOptions`:

```json
"paths": {
  "@core/*": ["../core/*"],
  "@una": ["./components/una/index.ts"],
  "@una/*": ["./components/una/*"]
}
```

- [x] **Step 4: Update Vite alias in `packages/ui/.storybook/main.ts`**

In `packages/ui/.storybook/main.ts`, update `viteFinal` alias:
Replace:

```ts
'@universe/core': resolve(dirname(fileURLToPath(import.meta.url)), '../../core'),
```

with:

```ts
'@core': resolve(dirname(fileURLToPath(import.meta.url)), '../../core'),
```

- [x] **Step 5: Run tests and typecheck to verify configurations**

Run: `pnpm --filter @universe/backend test opportunities.service.spec.ts`
Expected: PASS

Run: `pnpm --filter @universe/ui typecheck`
Expected: PASS

- [x] **Step 6: Commit configuration changes**

```bash
git add packages/backend/tsconfig.json packages/backend/package.json packages/ui/tsconfig.json packages/ui/.storybook/main.ts
git commit -m "chore(config): add @core path aliases to backend and ui configs"
```

---

### Task 2: Refactor Imports in `packages/backend` to `@core/*`

**Files:**

- Modify: `packages/backend/auth/auth.controller.ts:1-25`
- Modify: `packages/backend/moodle/moodle-assignments/moodle-assignments.helpers.ts:1-15`
- Modify: `packages/backend/moodle/moodle-grades/moodle-grades-dto.ts:1-15`
- Modify: `packages/backend/moodle/moodle-grades/moodle-grades.service.ts:1-20`
- Modify: `packages/backend/moodle/moodle-profile/moodle-profile-dto.ts:1-15`

**Interfaces:**

- Consumes: `@core/*` path alias configured in Task 1.
- Produces: Backend codebase with zero `@universe/core/*` import statements.

- [x] **Step 1: Replace `@universe/core` imports in `packages/backend` files**

In `packages/backend/auth/auth.controller.ts`:
Replace `@universe/core/constants/routes` with `@core/constants/routes`.

In `packages/backend/moodle/moodle-assignments/moodle-assignments.helpers.ts`:
Replace `@universe/core/utils/boolean` with `@core/utils/boolean`.

In `packages/backend/moodle/moodle-grades/moodle-grades-dto.ts`:
Replace `@universe/core/types` with `@core/types`.
Replace `@universe/core/utils/grades` with `@core/utils/grades`.

In `packages/backend/moodle/moodle-grades/moodle-grades.service.ts`:
Replace `@universe/core/constants/grades` with `@core/constants/grades`.
Replace `@universe/core/utils/grades` with `@core/utils/grades`.

In `packages/backend/moodle/moodle-profile/moodle-profile-dto.ts`:
Replace `@universe/core/types` with `@core/types`.

- [x] **Step 2: Run backend tests and typecheck**

Run: `pnpm --filter @universe/backend test`
Expected: 41 test suites pass (350+ tests).

Run: `pnpm --filter @universe/backend typecheck`
Expected: 0 errors.

- [x] **Step 3: Commit backend changes**

```bash
git add packages/backend/
git commit -m "refactor(backend): use @core path alias for all core imports"
```

---

### Task 3: Refactor Imports in `packages/ui` to `@core/*`

**Files:**

- Modify: `packages/ui/.storybook/preview.tsx:1-10`
- Modify: `packages/ui/components/complex/ActionCard/ActionCard.stories.tsx:1-10`
- Modify: `packages/ui/components/complex/ContactInfoGrid/ContactInfoGrid.stories.tsx:1-10`
- Modify: `packages/ui/components/complex/GradeFeedItem/GradeFeedItem.stories.tsx:1-10`
- Modify: `packages/ui/components/complex/StatusBanner/StatusBanner.stories.tsx:1-10`
- Modify: `packages/ui/components/complex/TopicChips/TopicChips.stories.tsx:1-10`

**Interfaces:**

- Consumes: `@core/*` path alias in `packages/ui`.
- Produces: UI library stories with zero `@universe/core/*` import statements.

- [x] **Step 1: Replace `@universe/core` imports in `packages/ui` stories and preview**

In `packages/ui/.storybook/preview.tsx`:
Replace `@universe/core/constants/themes` with `@core/constants/themes`.

In `ActionCard.stories.tsx`, `ContactInfoGrid.stories.tsx`, `GradeFeedItem.stories.tsx`, `StatusBanner.stories.tsx`, `TopicChips.stories.tsx`:
Replace `@universe/core/constants/breakpoints` with `@core/constants/breakpoints`.

- [x] **Step 2: Run UI typecheck, unit tests, and Storybook build**

Run: `pnpm --filter @universe/ui typecheck`
Expected: 0 errors.

Run: `pnpm --filter @universe/ui test`
Expected: PASS.

Run: `pnpm --filter @universe/ui build-storybook`
Expected: Storybook build completes successfully.

- [x] **Step 3: Commit UI changes**

```bash
git add packages/ui/
git commit -m "refactor(ui): use @core path alias in preview and stories"
```

---

### Task 4: Standardize UI Imports in `packages/uni-hub` to `@ui`

**Files:**

- Modify: `packages/uni-hub/components/auth/UnlinkMoodleModal.tsx:1-10`
- Modify: `packages/uni-hub/views/dashboard/tabs/ConnectMoodleTab.tsx:1-10`
- Modify: `packages/uni-hub/views/dashboard/tabs/OpportunitiesTab.tsx:1-15`
- Modify: `packages/uni-hub/views/dashboard/tabs/opportunities/modals/ApplyOpportunityModal.tsx:1-15`
- Modify: `packages/uni-hub/views/dashboard/tabs/opportunities/modals/CreateOpportunityModal.tsx:1-15`
- Modify: `packages/uni-hub/views/dashboard/tabs/opportunities/modals/ModerationRejectModal.tsx:1-15`
- Modify: `packages/uni-hub/views/dashboard/tabs/opportunities/modals/OpportunityDetailModal.tsx:1-15`

**Interfaces:**

- Consumes: `@ui` alias from `packages/uni-hub/tsconfig.json`.
- Produces: Uni-hub application with zero `@universe/ui` import statements in TS/TSX code.

- [x] **Step 1: Replace `@universe/ui` imports with `@ui`**

In all 7 files, change `from '@universe/ui'` to `from '@ui'`.

- [x] **Step 2: Run uni-hub tests and typecheck**

Run: `pnpm --filter @universe/uni-hub test`
Expected: 30 test files pass (190 tests).

Run: `pnpm --filter @universe/uni-hub typecheck`
Expected: 0 errors.

- [x] **Step 3: Commit uni-hub changes**

```bash
git add packages/uni-hub/
git commit -m "refactor(uni-hub): use canonical @ui alias instead of @universe/ui"
```

---

### Task 5: AI Rules & Documentation Sync, Verification

**Files:**

- Modify: `docs/ai/architecture.md`
- Generated: `GEMINI.md` (via `pnpm gemini:sync`)

**Interfaces:**

- Produces: Updated architecture guidelines mandating `@core/*`, `@ui`, and `@una`.

- [x] **Step 1: Update `docs/ai/architecture.md`**

In `docs/ai/architecture.md`:
Under `Core layout`:
Ensure standard rule specifies importing via `@core/*` (e.g. `@core/utils/browser`, `@core/constants/grades`, `@core/types`) across all packages.
Remove outdated `@universe/core/utils/browser` notation.

- [x] **Step 2: Sync GEMINI.md**

Run: `pnpm gemini:sync`
Expected: `GEMINI.md` regenerated matching `docs/ai/`.

- [x] **Step 3: Full Monorepo Verification**

Run: `pnpm typecheck`
Expected: All 7 packages pass.

Run: `pnpm test`
Expected: All tests pass across the monorepo.

Run: `pnpm build`
Expected: Core, Backend, and Uni-hub production builds pass.

Run: `pnpm lint`
Expected: 0 errors, 0 warnings.

Run: `pnpm lint:style`
Expected: 0 errors.

Run: `pnpm exec prettier --check packages/ docs/`
Expected: All files properly formatted.

- [x] **Step 4: Commit documentation and sync**

```bash
git add docs/ai/architecture.md GEMINI.md
git commit -m "docs(ai): update canonical import rules to @core, @ui, @una"
```
