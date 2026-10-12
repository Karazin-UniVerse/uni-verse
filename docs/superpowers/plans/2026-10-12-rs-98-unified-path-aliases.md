# RS-98 Unified Path Aliases Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify and standardize import paths across frontend packages (`packages/uni-hub`, `packages/ui`) to short canonical aliases (`@core/*`, `@ui`, `@una`), eliminating verbose and inconsistent `@universe/core/*` and `@universe/ui` paths, while preserving native workspace package resolution (`@universe/core/*`) in `packages/backend` for unbundled Node.js runtime execution.

**Architecture:** Add path mappings to TypeScript and Vite configs in `packages/ui` and verify Jest resolution in `packages/backend`, then refactor imports in UI stories and uni-hub to their canonical aliases. Finally, sync documentation and AI instructions and run the full test suite.

**Tech Stack:** TypeScript 6.0, NestJS 12, Next.js 16, Vite / Storybook 10, Turborepo, pnpm workspaces, Jest, Vitest, oxlint.

**Spec:** `docs/superpowers/specs/2026-10-12-rs-98-unified-path-aliases-design.md`

## Global Constraints

- Package names in `package.json` MUST remain `@universe/core`, `@universe/ui`, and `@universe/backend` (pnpm workspace dependencies use `"workspace:*"`).
- Frontend packages (`packages/uni-hub`, `packages/ui`): All shared contracts, constants, and utils from `packages/core` MUST be imported via `@core/*` (e.g. `@core/types`, `@core/constants/grades`, `@core/utils/grades`).
- Backend (`packages/backend`): Imports from `packages/core` intentionally remain on `@universe/core/*` for unbundled Node.js runtime compatibility.
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

### Task 1: Configure Path Aliases in `packages/ui` and Jest in `packages/backend`

**Files:**

- Modify: `packages/backend/package.json`
- Modify: `packages/ui/tsconfig.json`
- Modify: `packages/ui/.storybook/main.ts`

**Interfaces:**

- Produces: TypeScript and Vite resolution for `@core/*` and `@una` in UI, and Jest resolution for `@universe/core/*` in backend.

- [x] **Step 1: Keep backend standard workspace resolution in `packages/backend/tsconfig.json`**

In `packages/backend`, Node.js runs unbundled CommonJS in production (`node dist/main`). Backend relies on native workspace package resolution for `@universe/core/*` without path-mapping aliases.

- [x] **Step 2: Clean up Jest `moduleNameMapper` in `packages/backend/package.json`**

Remove dead non-existent `core/index.ts` mapping and keep wildcard package matcher:

```json
"^@universe/core/(.*)$": "<rootDir>/../core/$1"
```

- [x] **Step 3: Add `@core/*` and `@una` paths to `packages/ui/tsconfig.json`**

In `packages/ui/tsconfig.json`, add to `compilerOptions.paths`:

```json
"paths": {
  "@core/*": ["../core/*"],
  "@una": ["./components/una/index.ts"],
  "@una/*": ["./components/una/*"]
}
```

- [x] **Step 4: Update Vite alias in `packages/ui/.storybook/main.ts`**

In `packages/ui/.storybook/main.ts`, configure `viteFinal` aliases for `@core` and `@una`:

```ts
'@core': resolve(dirname(fileURLToPath(import.meta.url)), '../../core'),
'@una': resolve(dirname(fileURLToPath(import.meta.url)), '../components/una'),
```

- [x] **Step 5: Run tests and typecheck to verify configurations**

Run: `pnpm --filter @universe/backend test opportunities.service.spec.ts`
Expected: PASS

Run: `pnpm --filter @universe/ui typecheck`
Expected: PASS

- [x] **Step 6: Commit configuration changes**

---

### Task 2: Backend Architecture & Runtime Compatibility Verification

**Files:**

- Verify: `packages/backend/`

**Interfaces:**

- Produces: Verified backend runtime module resolution under unbundled Node.js (`node dist/main`).

- [x] **Step 1: Verify architectural decision on backend runtime imports**

In `packages/backend`, `nest build` runs `tsc` targeting unbundled CommonJS in `dist/`. Path mapping `@core/*` pointing to `../core/dist/*.d.ts` resulted in `tsc` generating `require("../../core/dist/constants/routes.d.js")`, which crashes with `MODULE_NOT_FOUND` at runtime because `.d.js` does not exist.
Per monorepo architecture guidelines, backend imports intentionally remain on the workspace package `@universe/core/*`, resolved natively by Node.js.

- [x] **Step 2: Run backend tests and typecheck**

Run: `pnpm --filter @universe/backend test`
Expected: 41 test suites pass (350+ tests).

Run: `pnpm --filter @universe/backend typecheck`
Expected: 0 errors.

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
Ensure standard rule specifies importing via `@core/*` (e.g. `@core/utils/browser`, `@core/constants/grades`, `@core/types`) on the frontend (`uni-hub`, `ui`), while backend imports via `@universe/core/*` for unbundled Node.js runtime execution.
Remove outdated `@universe/core/utils/browser` frontend notation.

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
