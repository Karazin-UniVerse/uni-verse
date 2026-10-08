# 🎨 UniDesign System — Comprehensive Specification (`design.md`)

> **Note**: This file is mirrored at [`docs/design.md`](file:///Users/levkovskyivladimir/Dev/UNiVerse/uni-verse/docs/design.md).

Welcome to the comprehensive specification for **UniDesign**, the unified design system powering the **Karazin UniVerse** ecosystem.

This document serves as the single source of truth for designers, frontend engineers, and AI coding assistants. It details tokens, color systems, typography, elevation, motion, responsive layout, theming, component guidelines, and accessibility standards.

---

## 1. Design Philosophy & Architectural Principles

UniDesign is built specifically for academic platforms, student portals, and LMS interfaces. It balances clarity, information density, and aesthetic delight.

### Core Tenets

1. **Information Hierarchy & Cognitive Clarity**:
   Academic workflows involve complex tables, grading scales, and strict deadlines. UI elements prioritize legibility, scannable data visualization, and immediate status recognition over superfluous decorative clutter.
2. **Strict Design Token Adherence**:
   No hardcoded pixel dimensions, raw hex colors, or custom inline shadows are permitted. All styling references CSS custom properties and SCSS mixin tokens defined in `@universe/ui/vars.scss`.
3. **Pure SCSS Modules (Tailwind-Free)**:
   All packages strictly use scoped SCSS modules and `@una` primitives. Utility CSS frameworks (such as Tailwind) are completely banned from the repository.
4. **Multi-Theme Dynamism**:
   Themes are applied at runtime using the `data-theme` attribute on the root document element. The system seamlessly supports **Light**, **Dark**, and an energetic high-contrast **Cyberpunk** theme.
5. **Uncompromising Accessibility (WCAG 2.1 AA)**:
   Every interactive element is fully operable via keyboard, announces state changes through appropriate ARIA roles, maintains compliant color contrast ratios, and preserves focus states across modal stacks.
6. **Zero Mobile Horizontal Overflow**:
   Mobile interfaces must never introduce horizontal scroll or viewport sway. Long text strings wrap safely, grids collapse to single columns on small viewports, and interactive containers handle overflow cleanly.

---

## 2. Design Tokens Specification

All design tokens are defined in [`packages/ui/vars.scss`](file:///Users/levkovskyivladimir/Dev/UNiVerse/uni-verse/packages/ui/vars.scss) and [`packages/ui/breakpoints.scss`](file:///Users/levkovskyivladimir/Dev/UNiVerse/uni-verse/packages/ui/breakpoints.scss).

### 2.1 The 8-Point Spacing Grid

Spacing across margins, paddings, gaps, and structural containers follows a strict 8-point geometric scale (with 4px and 2px subdivisions for compact UI elements):

| Token Variable | SCSS Variable | Value  | Intended Usage                                                                |
| :------------- | :------------ | :----- | :---------------------------------------------------------------------------- |
| `--space-2`    | `$space-2`    | `2px`  | Micro-spacings: tag inner offsets, compact icon gaps                          |
| `--space-4`    | `$space-4`    | `4px`  | Fine adjustments: badge padding, input borders, label-to-helper gaps          |
| `--space-8`    | `$space-8`    | `8px`  | Base compact step: button horizontal padding, list item gaps, small chips     |
| `--space-12`   | `$space-12`   | `12px` | Intermediate spacing: card sub-elements, table cell vertical padding          |
| `--space-16`   | `$space-16`   | `16px` | Standard spacing: component padding, card gaps, mobile layout margins         |
| `--space-24`   | `$space-24`   | `24px` | Section spacing: desktop card padding, panel header margins, column gaps      |
| `--space-32`   | `$space-32`   | `32px` | Structural layout gaps: major card stacks, modal boundaries, section dividers |
| `--space-40`   | `$space-40`   | `40px` | Page hero margins, dashboard section spacing                                  |
| `--space-48`   | `$space-48`   | `48px` | Desktop grid gutters, hero headers                                            |
| `--space-64`   | `$space-64`   | `64px` | Layout heights (e.g. desktop header, mobile bottom navigation bar)            |

#### Spacing Aliases

```scss
--padding-small: var(--space-8);
--padding-medium: var(--space-16);
--padding-large: var(--space-24);

--margin-small: var(--space-8);
--margin-medium: var(--space-16);
--margin-large: var(--space-24);

--gap-small: var(--space-8);
--gap-medium: var(--space-16);
--gap-large: var(--space-24);
```

> [!IMPORTANT]
> **Strict Rule:** Arbitrary spacing values (e.g. `margin: 13px;` or `padding: 7px;`) are forbidden. Always use the closest standardized `--space-*` token.

---

### 2.2 Typography System

The typography scale delivers balanced readability across devices with crisp vertical rhythm:

```
Display / Headings:  --font-xxl (24px)  / Bold (700)
Section Headings:    --font-xl  (20px)  / SemiBold (600) / Bold (700)
Sub-headings:        --font-lg  (18px)  / Medium (500) / SemiBold (600)
Body / Controls:     --font-md  (16px)  / Regular (400) / Medium (500)
Secondary / Tables:  --font-sm  (14px)  / Regular (400) / Medium (500)
Captions / Badges:   --font-xs  (12px)  / Regular (400) / Medium (500)
```

#### Typography Tokens Reference

| Token        | Value  | Default Line Height | Primary Role                                              |
| :----------- | :----- | :------------------ | :-------------------------------------------------------- |
| `--font-xs`  | `12px` | `1.4` (`16.8px`)    | Badges, tags, timestamps, helper text, footnote captions  |
| `--font-sm`  | `14px` | `1.4` (`19.6px`)    | Table cells, secondary navigation, input labels, metadata |
| `--font-md`  | `16px` | `1.5` (`24px`)      | Primary body text, form input content, buttons            |
| `--font-lg`  | `18px` | `1.4` (`25.2px`)    | Card titles, dialog titles, prominent list headers        |
| `--font-xl`  | `20px` | `1.3` (`26px`)      | Section titles, hero greetings                            |
| `--font-xxl` | `24px` | `1.2` (`28.8px`)    | Page primary headers, KPI counter numbers                 |

#### Font Family Stacks

- **Default / Base**: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`
- **Cyberpunk Headings**: `'Orbitron', sans-serif`
- **Cyberpunk Mono / Data**: `'Share Tech Mono', monospace`

#### Font Weights

- `--font-weight-regular`: `400`
- `--font-weight-medium`: `500`
- `--font-weight-bold`: `700`

---

### 2.3 Color Architecture & Semantic Palettes

Colors in UniDesign are structured in three distinct layers:

1. **Raw Primitive Palettes**: Pure color stops (50–900).
2. **Semantic Contextual Tokens**: Abstractions representing intent (`--bg-surface`, `--text-primary`, `--border-color`).
3. **Theme Overrides**: Dynamic values assigned per theme selector (`:root`, `[data-theme='dark']`, `[data-theme='cyberpunk']`).

#### Raw Primitive Scales

```text
Neutral Grayscale:  --gray-50 (#f8f9fa) ... --gray-900 (#212529)
Karazin Blue:       --blue-50 (#edf1fe) ... --blue-600 (#164bd7) ... --blue-900 (#0f2860)
Academic Green:     --green-50 (#f0fdf4) ... --green-500 (#22c55e) ... --green-900 (#14532d)
Alert Red:          --red-50 (#fef2f2) ... --red-500 (#ef4444) ... --red-900 (#7f1d1d)
Academic Purple:    --purple-50 (#faf5ff) ... --purple-500 (#a855f7) ... --purple-900 (#581c87)
```

#### Academic Grading Colors (Karazin 100-Point Scale)

Grading visualizations link directly to university academic performance boundaries:

| Status                        | 100-Point Range | ECTS Grade | National Scale | Color Variable                | Light / Dark Hex      |
| :---------------------------- | :-------------- | :--------- | :------------- | :---------------------------- | :-------------------- |
| **Відмінно (Excellent)**      | `90 – 100`      | `A`        | Відмінно       | `--green-500` / `--green-400` | `#22c55e` / `#4ade80` |
| **Добре (Good)**              | `70 – 89`       | `B`, `C`   | Добре          | `--blue-500` / `--blue-400`   | `#3466e7` / `#7794f6` |
| **Задовільно (Satisfactory)** | `50 – 69`       | `D`, `E`   | Задовільно     | `--warning-color`             | `#f59e0b` / `#fbbf24` |
| **Незадовільно (Fail)**       | `0 – 49`        | `Fx`, `F`  | Незадовільно   | `--error-color`               | `#ef4444` / `#f87171` |

---

### 2.4 Border Radii & Stroke

Corner radii reinforce component hierarchy and shape recognition:

| Token                    | Value           | Applied To                                          | Cyberpunk Value |
| :----------------------- | :-------------- | :-------------------------------------------------- | :-------------- |
| `--border-radius-small`  | `4px`           | Tooltips, compact tags, progress bars, chart bars   | `0px` (Sharp)   |
| `--border-radius-medium` | `8px`           | Buttons, text inputs, dropdown menus, toast alerts  | `0px` (Sharp)   |
| `--border-radius-large`  | `12px` / `16px` | Content cards, dialog modals, schedule grid cells   | `0px` (Sharp)   |
| `--border-radius-full`   | `9999px`        | Avatars, streak badges, pill indicators, bottom nav | `0px` (Sharp)   |

---

### 2.5 Shadows, Elevations & Z-Index

#### Elevation Levels

- **Level 1 (Subtle / Cards)**: `--box-shadow-small: 0 1px 2px 0 rgb(0 0 0 / 5%);`
- **Level 2 (Hover / Dropdowns)**: `--box-shadow-medium: 0 4px 6px -1px rgb(0 0 0 / 10%), 0 2px 4px -1px rgb(0 0 0 / 6%);`
- **Level 3 (Modals / Overlays)**: `--box-shadow-large: 0 10px 15px -3px rgb(0 0 0 / 10%), 0 4px 6px -2px rgb(0 0 0 / 5%);`

#### Z-Index Stacking Hierarchy

To eliminate "z-index wars" and prevent overlapping clipping bugs:

```scss
$z-base: 1; // Base inline interactive elements
$z-dropdown: 20; // Notification dropdowns, user profile popover
$z-sticky-header: 50; // Sticky page header
$z-bottom-nav: 1000; // Mobile bottom glassmorphic navigation bar
$z-modal-backdrop: 1100; // Modal dark blur overlay
$z-modal-dialog: 1200; // Active top-level modal dialog
$z-toast: 1500; // Toast notifications and alert banners
$z-tooltip: 2000; // Floating action tooltips
```

---

### 2.6 Motion, Durations & Easing

All transitions and animations share standardized cubic-bezier curves for unified physical feel:

- **Timing Function**: `--ease-standard: cubic-bezier(0.4, 0, 0.2, 1);`
- **Fast (`150ms`)**: Micro-interactions (button hover, tag hover, checkbox check).
- **Medium (`250ms`)**: Component state changes (accordion expand, drawer open, dropdown fade).
- **Slow (`400ms`)**: Page-level transitions, theme color shifts, full modal fades.

---

## 3. Theming System

The application toggles themes dynamically via `data-theme` on the `<html>` tag:

```html
<html lang="uk" data-theme="light">
  <html lang="uk" data-theme="dark">
    <html lang="uk" data-theme="cyberpunk"></html>
  </html>
</html>
```

### 3.1 Theme Comparison Matrix

| Property                      | Light Theme (`:root`)    | Dark Theme (`[data-theme='dark']`) | Cyberpunk (`[data-theme='cyberpunk']`) |
| :---------------------------- | :----------------------- | :--------------------------------- | :------------------------------------- |
| **Page Background**           | `#ffffff`                | `#121212` (OLED balanced)          | `#0b0b0e` (Deep Void)                  |
| **Card / Surface Background** | `#f8f9fa` (`--gray-50`)  | `#343a40` (`--gray-800`)           | `#121217` (High Contrast Dark)         |
| **Primary Text**              | `#212529` (`--gray-900`) | `#f8f9fa` (`--gray-50`)            | `#fcee0a` (Neon Acid Yellow)           |
| **Secondary Text**            | `#868e96` (`--gray-600`) | `#ced4da` (`--gray-400`)           | `#00f0ff` (Neon Cyan)                  |
| **Accent Primary**            | `#164bd7` (`--blue-600`) | `#164bd7` (`--blue-600`)           | `#fcee0a` (Neon Yellow)                |
| **Accent Primary Hover**      | `#123898` (`--blue-700`) | `#123898` (`--blue-700`)           | `#00f0ff` (Neon Cyan)                  |
| **Border Color**              | `#dee2e6` (`--gray-300`) | `#495057` (`--gray-700`)           | `#ff0055` (Neon Magenta / Pink)        |
| **Border Radius**             | Smooth (`4px` – `16px`)  | Smooth (`4px` – `16px`)            | **`0px` (Strictly angular & sharp)**   |
| **Shadow Glow**               | None (soft diffuse)      | Subtle diffuse dark                | **Intense multi-color neon glow**      |
| **Heading Font**              | System Font              | System Font                        | `'Orbitron', sans-serif`               |
| **Body / Data Font**          | System Font              | System Font                        | `'Share Tech Mono', monospace`         |

---

## 4. Responsive Layout & Breakpoints System

UniDesign uses responsive breakpoints mirrored between SCSS mixins and TypeScript constants.

### 4.1 Canonical Breakpoint Scale

| Breakpoint | Pixel Width | Device Category                              |
| :--------- | :---------- | :------------------------------------------- |
| `xs`       | `480px`     | Small smartphones, portrait mobile           |
| `sm`       | `640px`     | Standard smartphones, large mobile landscape |
| `md`       | `768px`     | **Primary Mobile / Tablet boundary**         |
| `lg`       | `1024px`    | Tablets landscape, compact desktop / laptop  |
| `xl`       | `1280px`    | Standard desktop monitors                    |
| `xxl`      | `1536px`    | High-resolution widescreen monitors          |

### 4.2 Breakpoints in SCSS (`breakpoints.scss`)

Never use hardcoded media queries like `@media (max-width: 768px)`. Always import and use the system mixins:

```scss
@use '@universe/ui/breakpoints.scss' as *;

.cardGrid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-16);

  @include narrower-than('lg') {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @include narrower-than('md') {
    grid-template-columns: 1fr;
  }
}
```

### 4.3 Breakpoints in TypeScript (`useMediaQuery`)

Never pass raw numbers or strings in TypeScript. Use the canonical `BREAKPOINTS` constant from `@universe/core`:

```tsx
import { BREAKPOINTS } from '@universe/core';
import { useMediaQuery } from '@uni-hub/hooks/useMediaQuery';

// ✅ Canonical usage
const isMobile = useMediaQuery(BREAKPOINTS.md, 'less');
const isDesktop = useMediaQuery(BREAKPOINTS.lg, 'wider');
```

---

## 5. Horizontal Overflow & Mobile Layout Rules

To ensure a completely smooth mobile experience and eliminate horizontal scrollbars on smartphones:

```text
┌────────────────────────────────────────────────────────┐
│  Mobile Viewport (360px - 768px)                       │
│  ┌──────────────────────────────────────────────────┐  │
│  │ HTML, Body (overflow-x: hidden; max-width: 100vw) │  │
│  │ ┌──────────────────────────────────────────────┐ │  │
│  │ │ .layout (display: flex; flex-direction: col)  │ │  │
│  │ │ ┌──────────────────────────────────────────┐ │ │  │
│  │ │ │ .main (width: 100%; min-width: 0;)       │ │ │  │
│  │ │ │ ┌──────────────────────────────────────┐ │ │ │  │
│  │ │ │ │ .content (overflow-y: auto;          │ │ │ │  │
│  │ │ │ │           overflow-x: hidden;)       │ │ │ │  │
│  │ │ │ └──────────────────────────────────────┘ │ │ │  │
│  │ │ └──────────────────────────────────────────┘ │ │  │
│  │ └──────────────────────────────────────────────┘ │  │
│  │ [MobileBottomNav (position: fixed; bottom: 16px)]│  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

### Essential Rules for Responsive Cleanliness:

1. **`overflow-y: auto; overflow-x: hidden;` on Scrollable Viewport**:
   Containers with scrolling content must explicitly declare `overflow-x: hidden` to block inadvertent horizontal panning.
2. **Flex & Grid Child Containment**:
   Always declare `min-width: 0;` on flex children and grid items to allow text truncation and wrapping. Without `min-width: 0`, flex items default to `auto`, which forces containers to expand beyond screen width when containing long words.
3. **Word Break & Text Wrapping**:
   Use `overflow-wrap: break-word;` (avoid deprecated `word-break: break-word`) on titles, email addresses, and student profile badges.
4. **No Forced Horizontal Carousels on Core Pages**:
   Primary lists (such as assignments, events, courses) render as vertical stacks on mobile viewports rather than wide horizontal scroll rows.
5. **Padding Adaptation**:
   Desktop padding of `var(--space-24)` drops to `var(--space-16)` on mobile (`narrower-than('md')`) to conserve valuable horizontal screen estate.

---

## 6. Component Library Reference (`@una`)

Primitives live in `packages/ui/components/una/` and must be consumed via `@una`.

### 6.1 Button (`@una`)

Interactive trigger element supporting multiple variants and sizes.

```tsx
import { Button } from '@una';

// Variants
<Button variant="primary">Головна дія</Button>
<Button variant="secondary">Допоміжна дія</Button>
<Button variant="secondary" isTransparent>Прозора кнопка</Button>

// Sizes: 'small' | 'medium' | 'large'
<Button size="small">Компактна</Button>
<Button size="medium">Стандартна</Button>

// With icons & state
<Button loading icon={<BookOpen size={16} />}>Завантаження</Button>
```

- **a11y Rule:** Always specify `type="button"` (or `"submit"`). Never wrap non-functional tags in `onClick`.

---

### 6.2 Modal Dialog (`@una`)

Native HTML5 `<dialog>` component with complete keyboard navigation support.

```tsx
import { Modal } from '@una';

<Modal
  open={isOpen}
  onClose={() => setIsOpen(false)}
  title="Подати завдання на перевірку"
  footer={<Button onClick={handleSubmit}>Надіслати</Button>}
>
  <p>Оберіть файл для завантаження...</p>
</Modal>;
```

- **Topmost Escape Closes Modal**: If multiple sheets are stacked, pressing `Escape` closes only the top modal.
- **Focus Trap**: Cycles Tab navigation within the dialog. Focus is restored to the triggering element upon close.

---

### 6.3 Tag / Badge (`@una`)

Visual label for statuses, ECTS credits, and academic categories.

```tsx
import { Tag } from '@una';

<Tag tone="success">95 / 100 • Відмінно</Tag>
<Tag tone="info">Іспит</Tag>
<Tag tone="warning">Дедлайн: завтра</Tag>
<Tag tone="danger">Прострочено</Tag>
<Tag tone="neutral">5 ECTS</Tag>
```

---

### 6.4 ProgressBar (`@una`)

Horizontal meter communicating completion percentage.

```tsx
import { ProgressBar } from '@una';

<ProgressBar value={78} tone="success" size="medium" />;
```

- Features `role="progressbar"`, `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`.

---

### 6.5 Chart (`@una`)

Data visualization engine wrapping Recharts with native CSS-variable-driven theming.

```tsx
import { Chart } from '@una';

<Chart
  type="donut"
  title="Статус завдань"
  height={240}
  data={[
    { name: 'Виконано', value: 12, color: 'var(--chart-success)' },
    { name: 'В процесі', value: 4, color: 'var(--chart-info)' },
    { name: 'Прострочено', value: 1, color: 'var(--chart-danger)' },
  ]}
/>;
```

- Automatically adapts grid lines, axes, and tooltip colors when the active theme changes (Light, Dark, Cyberpunk).

---

### 6.6 Inputs & Form Controls (`@una`)

- **`TextInput`**: Single-line text, email, number, or search input with focus ring.
- **`Select`**: Accessible dropdown selector with options mapping.
- **`CheckBox`**: Semantic custom checkbox with checkmark animation and keyboard focus.
- **`RadioButton`**: Grouped single-selection control with `role="radiogroup"`.
- **`DateTimePicker`**: Accessible date selection input.
- **`FileInput`**: File dropzone with progress feedback and drag-and-drop support.

---

## 7. Developer Implementation Checklist

Before submitting code, verify compliance against this checklist:

- [ ] **No Hardcoded Hex/RGB**: All colors use CSS variables (`var(--...)`).
- [ ] **8-Point Spacing**: Margins and paddings use `--space-8`, `--space-16`, etc.
- [ ] **Breakpoints from Tokens**: Responsive media queries use `@include narrower-than(...)`.
- [ ] **Zero Tailwind**: No Tailwind imports or utility classes (`w-full`, `p-4`, etc.).
- [ ] **No Mobile Horizontal Scroll**: Page width strictly limited to `100vw`, with `min-width: 0` on flex items.
- [ ] **Accessible HTML Elements**: `<button type="button">`, `<dialog>`, semantic tags used appropriately.
- [ ] **Clean Theme Support**: Looks flawless in Light, Dark, and Cyberpunk modes.
