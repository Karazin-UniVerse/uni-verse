---
name: unit-test-writing
description: Use when writing new unit tests from scratch or expanding test coverage for React components, custom hooks, and utilities in @universe/ui and @universe/uni-hub using Vitest, React Testing Library (RTL), userEvent, and Happy-DOM. Covers file placement, provider wrappers, hoisted mocks, accessibility (a11y), security assertions, strict TypeScript typing, and SonarCloud/Oxlint compliance.
---

# Unit Test Writing Skill (From Scratch)

## Overview
This skill guides authoring new unit test suites from scratch and expanding test coverage for React components, custom hooks, and utility modules across `@universe/ui` and `@universe/uni-hub` using **Vitest**, **React Testing Library (RTL)**, **@testing-library/user-event**, and **Happy-DOM**.

It supports:
1. **Single File**: Creating a test suite for a specific component (`MyComponent.tsx`) or hook (`useMyHook.ts`).
2. **File List**: Creating or completing test suites for a specified list of files.
3. **Directory Path**: Scanning a folder to identify untested components/hooks and generating their test files.

> **Related Skills**:
> - For migrating legacy `renderToString` / `react-dom/server` tests, use [`rtl-test-migrator`](../rtl-test-migrator/SKILL.md).
> - When generating or updating 5+ test files at once, pair this skill with [`parallel-test-orchestrator`](../parallel-test-orchestrator/SKILL.md) to run up to 5 subagents in parallel.

---

## 1. Monorepo Package Conventions & File Placement

| Package | Target Type | Test File Location | Extension | Run Command |
| :--- | :--- | :--- | :--- | :--- |
| **`@universe/ui`** | Una Primitive / Input | `packages/ui/components/una/<Category>/<Name>/<Name>.test.tsx` | `.test.tsx` | `pnpm --filter @universe/ui test <Name> --run` |
| **`@universe/ui`** | Complex Component | `packages/ui/components/complex/<Name>/<Name>.test.tsx` | `.test.tsx` | `pnpm --filter @universe/ui test <Name> --run` |
| **`@universe/ui`** | UI Custom Hook | `packages/ui/hooks/tests/<useHook>.test.ts` | `.test.ts` | `pnpm --filter @universe/ui test <useHook> --run` |
| **`@universe/uni-hub`** | Component / View / Tab / Modal | Co-located next to source: `<Name>.test.tsx` | `.test.tsx` | `pnpm --filter @universe/uni-hub test <Name> --run` |
| **`@universe/uni-hub`** | Custom Hook / Utility / Service | Co-located next to source: `<Name>.test.ts` | `.test.ts` | `pnpm --filter @universe/uni-hub test <Name> --run` |

### File Extension Rule (`.test.tsx` vs `.test.ts`)
- **`.test.tsx`**: Mandatory whenever the file contains JSX (`<Component />`), including `renderHook` tests whose `wrapper` uses JSX.
- **`.test.ts`**: Use for pure utilities, helpers, services, and `renderHook` tests that either need no wrapper or use `React.createElement(LanguageProvider, null, children)`.

---

## 2. Step-by-Step Workflow for Writing Tests from Scratch

### Step 1: Analyze the Source File First
Before writing any test code, read the target file and its types to identify:
1. **Props & Defaults**: Required vs. optional props, default parameter values, and callback signatures.
2. **Visual & State Branches**: Loading states (`Spinner`, `Skeleton`), empty states (filtered empty vs. celebratory all-done empty), error banners, and null/early-return guards.
3. **Interactive Contracts**: Buttons, form inputs, modals, dropdowns, tabs, and keyboard shortcuts (`Escape`, `Enter`, `Space`, `Ctrl+Shift+F`).
4. **Context & External Dependencies**: Whether the unit consumes `useLanguage`, `useFeatures`, `useTheme`, `useToast`, `next/navigation`, or API service clients.

### Step 2: Configure Context Wrappers
- **`@universe/ui` components** are language-agnostic and receive labels via props—render them directly (wrap in `<ToastProvider>` only when testing toast triggers).
- **`@universe/uni-hub` components and hooks** must be wrapped in the providers they consume:
  - `useLanguage()` ➡️ `<LanguageProvider>` from `@uni-hub/i18n/LanguageContext`. Set `localStorage.setItem('universe-lang', 'uk')` in `beforeEach` for deterministic localized text assertions.
  - `useFeatures()` ➡️ `<FeatureToggleProvider>` from `@uni-hub/features`.
  - `useTheme()` ➡️ `<ThemeProvider>` from `@uni-hub/theme/ThemeContext`.

### Step 3: Set Up Clean, Hoisted Mocks
- Always use `vi.hoisted(() => ({ ... }))` for mock functions referenced inside `vi.mock(...)` factories.
- **Modal Mocking Rule (SonarCloud `S6819` / `S6847`)**: When mocking `Modal` from `@una` in parent view/tab tests, **NEVER** render `<div role="dialog">`. Always use a native `<dialog>` element:
  ```tsx
  Modal: ({ open, title, children, footer, onClose }: {
    open: boolean;
    title?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    onClose?: () => void;
  }) =>
    open ? (
      <dialog open aria-label={title}>
        <div>{children}</div>
        {footer && <div>{footer}</div>}
        <button type="button" onClick={onClose}>
          Close
        </button>
      </dialog>
    ) : null,
  ```

### Step 4: Design High-Value, Zero-Bloat Test Cases
Every test description **MUST** start with `'should ...'`. Cover these core dimensions without redundant bloat:

1. **Default & Conditional Rendering**:
   - Renders primary content, headings, and badges accurately.
   - Handles empty arrays, `null`/`undefined` optional fields, and loading states cleanly.
2. **User Interactions (`userEvent`)**:
   - Initialize `const user = userEvent.setup()` before rendering or interacting.
   - Verify click handlers, text input typing (`user.type`), option selection (`user.selectOptions` / dropdown clicks), and form submission.
3. **Accessibility (a11y)**:
   - **Query Priority**:
     1. `screen.getByRole('button', { name: /.../i })`
     2. `screen.getByLabelText(/.../i)`
     3. `screen.getByPlaceholderText(/.../i)`
     4. `screen.getByText(/.../i)`
     5. `screen.getByTestId(...)` *(last resort when no semantic role or label exists)*
   - Assert semantic ARIA attributes (`aria-expanded`, `aria-invalid`, `aria-disabled`, `aria-current`, `aria-live`, `aria-modal`, `aria-label`).
   - Test keyboard interactions (`await user.keyboard('{Escape}')`, `'{Enter}'`, `' '`, `'{Tab}'`).
4. **Security & Edge Cases**:
   - External links opening in a new tab (`target="_blank"`) **MUST** be asserted to have `rel="noopener noreferrer"`.
   - Untrusted user strings (e.g., `<script>alert("xss")</script>` in titles, descriptions, or comments) **MUST** render safely as escaped text without injecting executable DOM nodes.
5. **Async Flows & Error Handling**:
   - Test both successful API resolution and rejected promises (`mockRejectedValueOnce(new Error('...'))`), verifying error toast feedback and state recovery (`submitting`/`loading` reset to `false`).

---

## 3. Canonical Test Templates

### Template A: React Component Test (`.test.tsx`)

```tsx
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguageProvider } from '@uni-hub/i18n/LanguageContext';
import { ExampleCard, type ExampleCardProps } from './ExampleCard';

const defaultProps: ExampleCardProps = {
  title: 'Algorithms & Data Structures',
  externalUrl: 'https://moodle.karazin.ua/course/view.php?id=42',
  disabled: false,
  onAction: vi.fn(),
};

const renderExampleCard = (overrides: Partial<ExampleCardProps> = {}) => {
  const props = { ...defaultProps, ...overrides };

  return render(
    <LanguageProvider>
      <ExampleCard {...props} />
    </LanguageProvider>,
  );
};

describe('ExampleCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('universe-lang', 'uk');
  });

  it('should render title and external link with safe rel attributes', () => {
    renderExampleCard();

    expect(screen.getByRole('heading', { name: 'Algorithms & Data Structures' })).toBeInTheDocument();

    const link = screen.getByRole('link');

    expect(link).toHaveAttribute('href', defaultProps.externalUrl);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(link).toHaveAttribute('rel', expect.stringContaining('noreferrer'));
  });

  it('should call onAction when action button is clicked', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();

    renderExampleCard({ onAction });

    await user.click(screen.getByRole('button'));

    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('should disable action button when disabled prop is true', () => {
    renderExampleCard({ disabled: true });

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('should safely escape untrusted HTML strings in title without XSS execution', () => {
    const maliciousTitle = '<img src=x onerror=alert(1) /><script>alert("xss")</script>';

    const { container } = renderExampleCard({ title: maliciousTitle });

    expect(screen.getByText(maliciousTitle)).toBeInTheDocument();
    expect(container.querySelector('script')).toBeNull();
  });
});
```

### Template B: Custom Hook Test (`.test.ts`)

```ts
import React from 'react';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { LanguageProvider } from '@uni-hub/i18n/LanguageContext';
import type { OpportunityApplication } from '@uni-hub/types';
import { useExampleHook } from './useExampleHook';

const { mockToast, mockApi } = vi.hoisted(() => ({
  mockToast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
  mockApi: {
    submitItem: vi.fn(),
  },
}));

vi.mock('@una', () => ({
  useToast: () => mockToast,
}));

vi.mock('@uni-hub/services/api.opportunities', () => ({
  opportunitiesApi: mockApi,
}));

describe('useExampleHook', () => {
  let mockSetItems: Mock & React.Dispatch<React.SetStateAction<OpportunityApplication[]>>;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('universe-lang', 'uk');
    mockSetItems = vi.fn() as unknown as Mock &
      React.Dispatch<React.SetStateAction<OpportunityApplication[]>>;
  });

  const renderTargetHook = () =>
    renderHook(() => useExampleHook({ setItems: mockSetItems }), {
      wrapper: ({ children }) => React.createElement(LanguageProvider, null, children),
    });

  it('should initialize with default state', () => {
    const { result } = renderTargetHook();

    expect(result.current.submitting).toBe(false);
  });

  it('should submit item and show success toast on success', async () => {
    mockApi.submitItem.mockResolvedValueOnce({ data: { id: 'app-1' } });
    const { result } = renderTargetHook();

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockApi.submitItem).toHaveBeenCalledTimes(1);
    expect(mockToast.success).toHaveBeenCalledTimes(1);
    expect(result.current.submitting).toBe(false);
  });

  it('should show error toast and reset submitting flag when API fails', async () => {
    mockApi.submitItem.mockRejectedValueOnce(new Error('Network error'));
    const { result } = renderTargetHook();

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockToast.error).toHaveBeenCalledTimes(1);
    expect(result.current.submitting).toBe(false);
  });
});
```

---

## 4. Strict TypeScript, Oxlint & SonarCloud Guardrails

| Rule / Check | Common Pitfall in Tests | Mandatory Fix |
| :--- | :--- | :--- |
| **Test Naming** | `it('renders button', ...)` | Every `it(...)` description **MUST** start with `'should ...'`. |
| **Oxlint `universe/vertical-spacing`** | Missing blank line after `const`/`let` block or before `return` | Leave an empty line after variable declarations, before `return`, and between logic blocks (or run `pnpm exec oxlint --fix <file>`). |
| **SonarCloud `S6819` / `S6847`** | `<div role="dialog">` in Modal mocks | Always use `<dialog open aria-label={title}>`. |
| **SonarCloud `S2245`** | `Math.random()` in test data | Never use `Math.random()`. Use deterministic values (`id: 'opp-1'`). |
| **SonarCloud `S2871`** | `array.sort()` without comparator | Always pass a comparator: `.sort((a, b) => a.localeCompare(b))`. |
| **TypeScript `TS2345` / `TS2339` on State Setters** | Passing `vi.fn()` to `React.Dispatch<React.SetStateAction<T>>` prop and reading `.mock.calls` | Type as `Mock & React.Dispatch<React.SetStateAction<T>>` (importing `type Mock` from `'vitest'`). |
| **TypeScript `TS2345` on SVG Elements** | `expect(wrapper).toContainElement(container.querySelector('svg'))` | `querySelector('svg')` returns `Element \| null`. Cast to `HTMLElement`: `toContainElement(icon as HTMLElement)`. |
| **Strict Domain Unions** | Using invalid literal strings like `status: 'SUBMITTED'` on `Opportunity` | Import and annotate fixtures with the real type (`Opportunity`, `Assignment`, `Grade`, `Course`) so `tsc --noEmit` catches invalid enum literals immediately. |

---

## 5. Verification Checklist

Run these commands after creating or updating any unit test file:

```bash
# 1. Execute the new unit test file
cmd /c "pnpm --filter @universe/uni-hub test <TestFileName> --run"
# (or @universe/ui for UI package tests)

# 2. Verify Oxlint (0 warnings, 0 errors)
cmd /c "pnpm exec oxlint path/to/file.test.tsx"

# 3. Verify TypeScript compilation across the package
cmd /c "pnpm --filter @universe/uni-hub typecheck"

# 4. Format with Prettier
cmd /c "pnpm exec prettier --write path/to/file.test.tsx"
```
