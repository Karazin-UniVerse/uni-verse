# RS-98: Unified Path Aliases Design

Date: 2026-10-12
Ticket: RS-98 (Notion: "Remove path alises like @universe/core. Update setup to have unified approach with @core, @una, @ui еtс")
Context: [PR #132 discussion r4106555092](https://github.com/Karazin-UniVerse/uni-verse/pull/132#discussion_r4106555092)

## 1. Goal

Eliminate verbose, inconsistent import paths (such as `@universe/core/*` and `@universe/ui`) across the monorepo by establishing a clean, uniform set of short path aliases:

- `@core/*` for all `@universe/core` contracts, domain models, constants, and utilities.
- `@ui` for composite UI-only components from `@universe/ui`.
- `@una` for Una design system primitives from `@universe/ui/components/una`.

All packages (`packages/backend`, `packages/ui`, `packages/uni-hub`) will adhere to this single canonical import convention.

---

## 2. Architecture & Path Aliases

### Canonical Aliases

| Alias     | Target                                                | Consumers                 | Purpose                                            |
| --------- | ----------------------------------------------------- | ------------------------- | -------------------------------------------------- |
| `@core/*` | `packages/core/*` (`types`, `constants/*`, `utils/*`) | `uni-hub`, `ui` (bundled) | Shared contracts, grade math, constants, utilities |
| `@ui`     | `packages/ui/index.ts`                                | `uni-hub`                 | Complex composite UI components                    |
| `@una`    | `packages/ui/components/una/index.ts`                 | `uni-hub`, `ui`           | Atomic Una design system primitives                |

_Note: In `packages/backend`, Node.js runs unbundled CommonJS in production (`node dist/main`). To preserve native Node runtime module resolution without broken `.d.js` imports or runtime path shims, backend imports intentionally remain on the `@universe/core/*` workspace package._

---

## 3. Package Configurations

### 3.1 `packages/backend`

1. **TypeScript (`tsconfig.json`)**:
   Backend relies on standard workspace package resolution for `@universe/core/*`. No custom path aliases needed.
2. **Jest (`package.json`)**:
   Jest maps the workspace package to local source files for fast testing without prior compilation:
   ```json
   "^@universe/core/(.*)$": "<rootDir>/../core/$1"
   ```
3. **Build & Runtime**:
   `nest build` runs `tsc` targeting `dist/`. Since imports use `@universe/core/*`, Node.js natively resolves them through pnpm workspace symlinks in production (`node dist/main`).

### 3.2 `packages/ui`

1. **TypeScript (`tsconfig.json`)**:
   Add paths:
   ```json
   "paths": {
     "@core/*": ["../core/*"],
     "@una": ["./components/una/index.ts"],
     "@una/*": ["./components/una/*"]
   }
   ```
2. **Storybook (`.storybook/main.ts`)**:
   Update Vite aliases:
   ```ts
   '@core': resolve(dirname(fileURLToPath(import.meta.url)), '../../core')
   ```
   (replacing `@universe/core`).

### 3.3 `packages/uni-hub`

1. **TypeScript (`tsconfig.json`)**:
   Verify existing canonical paths:
   ```json
   "@core/*": ["../core/*"],
   "@ui": ["../ui/index.ts"],
   "@una": ["../ui/components/una/index.ts"],
   "@una/*": ["../ui/components/una/*"]
   ```

---

## 4. Import Refactoring Scope

### 4.1 Backend (`packages/backend`)

Per monorepo architecture guidelines and runtime verification, `packages/backend` compiles to unbundled CommonJS (`node dist/main`). Rewriting imports to `@core/*` breaks runtime module resolution under Node.js without bundlers or path-mapping runtime shims.

Therefore, backend imports intentionally remain on the workspace package `@universe/core/*`. No import refactoring is performed in backend.

### 4.2 UI Library (`packages/ui`)

Replace all `@universe/core/*` imports with `@core/*`:

- `.storybook/preview.tsx`: `@universe/core/constants/themes` $\to$ `@core/constants/themes`
- All stories in `components/complex/*` using `@universe/core/constants/breakpoints` $\to$ `@core/constants/breakpoints`

### 4.3 Uni-Hub (`packages/uni-hub`)

Replace all `@universe/ui` imports with canonical `@ui`:

- `views/dashboard/tabs/ConnectMoodleTab.tsx`
- `components/auth/UnlinkMoodleModal.tsx`
- `views/dashboard/tabs/OpportunitiesTab.tsx`
- `views/dashboard/tabs/opportunities/modals/ApplyOpportunityModal.tsx`
- `views/dashboard/tabs/opportunities/modals/CreateOpportunityModal.tsx`
- `views/dashboard/tabs/opportunities/modals/ModerationRejectModal.tsx`
- `views/dashboard/tabs/opportunities/modals/OpportunityDetailModal.tsx`

---

## 5. AI Rules & Documentation Sync

1. Update `docs/ai/architecture.md`:
   - Standardize import rules: `@core/*` for core submodules, `@ui` for complex components, `@una` for primitives.
   - Remove obsolete mention of `@universe/core/utils/browser`.
2. Run `pnpm gemini:sync` to keep `GEMINI.md` in sync.

---

## 6. Verification & Testing Matrix

1. **Unit Tests**:
   - `pnpm --filter @universe/backend test` (all 41 test suites, 350+ tests pass).
   - `pnpm --filter @universe/uni-hub test` (all 30 test files, 190 tests pass).
   - `pnpm --filter @universe/ui test` (UI unit tests pass).
   - `pnpm --filter @universe/ui build-storybook` (Storybook builds without Vite alias errors).
2. **Typecheck**:
   - `pnpm typecheck` (zero TypeScript errors across all packages).
3. **Builds**:
   - `pnpm --filter @universe/core build`
   - `pnpm --filter @universe/backend build`
   - `pnpm --filter @universe/uni-hub build`
4. **E2E / Architecture Tests**:
   - `pnpm test` (tier1 requirement tests pass).
5. **Code Style & Formatting**:
   - `pnpm lint` (`oxlint --deny-warnings`).
   - `pnpm lint:style`.
   - `pnpm exec prettier --check` on touched files.
