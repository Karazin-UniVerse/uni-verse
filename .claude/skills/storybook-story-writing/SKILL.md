---
name: storybook-story-writing
description: Use when creating, modifying, or reviewing Storybook stories for UI components in the UniVerse monorepo. Enforces Component Story Format 3 (CSF3), strictly restricts stories to packages/ui, and separates Una design system components (Una/*) from complex composite components (Complex/*).
---

# Storybook - Story Writing

This skill guides creating, maintaining, and reviewing Storybook stories in the **Karazin UniVerse** monorepo. It establishes strict package boundaries, Component Story Format 3 (CSF3) patterns, and clear sidebar categorization.

---

## 1. Monorepo Boundary & Scope Restrictions

### Strict Package Boundary
- **STORYBOOK STORIES BELONG EXCLUSIVELY IN `packages/ui` (`@universe/ui`)**.
- **PROHIBITED**: Never create `.stories.tsx` or `.stories.ts` files inside application packages such as `packages/uni-hub` or `packages/backend`.
- All shared and visual components that require documentation or visual isolation must be placed in `packages/ui/components/`.

### Story File Co-location
- Every story file must be co-located with its component:
  - Una design system components: `packages/ui/components/una/<Category>/<ComponentName>/<ComponentName>.stories.tsx`
  - Complex components: `packages/ui/components/complex/<ComponentName>/<ComponentName>.stories.tsx` (or adjacent to `<component>.tsx`)

---

## 2. Storybook Hierarchy & Section Separation

The Storybook sidebar is divided into two distinct primary sections:

| Section Hierarchy | Target Path | Purpose | Example Title |
| :--- | :--- | :--- | :--- |
| **`Una/*`** | `packages/ui/components/una/` | Una design system primitives, inputs, and base elements | `title: 'Una/Buttons/Button'`<br>`title: 'Una/Inputs/TextInput'` |
| **`Complex/*`** | `packages/ui/components/complex/` | Multi-part composite, UI-only components (composed of Una primitives without business logic) | `title: 'Complex/ExampleComponent'` |

The sidebar ordering is configured in `packages/ui/.storybook/preview.tsx` via `storySort.order: ['Una', 'Complex']`.

---

## 3. Component Story Format 3 (CSF3) Standard

All stories must follow the CSF3 object syntax with strict TypeScript typing.

### Standard Template

```tsx
import type { Meta, StoryObj } from '@storybook/react';

import { ComponentName } from './ComponentName';

const meta = {
  title: 'Una/Category/ComponentName', // or 'Complex/ComponentName'
  component: ComponentName,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['primary', 'secondary'],
      description: 'Visual variant of the component',
    },
    disabled: {
      control: { type: 'boolean' },
      description: 'Disables interaction when true',
    },
  },
} satisfies Meta<typeof ComponentName>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    variant: 'primary',
  },
};

export const Disabled: Story = {
  args: {
    variant: 'primary',
    disabled: true,
  },
};
```

---

## 4. Best Practices & Quality Standards

### 1. Strict TypeScript (Zero `any`)
- Never use `any` or untyped parameters in story render functions or custom templates:
  ```tsx
  // ❌ FORBIDDEN: Untyped args
  const Template = (args: any) => <Component {...args} />;

  // ✅ CORRECT: Strict component props typing
  const Template = (args: React.ComponentProps<typeof Component>) => (
    <div style={{ maxWidth: '400px' }}>
      <Component {...args} />
    </div>
  );
  ```

### 2. Comprehensive Variation Coverage
Showcase all meaningful states:
- **Default**: Canonical resting state.
- **Variants**: Every supported visual option (`primary`, `secondary`, `danger`, etc.).
- **Sizes**: Every supported size (`small`, `medium`, `large`).
- **States**: `loading`, `disabled`, `error`, `empty`, `active`.
- **Edge Cases**: Long text content, minimal content, extreme dimensions.

### 3. Theme Toolbar Support
- The repository provides a theme toolbar in `.storybook/preview.tsx` supporting `light`, `dark`, and `cyberpunk` themes via the `data-theme` attribute on the root document.
- Components and stories must rely on Una SCSS design tokens (`@universe/ui/vars.scss`) so they react smoothly to theme changes.

### 4. Interactive Components & Controlled State
- When a component requires controlled state (e.g. `TextInput`, `DateTimePicker`, `FileInput`), encapsulate state inside an interactive helper function typed with `React.ComponentProps<typeof Component>` rather than relying on global stores.

---

## 5. Anti-Patterns to Avoid

| Anti-Pattern | Reason | Correct Approach |
| :--- | :--- | :--- |
| **Stories in `uni-hub` or `backend`** | Breaks architectural package boundaries | Write stories strictly in `packages/ui` |
| **Una component with `title: 'Complex/...'`** | Confuses design system navigation | Place under `Una/*` |
| **Complex component with `title: 'Una/...'`** | Pollutes core design system primitives | Place under `Complex/*` |
| **CSF2 `Template.bind({})`** | Deprecated legacy Storybook format | Use CSF3 object syntax `export const Story: StoryObj = { args: { ... } }` |
| **`args: any` in templates** | Violates monorepo strict typing standard | Use `React.ComponentProps<typeof Component>` |
| **Hardcoding inline styles instead of tokens** | Breaks dark/cyberpunk theme rendering | Use Una CSS custom properties (`var(--...)`) |

---

## 6. Verification Checklist

Before opening a PR with Storybook changes, execute:

```bash
# 1. Typecheck the UI package
pnpm --filter @universe/ui typecheck

# 2. Lint the UI package
pnpm --filter @universe/ui lint

# 3. Build Storybook static assets
pnpm --filter @universe/ui build-storybook
```
