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
- **`.test.ts`**: Use for pure utilities, helpers, services, and `renderHook` tests that either need no wrapper or use functional wrappers like `createLanguageWrapper()`.

---

## 2. Step-by-Step Workflow for Writing Tests from Scratch

### Step 1: Analyze the Source File First
Before writing any test code, read the target file and its types to identify:
1. **Props & Defaults**: Required vs. optional props, default parameter values, and callback signatures.
2. **Visual & State Branches**: Loading states (`Spinner`, `Skeleton`), empty states (filtered empty vs. celebratory all-done empty), error banners, and null/early-return guards.
3. **Interactive Contracts**: Buttons, form inputs, modals, dropdowns, tabs, and keyboard shortcuts (`Escape`, `Enter`, `Space`, `Ctrl+Shift+F`).
4. **Context & External Dependencies**: Whether the unit consumes `useLanguage`, `useFeatures`, `useTheme`, `useToast`, `next/navigation`, or API service clients.

### Step 2: Configure Context Wrappers & Feature Flags via `@uni-hub/utils/test-utils`
- **`@universe/ui` components** are language-agnostic design system primitives and receive labels via props—render them directly (wrap in `<ToastProvider>` only when testing toast triggers).
- **`@universe/uni-hub` components and hooks** must be wrapped using the canonical test helpers from `@uni-hub/utils/test-utils`:

| Helper in `@uni-hub/utils/test-utils` | When to Use | Example |
| :--- | :--- | :--- |
| `withLanguage(ui)` | Component consumes `useLanguage()` (`formatMessage`, `language`, `setLanguage`) | `render(withLanguage(<RecentGradesFeed {...props} />))` |
| `withTheme(ui)` | Component consumes `useTheme()` (`theme`, `toggleTheme`) | `render(withTheme(<ThemeAwareWidget />))` |
| `withToast(ui)` | Component triggers toasts via `useToast()` | `render(withToast(<DeanContactModal {...props} />))` |
| `withFeatureToggles(ui, flags?)` | Component reads `useFeatures()` or `useFeatureControls()` | `render(withFeatureToggles(withLanguage(<QuickActions {...props} />)))` |
| `withQueryClient(ui, client?)` | Component consumes TanStack Query (`useQuery`, `useMutation`) | `render(withQueryClient(<MyDataView />, queryClient))` |
| `withAppProviders(ui, client?)` | Full page/tab needing `QueryClient + Toast + Theme + Language + Features` | `render(withAppProviders(<AssignmentsTab />))` |
| `createLanguageWrapper()` | Hook test needing `LanguageProvider` | `renderHook(() => useMyHook(), { wrapper: createLanguageWrapper() })` |
| `createQueryClientWrapper(client?)` | Hook test needing `QueryClientProvider` | `renderHook(() => useMyQuery(), { wrapper: createQueryClientWrapper() })` |
| `createAppProvidersWrapper(client?)` | Hook or page test needing all application providers | `renderHook(() => useComplexHook(), { wrapper: createAppProvidersWrapper() })` |
| `setTestFeatureFlags(flags)` | Enabling/disabling typed feature toggles in tests | `setTestFeatureFlags({ isMoodleIntegrationEnabled: true })` |
| `resetTestFeatureFlags()` | Resetting flags to defaults (called automatically in `vitest.setup.ts` afterEach) | `resetTestFeatureFlags()` |
| `ALL_FEATURES_ENABLED` | Readonly object with all features enabled | `setTestFeatureFlags(ALL_FEATURES_ENABLED)` |

> [!IMPORTANT]
> **Strict Rule**: **NEVER** manually hand-nest `<LanguageProvider>`, `<FeatureToggleProvider>`, `<ThemeProvider>`, or `<ToastProvider>` JSX inside individual test suites, and **NEVER** manually mutate `process.env.NEXT_PUBLIC_FEATURE_*`. Always use `withLanguage`, `withFeatureToggles`, or `withAppProviders` and `setTestFeatureFlags(...)`.

### Step 3: Set Up Clean Mocks — Avoid Redundant Mock Complexity
Mocks must be surgical and minimal. **Redundant mock complexity is strictly forbidden** because:
1. **Test Dishonesty (False Positives)**: Mocking internal UI primitives (`@una`, `@ui`), child modals (`DeanContactModal`), or auth buttons (`GoogleLoginButton`) allows unit tests to pass even when real prop contracts, imports, rendering, or accessibility attributes are broken.
2. **Broken Isolation & State Leaks**: Module-level mutable state captured inside `vi.mock` closures (e.g. `let capturedOnError = ...`, `let mockStorage = ...`) leaks state across tests and causes order-dependent failures.
3. **High Maintenance & Poor Readability**: 30-line `vi.mock(..., async (importActual) => { ... })` blocks bloat test files and obscure the actual component contract under test.

#### What to ALWAYS Use Real vs. What to Mock
- **ALWAYS USE REAL**:
  - Design-system primitives from `@una` (`Button`, `Modal`, `Select`, `Tag`, `Chart`, `ToastProvider`).
  - Child components and modals (`DeanContactModal`, `GoogleLoginButton`).
  - Context providers via `@uni-hub/utils/test-utils` HOCs.
  - Browser storage (`window.localStorage` and `sessionStorage` are fully supported natively by Happy-DOM).
- **ONLY MOCK TRUE EXTERNAL BOUNDARIES**:
  - Network and API client modules (`@uni-hub/services/api`, `opportunitiesApi`, `authApi`).
  - Next.js framework boundaries (`next/navigation`, `next/script`).
  - External browser SDKs not provided by Happy-DOM (e.g., `window.google.accounts.id`, Web Audio API sound effects, `canvas-confetti`).

When a mock factory references a variable, always use `vi.hoisted(() => ({ ... }))`.

### Step 4: Parameterized Tests with `it.each` vs. Loops

When testing 2+ variants, tones, status badges, boundary scores, or input mappings that share the same Act/Assert structure, **ALWAYS use `it.each`**.

#### Anti-Patterns (Forbidden)
- ❌ **Manual `for...of + unmount()` loops**: Running loops inside a single `it(...)` block and calling `unmount()` hides test failures, stops on the first failing case, and prevents isolated reporting.
- ❌ **Manual `for (const size of sizes) { rerender(...) }` loops**: Mutating rendered state across multiple loop iterations inside one test.
- ❌ **Copy-pasted tests**: Duplicating 3–5 identical 10-line test blocks where only an input number or status string changes.

#### Legitimate Exception
- ✅ A `for...of` loop inside a single `it(...)` test is ONLY acceptable when asserting that a **single** `render()` output contains all items from a fixture array (e.g., asserting that `<Select options={defaultOptions} />` rendered all 3 `<option>` elements in the DOM).

#### Bad vs. Good Example

❌ **Bad: Manual loop with unmount inside single test**
```tsx
it('should render correct tone classes', () => {
  const cases = [
    { tone: 'success', expectedClass: '_success_abc' },
    { tone: 'danger', expectedClass: '_danger_abc' },
  ];
  for (const { tone, expectedClass } of cases) {
    const { unmount } = render(withLanguage(<StatusBanner tone={tone} />));
    expect(screen.getByRole('status')).toHaveClass(expectedClass);
    unmount();
  }
});
```

✅ **Good: Parameterized with `it.each`**
```tsx
it.each<{ tone: StatusBannerTone; expectedClass: string }>([
  { tone: 'success', expectedClass: '_success_abc' },
  { tone: 'danger', expectedClass: '_danger_abc' },
])('should render $tone tone with $expectedClass class', ({ tone, expectedClass }) => {
  render(withLanguage(<StatusBanner tone={tone} />));
  expect(screen.getByRole('status')).toHaveClass(expectedClass);
});
```

### Step 5: Design High-Value, Zero-Bloat Test Cases
Every test description **MUST** start with `'should ...'`. Cover these core dimensions without redundant bloat:

1. **Default & Conditional Rendering**:
   - Renders primary content, headings, and badges accurately.
   - Handles empty arrays, `null`/`undefined` optional fields, and loading states cleanly.
2. **User Interactions (`userEvent`)**:
   - Initialize `const user = userEvent.setup()` before rendering or interacting.
   - Verify click handlers, text input typing (`await user.type`), option selection, and form submission.
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
import { withLanguage } from '@uni-hub/utils/test-utils';
import { ExampleCard, type ExampleCardProps } from './ExampleCard';

const defaultProps: ExampleCardProps = {
  title: 'Algorithms & Data Structures',
  externalUrl: 'https://moodle.universemvp.tech/course/view.php?id=42',
  status: 'active',
  disabled: false,
  onAction: vi.fn(),
};

const renderExampleCard = (overrides: Partial<ExampleCardProps> = {}) => {
  const props = { ...defaultProps, ...overrides };

  return render(withLanguage(<ExampleCard {...props} />));
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

  it.each([
    { status: 'active' as const, expectedLabel: 'Активний' },
    { status: 'completed' as const, expectedLabel: 'Завершено' },
    { status: 'archived' as const, expectedLabel: 'В архіві' },
  ])('should render $status status badge with $expectedLabel label', ({ status, expectedLabel }) => {
    renderExampleCard({ status });

    expect(screen.getByText(expectedLabel)).toBeInTheDocument();
  });

  it('should call onAction when action button is clicked', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();

    renderExampleCard({ onAction });

    await user.click(screen.getByRole('button', { name: /виконати/i }));

    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('should disable action button when disabled prop is true', () => {
    renderExampleCard({ disabled: true });

    expect(screen.getByRole('button', { name: /виконати/i })).toBeDisabled();
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
import { createLanguageWrapper } from '@uni-hub/utils/test-utils';
import type { OpportunityApplication } from '@core/types/opportunities';
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
      wrapper: createLanguageWrapper(),
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
pnpm --filter @universe/uni-hub test <TestFileName> --run
# (or @universe/ui for UI package tests)

# 2. Verify Oxlint (0 warnings, 0 errors)
pnpm exec oxlint path/to/file.test.tsx

# 3. Verify TypeScript compilation across the package
pnpm --filter <pkg> typecheck

# 4. Format with Prettier
pnpm exec prettier --write path/to/file.test.tsx
```
