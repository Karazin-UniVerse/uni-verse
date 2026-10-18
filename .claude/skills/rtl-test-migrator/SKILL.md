---
name: rtl-test-migrator
description: Migrates legacy React test files (renderToString, shallow HTML string matching, manual hook mocks) to React Testing Library (RTL) with Happy-DOM, screen, within, and userEvent. Accepts a single file, file list, or directory path.
---

# RTL Test Migrator Skill

## Overview
This skill migrates legacy React component and hook test suites from static string matching (`renderToString` / `renderToStaticMarkup` from `react-dom/server` executed under Node.js) to modern **React Testing Library (RTL)** with **Happy-DOM** and **@testing-library/jest-dom**.

It supports processing:
1. **A single file path**: e.g., `packages/ui/components/una/Button/Button.test.tsx`
2. **A list of file paths**: e.g., multiple space- or comma-separated test file paths.
3. **A directory path**: e.g., `packages/ui/components/una` (recursively identifies and migrates all `*.test.ts*` files).

> **Related Skills**:
> - For writing new unit tests from scratch or expanding test coverage on untested components/hooks, use [`unit-test-writing`](../unit-test-writing/SKILL.md).
> - For migrating or generating 5+ test files in parallel via subagents, use [`parallel-test-orchestrator`](../parallel-test-orchestrator/SKILL.md).

---

## When to Use
- Migrating existing test suites from `renderToString` / `renderToStaticMarkup` or `React.createElement` to RTL.
- Upgrading component tests from substring assertions (`expect(html).toContain(...)`) to semantic DOM assertions (`expect(element).toBeInTheDocument()`).
- Refactoring hook tests to use `renderHook` and dispatch real DOM events in Happy-DOM.

---

## Migration Workflow

### Step 1: Input Resolution & Target Discovery
- If input is a directory: find all `*.test.ts` and `*.test.tsx` files within it.
- If input is a list of files: process each sequentially (or batch via `parallel-test-orchestrator`).
- If input is a single file: process that file.
- Inspect the file content to confirm whether it contains legacy patterns (`renderToString`, `renderToStaticMarkup`, `react-dom/server`, string assertions).

### Step 2: File Extension Check (TSX vs TS)
- If the test renders React components using JSX syntax (`<Component ... />`), the file extension **MUST** be `.test.tsx`.
- If the legacy file is named `.test.ts`, rename it using git (when orchestrating in parallel via `parallel-test-orchestrator`, the parent orchestrator performs all `git mv` renames before spawning subagents):
  ```bash
  git mv path/to/MyComponent.test.ts path/to/MyComponent.test.tsx
  ```
- Pure utility or non-JSX hook tests may remain `.test.ts`.

### Step 3: Imports Refactoring
- **Remove**:
  ```ts
  import { renderToString, renderToStaticMarkup } from 'react-dom/server';
  ```
- **Add**:
  ```ts
  import { render, screen, within } from '@testing-library/react';
  import userEvent from '@testing-library/user-event';
  ```
- If testing hooks:
  ```ts
  import { renderHook, act } from '@testing-library/react';
  ```
- Note: `@testing-library/jest-dom/vitest` matchers (`toBeInTheDocument`, `toBeDisabled`, etc.) are globally registered via `vitest.setup.ts`, so no per-file matcher import is necessary.

### Step 4: Component Rendering & Queries
- Replace `renderToString(<Component ... />)` or `renderToStaticMarkup(React.createElement(Component, props))` with:
  ```tsx
  render(<Component {...props} />);
  ```
- **Query Priority (Accessibility First)**:
  1. `screen.getByRole('button', { name: /save/i })` (accessible role + name)
  2. `screen.getByLabelText(/username/i)` (form fields)
  3. `screen.getByPlaceholderText(...)`
  4. `screen.getByText(/content/i)`
  5. `screen.getByTestId(...)` (last resort when no accessible role or label exists)

### Step 5: Assertions Migration
Replace fragile string comparisons with semantic DOM assertions:
- `expect(html).toContain('<button')` ➡️ `expect(screen.getByRole('button')).toBeInTheDocument()`
- `expect(html).toContain('disabled')` ➡️ `expect(button).toBeDisabled()`
- `expect(html).toContain('custom-class')` ➡️ `expect(element).toHaveClass('custom-class')`
- `expect(html).toContain('href="/path"')` ➡️ `expect(link).toHaveAttribute('href', '/path')`
- `expect(html).not.toContain('<button')` ➡️ `expect(screen.queryByRole('button')).not.toBeInTheDocument()`

### Step 6: User Interactions
When testing clicks, typing, or keyboard navigation:
```tsx
const user = userEvent.setup();
render(<Button onClick={handleClick}>Click</Button>);

await user.click(screen.getByRole('button', { name: /click/i }));
expect(handleClick).toHaveBeenCalledTimes(1);
```

### Step 7: Hook Migration
Replace manual helper tests with `renderHook`:
```tsx
const { result } = renderHook(() => useMyHook());
expect(result.current.value).toBe(expected);

act(() => {
  result.current.setValue('updated');
});
expect(result.current.value).toBe('updated');
```

---

## Strict Conventions & Quality Guardrails

1. **Test Naming Convention**:
   - Every single `it(...)` or `test(...)` description **MUST** start with `'should ...'`:
     ```tsx
     it('should render standard button element with accessible label', () => { ... });
     ```

2. **No Test Bloat**:
   - Do not test trivial implementation details (internal variables, class names that don't affect behavior).
   - Test user-visible outcomes and accessibility states.

3. **Accessibility (a11y) & Security**:
   - Verify ARIA attributes (`aria-expanded`, `aria-label`, `aria-hidden`, `role`).
   - Check keyboard navigation (`Enter`, `Escape`, `Tab`) where interactive components are involved.
   - For user inputs, ensure strings are rendered safely without XSS vulnerability.

4. **SonarCloud & Oxlint Guardrails (`docs/ai/quality.md`)**:
   - In mocks for modal dialogs, **NEVER** use `<div role="dialog">`. Always use `<dialog open aria-label={title}>` (Sonar rule `S6819`/`S6847`).
   - **NEVER** call `.sort()` without a comparator; always pass `(a, b) => a.localeCompare(b)` or `(a, b) => a - b` (Sonar rule `S2871`).
   - **NEVER** use `Math.random()` in test data or mocks (Sonar rule `S2245`).

---

## Step 8: Validation
After migrating each file or batch:
```bash
# Run Vitest on the modified test file
pnpm --filter <pkg> test <TestFileName> --run

# Verify formatting and linter
pnpm exec oxlint path/to/file.test.tsx
pnpm exec prettier --check path/to/file.test.tsx
```
