# UniDesign System — Usage Guide for AI Agents

> **Target audience:** LLM-based code generators, AI coding assistants, and automated scaffolding tools working within the Karazin UniVerse codebase.

---

## Read Order

When starting work on a new UI task, study the design system files in this exact sequence:

1. **`components.manifest.json`** — Learn what components exist, their import paths, allowed props, and variant values. This is your primary lookup registry.
2. **`tokens.css`** — Understand all available design tokens: colors, spacing, typography, radii, shadows, transitions, and theme overrides (Light, Dark, Cyberpunk).
3. **`components.html`** — See the exact DOM structure, CSS classes, and interactive states of each component rendered as a standalone fixture.
4. **`DESIGN.md`** — Read the full design specification for atmosphere, color intent, typography hierarchy, spacing philosophy, and anti-patterns.
5. **`manifest.json`** — Package metadata (can be skipped for code generation tasks).

---

## Design Highlights

### Spacing: Strict 8-Point Grid

All spacing uses a geometric 8pt scale with 2px and 4px subdivisions. The tokens are `--space-2` through `--space-64`. Semantic aliases exist: `--padding-small` (8px), `--padding-medium` (16px), `--padding-large` (24px).

**Never use arbitrary values** like `margin: 13px` or `padding: 7px`. Always snap to the closest `--space-*` token.

### UI Density

The design system is optimized for **information-dense academic interfaces** — grade tables, course lists, deadline trackers. Compact spacing is preferred. Default button size is `small`, not `medium`.

### Border Radii

- Standard theme: `4px` → `8px` → `12px` → `9999px` (pill)
- Cyberpunk theme overrides ALL radii to `0px` (sharp angular edges)

### Styling Approach

- **SCSS Modules only** — no Tailwind, no CSS-in-JS, no utility classes
- **`clsx`** is used for conditional class composition (NOT `cn()` or `tailwind-merge`)
- All color/spacing/font values reference CSS custom properties from `vars.scss`

### Three Themes

Themes are toggled via `data-theme` on `<html>`:

- `:root` / `[data-theme="light"]` — clean white surfaces, blue accent
- `[data-theme="dark"]` — `#121212` OLED-balanced dark
- `[data-theme="cyberpunk"]` — neon glow, sharp edges, Orbitron / Share Tech Mono fonts

---

## Component Reuse Rules

### 🔴 HARD REQUIREMENT: Always Check the Manifest First

Before writing ANY UI element, search `components.manifest.json` for an existing component that matches. The manifest contains **17 production-grade components** covering:

| Category           | Components                                                                                                    |
| :----------------- | :------------------------------------------------------------------------------------------------------------ |
| Actions            | `Button`                                                                                                      |
| Form Controls      | `TextInput`, `Select`, `CheckBox`, `RadioButton`, `CustomDateTime`, `FileInput`, `SimpleSlider`, `SimpleForm` |
| Overlays           | `Modal`                                                                                                       |
| Feedback & Display | `Tag`, `ProgressBar`, `Empty`, `Skeleton`, `Spinner`, `ToastProvider` / `useToast`                            |
| Data Visualization | `Chart`                                                                                                       |

### Import Convention

All components are imported from `@una`:

```tsx
import { Button, TextInput, Tag, Modal, Chart } from '@una';
```

**Do NOT import from deep paths** like `@una/Button/Button`. Always use the barrel export.

---

## Do

✅ **Use only `@una` primitives** for UI elements that have a counterpart in the manifest.

✅ **Pass only documented props.** Each component's allowed props and variant values are listed in `components.manifest.json`. Check the `variants` and `props` fields.

✅ **Use CSS custom properties** from `tokens.css` for all visual values:

```scss
// ✅ Correct
.card {
  padding: var(--space-16);
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-large);
  color: var(--text-primary);
}
```

✅ **Use SCSS Modules** for custom component styling:

```tsx
import css from './MyComponent.module.scss';
```

✅ **Use `clsx`** for conditional class merging:

```tsx
import clsx from 'clsx';
const classes = clsx(css.card, isActive && css.active, className);
```

✅ **Use `@include narrower-than('md')`** for responsive breakpoints (from `@universe/ui/breakpoints.scss`).

✅ **Use `BREAKPOINTS` from `@universe/core`** for TypeScript-based responsive checks:

```tsx
import { BREAKPOINTS } from '@universe/core';
const isMobile = useMediaQuery(BREAKPOINTS.md, 'less');
```

✅ **Always provide `type="button"`** on `<button>` elements outside forms to prevent accidental form submission.

✅ **Support all three themes.** Semantic tokens (`--bg-surface`, `--text-primary`, `--border-color`) automatically adapt. Avoid raw palette tokens (`--gray-500`) for surfaces/text — use semantic aliases.

---

## Avoid

### 🚫 КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО

1. **Raw HTML when a component exists:**

   ```tsx
   // ❌ FORBIDDEN — Button exists in @una
   <button className="my-btn" onClick={handle}>Save</button>

   // ❌ FORBIDDEN — TextInput exists in @una
   <input type="text" className="my-input" />

   // ❌ FORBIDDEN — Tag exists in @una
   <span className="badge">Status</span>

   // ❌ FORBIDDEN — Modal exists in @una
   <div className="overlay"><div className="dialog">...</div></div>

   // ✅ REQUIRED — Use the component
   <Button variant="primary" onClick={handle}>Save</Button>
   <TextInput placeholder="..." />
   <Tag tone="success">Status</Tag>
   <Modal open={isOpen} onClose={close} title="...">...</Modal>
   ```

2. **Inventing non-existent props:**

   ```tsx
   // ❌ FORBIDDEN — "color" prop doesn't exist on Button
   <Button color="red">Delete</Button>

   // ❌ FORBIDDEN — "rounded" prop doesn't exist
   <Tag rounded>Label</Tag>

   // ✅ CORRECT — Use only documented props
   <Button variant="primary">Delete</Button>
   <Tag tone="danger">Label</Tag>
   ```

3. **Inline styles with hardcoded values:**

   ```tsx
   // ❌ FORBIDDEN
   <div style={{ color: '#333', padding: '12px', backgroundColor: '#f5f5f5' }}>

   // ✅ Use CSS custom properties in SCSS modules
   // .container { color: var(--text-primary); padding: var(--space-12); }
   ```

4. **Hardcoded colors (HEX, RGB, HSL):**

   ```scss
   // ❌ FORBIDDEN
   .title {
     color: #212529;
   }
   .card {
     background: rgb(248, 249, 250);
   }

   // ✅ REQUIRED
   .title {
     color: var(--text-primary);
   }
   .card {
     background: var(--bg-surface);
   }
   ```

5. **Tailwind utility classes:**

   ```tsx
   // ❌ COMPLETELY BANNED from this codebase
   <div className="flex items-center gap-4 p-4 bg-white rounded-lg">

   // ✅ Use SCSS modules
   <div className={css.container}>
   ```

6. **Arbitrary spacing values:**

   ```scss
   // ❌ FORBIDDEN
   .box {
     margin: 13px;
     padding: 7px 11px;
   }

   // ✅ REQUIRED — Use 8pt grid tokens
   .box {
     margin: var(--space-12);
     padding: var(--space-8) var(--space-12);
   }
   ```

7. **Hardcoded media queries:**

   ```scss
   // ❌ FORBIDDEN
   @media (max-width: 768px) { ... }

   // ✅ REQUIRED — Use SCSS mixin
   @include narrower-than('md') { ... }
   ```

8. **Header Navigation on Desktop:**
   ```tsx
   // ❌ FORBIDDEN — Desktop navigation must NOT be in the header
   <header>
     <nav>...</nav>
   </header>

   // ✅ REQUIRED — Navigation MUST use the DashboardSidebar component (left side) for desktop, and MobileBottomNav for mobile.
   // See DESIGN.md for strict layout architecture.
   ```

---

## Token Quick Reference

### Spacing Scale

| Token        | Value | Use Case                           |
| :----------- | :---- | :--------------------------------- |
| `--space-2`  | 2px   | Micro: tag offsets, icon gaps      |
| `--space-4`  | 4px   | Fine: badge padding, label gaps    |
| `--space-8`  | 8px   | Base: button padding, list gaps    |
| `--space-12` | 12px  | Card sub-elements, table cells     |
| `--space-16` | 16px  | Standard: component padding        |
| `--space-24` | 24px  | Section: card padding, column gaps |
| `--space-32` | 32px  | Layout gaps, modal boundaries      |
| `--space-40` | 40px  | Page hero margins                  |
| `--space-48` | 48px  | Desktop grid gutters               |
| `--space-64` | 64px  | Header/nav heights                 |

### Typography

| Token        | Value | Role                          |
| :----------- | :---- | :---------------------------- |
| `--font-xs`  | 12px  | Badges, timestamps, captions  |
| `--font-sm`  | 14px  | Table cells, metadata, labels |
| `--font-md`  | 16px  | Body text, inputs, buttons    |
| `--font-lg`  | 18px  | Card titles, dialog titles    |
| `--font-xl`  | 20px  | Section headings              |
| `--font-xxl` | 24px  | Page headers, KPI counters    |

### Semantic Colors

| Token              | Light        | Dark         |
| :----------------- | :----------- | :----------- |
| `--bg-color`       | `#fff`       | `#121212`    |
| `--bg-surface`     | `--gray-50`  | `--gray-800` |
| `--text-primary`   | `--gray-900` | `--gray-50`  |
| `--text-secondary` | `--gray-600` | `--gray-400` |
| `--border-color`   | `--gray-200` | `--gray-700` |
| `--accent-primary` | `--blue-600` | `--blue-600` |

### Feedback Colors

| Token             | Value                        |
| :---------------- | :--------------------------- |
| `--success-color` | `var(--green-500)` (#22c55e) |
| `--error-color`   | `var(--red-500)` (#ef4444)   |
| `--warning-color` | #f59e0b                      |
| `--info-color`    | `var(--blue-500)` (#3466e7)  |
