---
name: rtl-test-migrator
description: Migrates legacy React test files (renderToString, shallow HTML string matching, manual hook mocks) to React Testing Library (RTL) with Happy-DOM, and generates or expands comprehensive component/hook unit tests with strict accessibility, security, and quality standards.
---

# RTL Test Migrator & Generator Skill

## Overview
This skill guides the migration, generation, and expansion of unit test suites for React components and hooks across the codebase using **React Testing Library (RTL)**, **Happy-DOM**, and **@testing-library/jest-dom**.

It supports three operational modes:
1. **Mode A (Migrate Legacy Tests)**: Converts legacy `renderToString` / `renderToStaticMarkup` tests from static string matching to RTL DOM queries and assertions.
2. **Mode B (Generate Missing Test Files)**: Creates comprehensive, zero-bloat test suites from scratch for untested components or hooks.
3. **Mode C (Expand Existing Test Files)**: Audits existing test suites and adds missing high-value test cases (accessibility, keyboard navigation, user interactions, edge cases).

---

## Operational Modes

### Mode A: Migrate Legacy Test Files
- **Detect**: Check for imports from `react-dom/server` (`renderToString`, `renderToStaticMarkup`) or static string matching (`expect(html).toContain(...)`).
- **File Extension**: If the test contains JSX, ensure the file is `.test.tsx` (rename via `git mv` if currently `.test.ts`). Pure hooks/utilities remain `.test.ts`.
- **Refactor**: Replace `renderToString(<Comp />)` with `render(<Comp />)`.
- **Assertions**: Replace substring checks with semantic RTL queries (`screen.getByRole`, `expect(element).toBeInTheDocument()`).

### Mode B: Generate Missing Test Files
- **Target Identification**: When a component or hook has no corresponding test file (`[Name].test.tsx` or `[Name].test.ts`), create one adjacent to the source file.
- **File Naming Standard**:
  - React Component: `[Name].test.tsx`
  - React Hook: `[Name].test.ts` (or `.test.tsx` if it requires a JSX wrapper/provider)
  - Pure Utility: `[Name].test.ts`
- **Core Test Cases to Include**:
  1. Default render with accessible labels/roles (`'should render ...'`).
  2. Core user interactions (clicks, keyboard input, toggles via `userEvent`).
  3. Key props/variants (disabled states, custom classes, conditional content).
  4. Accessibility (`aria-*` attributes, role semantics, keyboard navigation).
  5. Security & edge cases (safe rendering of arbitrary strings, empty/null states, external links having `rel="noopener noreferrer"`).

### Mode C: Expand Incomplete Existing Tests
- Audit existing test cases to ensure they cover critical user interactions and error boundaries without bloat.
- Add missing interaction tests (e.g. form submission, outside click handling, keyboard Escape/Enter).
- Verify accessibility attributes and roles.

---

## Strict Conventions & Quality Guardrails

1. **Test Naming Convention**:
   - Every single `it(...)` or `test(...)` description **MUST** start with `'should ...'`:
     ```tsx
     it('should render standard button element with accessible label', () => { ... });
     it('should call onClick handler when clicked by user', async () => { ... });
     ```

2. **No Test Bloat**:
   - Do NOT test trivial CSS/internal class implementations unless they reflect accessible state (e.g. `aria-disabled`).
   - Do NOT duplicate tests for every minor prop; focus on user-visible behavior and interactive contracts.

3. **Accessibility First (a11y)**:
   - Query by accessible role first: `screen.getByRole('button', { name: /save/i })`.
   - Query by form label: `screen.getByLabelText(/email/i)`.
   - Use `screen.getByTestId(...)` only when no accessible semantic identifier is available.

4. **SonarCloud & Oxlint Guardrails (`docs/ai/quality.md`)**:
   - In mocks for modal dialogs, **NEVER** use `<div role="dialog">`. Always use `<dialog open aria-label={title}>` (Sonar rule `S6819`/`S6847`).
   - **NEVER** call `.sort()` without a comparator; always pass `(a, b) => a.localeCompare(b)` or `(a, b) => a - b` (Sonar rule `S2871`).
   - **NEVER** use `Math.random()` in test data or mocks (Sonar rule `S2245`).
   - Avoid `import { X } from 'y'; export { X };` re-exports in test files; keep imports clean (`oxlint --deny-warnings`).

5. **Path Aliases & Imports**:
   - Use path aliases: `@core/*` for core utilities (e.g., `@core/utils/browser`), `@una` for `@universe/ui` UNA primitives.
   - Matchers (`toBeInTheDocument`, `toBeDisabled`, `toHaveClass`, etc.) are globally registered via `vitest.setup.ts`.

---

## Step-by-Step Test Template

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('should render with default props and accessible role', () => {
    render(<MyComponent label="Click me" />);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('should trigger callback when clicked by user', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<MyComponent label="Submit" onClick={handleClick} />);

    await user.click(screen.getByRole('button', { name: /submit/i }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<MyComponent label="Disabled" disabled />);
    expect(screen.getByRole('button', { name: /disabled/i })).toBeDisabled();
  });
});
```

---

## Validation Commands

```bash
# Run Vitest on the target test file
cmd /c "pnpm test path/to/file.test.tsx"

# Typecheck and lint check
cmd /c "pnpm exec oxlint path/to/file.test.tsx"
cmd /c "pnpm exec prettier --check path/to/file.test.tsx"
```
