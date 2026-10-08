# UniDesign System — Design Specification

> **Karazin UniVerse** — Academic LMS Platform  
> Design system codename: **UniDesign** (component library: `@una`)

---

## Visual Theme & Atmosphere

UniDesign serves a **Ukrainian academic platform** — an LMS connecting students, teachers, and university administration at V. N. Karazin Kharkiv National University. The visual language balances institutional trustworthiness with modern clarity.

### Light Theme (Default)

Clean white backgrounds (`#ffffff`) with warm-gray surfaces (`--gray-50: #f8f9fa`). The atmosphere is airy and paper-like, evoking a well-organized physical notebook. Shadows are minimal and diffuse — cards float gently above the page with `0 1px 2px 0 rgb(0 0 0 / 5%)` at rest and expand to `0 8px 24px rgb(0 0 0 / 6%)` on hover. Borders are nearly invisible (`--gray-200: #e9ecef`), creating a soft container separation without hard lines.

The accent color is **Karazin Blue** (`--blue-600: #164bd7`) — a deep, saturated institutional blue that anchors primary actions, active states, and focus rings. It provides strong contrast against white surfaces and immediately identifies interactive elements.

### Dark Theme

Deep charcoal background (`#121212`) balanced for OLED screens. Surfaces step up to `--gray-800: #343a40`, creating subtle depth without the harshness of pure black. Text inverts to light values (`--gray-50` for primary, `--gray-400` for secondary). Card shadows intensify to `0 4px 12px rgb(0 0 0 / 40%)` — necessary against dark backgrounds to maintain elevation cues.

The blue accent remains the same hue (`--blue-600`) but the focus ring shifts to a lighter, more visible `rgb(119 148 246 / 45%)` to maintain contrast.

### Cyberpunk Theme

A high-energy, high-contrast alternative using sharp angular shapes (all border radii forced to `0px`), neon glow shadows, and retrofuturistic typography:

- **Headings**: `'Orbitron', sans-serif` — angular, all-caps-friendly display face
- **Body/Data**: `'Share Tech Mono', monospace` — terminal-like mono for a hacker aesthetic
- **Primary accent**: Neon Acid Yellow `#fcee0a`
- **Secondary accent**: Neon Cyan `#00f0ff`
- **Danger/borders**: Neon Magenta `#ff0055`
- **Shadows**: Multi-color neon glow effects instead of diffuse drop shadows

This theme exists as a fun, opt-in experience for students who want personality in their academic dashboard. It is NOT the default and should NOT influence core design decisions.

---

## Color Roles & Contrast Intent

### Three-Layer Color Architecture

1. **Raw Primitive Palettes** — Pure color stops from 50 (lightest) to 900 (darkest):
   - **Gray**: `#f8f9fa` → `#212529` (10 stops)
   - **Blue** (Karazin): `#edf1fe` → `#0f2860` (10 stops)
   - **Red** (Alert): `#fef2f2` → `#7f1d1d` (10 stops)
   - **Green** (Academic): `#f0fdf4` → `#14532d` (10 stops)
   - **Purple** (Academic): `#faf5ff` → `#581c87` (10 stops)

2. **Semantic Contextual Tokens** — Intent-based abstractions:
   - `--bg-color` / `--bg-surface` — page and card backgrounds
   - `--text-primary` / `--text-secondary` / `--text-disabled` — text hierarchy
   - `--border-color` — universal border
   - `--accent-primary` / `--accent-primary-hover` / `--accent-primary-active` — interactive accent
   - `--btn-primary-bg` / `--btn-secondary-bg` — button-specific aliases
   - `--card-border` / `--card-shadow` / `--card-shadow-hover` — card elevation

3. **Feedback Tokens** — Status communication:
   - `--success-color`: `var(--green-500)` → `#22c55e` — Excellent grades (90–100), completed tasks
   - `--error-color`: `var(--red-500)` → `#ef4444` — Failed grades (0–49), overdue deadlines
   - `--warning-color`: `#f59e0b` — Satisfactory grades (50–69), approaching deadlines
   - `--info-color`: `var(--blue-500)` → `#3466e7` — Good grades (70–89), informational notices

### Academic Grading Color Mapping (Karazin 100-Point Scale)

| Grade Range | ECTS  | Ukrainian Name            | Color Token                   | Light HEX | Dark HEX  |
| :---------- | :---- | :------------------------ | :---------------------------- | :-------- | :-------- |
| 90–100      | A     | Відмінно (Excellent)      | `--green-500` / `--green-400` | `#22c55e` | `#4ade80` |
| 70–89       | B, C  | Добре (Good)              | `--blue-500` / `--blue-400`   | `#3466e7` | `#7794f6` |
| 50–69       | D, E  | Задовільно (Satisfactory) | `--warning-color`             | `#f59e0b` | `#fbbf24` |
| 0–49        | Fx, F | Незадовільно (Fail)       | `--error-color`               | `#ef4444` | `#f87171` |

### Contrast Requirements

All text-on-background combinations must meet **WCAG 2.1 AA** contrast ratios:

- Normal text (< 18px): minimum **4.5:1**
- Large text (≥ 18px bold or ≥ 24px): minimum **3:1**
- Interactive components and graphical objects: minimum **3:1**

### Dark Theme Color Adaptation

Tag/Badge components invert their color approach in dark mode:

- Light: solid pastel background (e.g., `--green-50`) with dark text (`--green-800`)
- Dark: translucent tinted background (e.g., `rgb(34 197 94 / 15%)`) with bright text (`--green-300`)

This maintains readability while avoiding overly bright blocks in dark interfaces.

---

## Typography Hierarchy

### Font Stack

The primary font stack is a system-native sans-serif for maximum performance and native feel:

```
-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif
```

No custom web fonts are loaded for the default theme — this eliminates FOIT/FOUT issues and reduces page load time.

**Cyberpunk overrides** load two Google Fonts via `@import`:

- Headings: `'Orbitron'` (weights 400, 700, 900)
- Body/Data: `'Share Tech Mono'`

### Type Scale

The scale is compact and optimized for data-dense academic interfaces:

| Token        | Size | Weight Range | Line Height  | Primary Role                                     |
| :----------- | :--- | :----------- | :----------- | :----------------------------------------------- |
| `--font-xs`  | 12px | 400–500      | 1.4 (16.8px) | Badges, tags, timestamps, helper text, footnotes |
| `--font-sm`  | 14px | 400–500      | 1.4 (19.6px) | Table cells, metadata, input labels, navigation  |
| `--font-md`  | 16px | 400–500      | 1.5 (24px)   | Body text, form inputs, button labels            |
| `--font-lg`  | 18px | 500–600      | 1.4 (25.2px) | Card titles, dialog titles, list headers         |
| `--font-xl`  | 20px | 600–700      | 1.3 (26px)   | Section headings, hero greetings                 |
| `--font-xxl` | 24px | 700          | 1.2 (28.8px) | Page headers, KPI counters, dashboard numbers    |

### Weight Tokens

| Token                   | Value | Usage                                              |
| :---------------------- | :---- | :------------------------------------------------- |
| `--font-weight-regular` | 400   | Body text, descriptions, secondary content         |
| `--font-weight-medium`  | 500   | Button labels, input text, tag text, table headers |
| `--font-weight-bold`    | 700   | Page headings, section titles, emphasis            |

### Shorthand Abstractions

Two CSS shorthand tokens combine size, weight, line-height, and family:

- `--font-heading`: `700 24px/1.2 var(--font-family-heading)` — for page titles
- `--font-regular`: `400 16px/1.5 var(--font-family-regular)` — for body content

---

## Spacing, Sizing & Grid Density

### The 8-Point Grid

All spacing in UniDesign adheres to an **8-point grid** with 2px and 4px subdivisions for compact elements. This creates visual rhythm and predictable alignment across all components.

| Token        | Value | Typical Use                                                                 |
| :----------- | :---- | :-------------------------------------------------------------------------- |
| `--space-2`  | 2px   | Micro: tag internal offsets, compact icon gaps                              |
| `--space-4`  | 4px   | Fine: badge padding, label-to-helper gaps, border adjustments               |
| `--space-8`  | 8px   | Base compact: button horizontal padding, list item gaps, chip spacing       |
| `--space-12` | 12px  | Intermediate: card sub-elements, table cell vertical padding, toast padding |
| `--space-16` | 16px  | Standard: component internal padding, card gaps, mobile layout margins      |
| `--space-24` | 24px  | Section: desktop card padding, panel headers, column gaps, modal body       |
| `--space-32` | 32px  | Structural: card stacks, modal boundaries, section dividers, spinner wrap   |
| `--space-40` | 40px  | Hero: page hero margins, empty state padding, dashboard sections            |
| `--space-48` | 48px  | Desktop: grid gutters, hero headers                                         |
| `--space-64` | 64px  | Layout: desktop header height, mobile bottom nav height                     |

### Semantic Aliases

Three tiers of semantic spacing are defined for consistent shorthand:

- **Small**: `--padding-small` / `--margin-small` / `--gap-small` → `var(--space-8)` (8px)
- **Medium**: `--padding-medium` / `--margin-medium` / `--gap-medium` → `var(--space-16)` (16px)
- **Large**: `--padding-large` / `--margin-large` / `--gap-large` → `var(--space-24)` (24px)

### Component Sizing

Button sizes map to predictable padding/font combinations:

- **Small**: `padding: 4px 8px; font-size: 14px` (compact actions, table rows)
- **Medium**: `padding: 8px 16px; font-size: 16px` (standard interactive)
- **Large**: `padding: 12px 24px; font-size: 18px` (hero CTAs, prominent actions)

Input heights follow a fixed scale:

- **Small**: `height: 32px`
- **Medium**: `height: 40px`
- **Large**: `height: 48px`

### Responsive Breakpoints

| Breakpoint | Width  | Target                             |
| :--------- | :----- | :--------------------------------- |
| `xs`       | 480px  | Small smartphones                  |
| `sm`       | 640px  | Standard smartphones               |
| `md`       | 768px  | **Primary mobile/tablet boundary** |
| `lg`       | 1024px | Tablets landscape, compact desktop |
| `xl`       | 1280px | Standard desktop                   |
| `xxl`      | 1536px | Widescreen monitors                |

Desktop padding of `--space-24` drops to `--space-16` on viewports narrower than `md`.

### Grid Patterns

- Desktop: 3-column grid with `--space-16` gaps → collapses to 2 columns at `lg` → 1 column at `md`
- Dashboard cards: CSS Grid with `minmax(0, 1fr)` — always includes `min-width: 0` on flex/grid children to prevent overflow

---

## Component Architecture & State Management

### Library Structure

All UI primitives reside in `../packages/ui/components/una` and are consumed via the `@una` import alias. The library is organized by component type:

```
@una/
├── Button/          — Actions
├── Chart/           — Data Visualization (Recharts wrapper)
├── Empty/           — Empty states
├── Form/            — SimpleForm wrapper
├── Modal/           — Dialog overlays
├── ProgressBar/     — Progress meters
├── Select/          — Dropdown selects
├── Skeleton/        — Loading placeholders
├── Spinner/         — Loading indicators
├── Tag/             — Status badges
├── Toast/           — Notification system (Provider + Hook)
└── inputs/
    ├── TextInput/       — Text fields
    ├── CheckBox/        — Checkboxes
    ├── RadioButton/     — Radio buttons
    ├── DateTimePicker/  — Calendar + time picker
    ├── FileInput/       — File upload dropzone
    └── SimpleSlider/    — Range slider
```

### Styling Pattern

Every component uses **SCSS Modules** (`*.module.scss`) co-located with its source:

```
Button/
├── Button.tsx           — Component logic
├── Button.types.ts      — TypeScript interface
├── Button.module.scss   — Scoped styles
├── Button.test.tsx      — Unit tests
├── Button.stories.tsx   — Storybook stories
└── index.ts             — Barrel export
```

Classes are composed with `clsx`:

```tsx
const classes = clsx(css.btn, css[variant], css[size], isTransparent && css['is-transparent']);
```

### Interactive States

All interactive components implement the following state chain:

1. **Default** — base visual state
2. **Hover** (`:hover`) — subtle background/border shift
3. **Focus-Visible** (`:focus-visible`) — `outline: 3px solid var(--focus-ring-color)` with `2px` offset
4. **Active** (`:active`) — deeper accent shade
5. **Disabled** (`:disabled`) — reduced opacity, `cursor: not-allowed`, muted colors

Focus is specifically `:focus-visible` (not `:focus`) to avoid showing focus rings on mouse clicks.

### Accessibility Patterns

| Component   | ARIA Pattern                                                                                                    |
| :---------- | :-------------------------------------------------------------------------------------------------------------- |
| Button      | `type="button"` default, native `<button>` or `<a>` semantics                                                   |
| Modal       | `role="dialog"`, `aria-modal="true"`, `aria-labelledby` linked to title, focus trap, Escape closes topmost only |
| ProgressBar | `role="progressbar"`, `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax`, `aria-valuetext`                   |
| Spinner     | `role="status"`, `aria-live="polite"`, visually hidden label                                                    |
| Toast       | `aria-live="polite"` on viewport container                                                                      |
| CheckBox    | Custom styled `<input type="checkbox">` with `:focus-visible` ring                                              |
| RadioButton | Custom styled `<input type="radio">` with `:focus-visible` ring                                                 |
| Empty       | Decorative icon has `aria-hidden`                                                                               |
| Skeleton    | `aria-hidden="true"`                                                                                            |

### State Management Patterns

- **Toast**: React Context (`ToastProvider` + `useToast()` hook) — push notifications with auto-dismiss (3.5s)
- **Modal**: Imperative open/close via `open` boolean prop. Multiple modals use a stack — only the topmost responds to Escape. Body scroll is locked when any modal is open and restored when all close.
- **Form**: `SimpleForm` normalizes `<form>` submission into `action(FormData)` and `onData(object)` callbacks.
- **FileInput**: Supports both controlled (`files` + `onFilesChange`) and uncontrolled modes with internal state.

---

## Motion & Transitions

### Easing Function

All transitions share a single easing curve:

```css
--ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
```

This is a **material-style deceleration curve** — elements start quickly and ease to a stop, creating a natural, responsive feel.

### Duration Tiers

| Token                 | Duration | Usage                                                                            |
| :-------------------- | :------- | :------------------------------------------------------------------------------- |
| `--transition-fast`   | 150ms    | Micro-interactions: button hover, checkbox toggle, tag hover, input focus        |
| `--transition-medium` | 250ms    | Component transitions: modal enter, dropdown fade, accordion expand, toast slide |
| `--transition-slow`   | 400ms    | Page-level: theme color shifts, full modal fades, progress bar fill              |

### Open Design Motion Tokens

For cross-system compatibility, these additional tokens are exported:

```css
--ease-od-standard: cubic-bezier(0.23, 1, 0.32, 1);
--motion-enter: 200ms;
--motion-exit: 140ms;
```

### Animation Keyframes

| Animation    | Used By                    | Timing                                                   |
| :----------- | :------------------------- | :------------------------------------------------------- |
| `overlay-in` | Modal overlay              | `--transition-medium` — opacity 0→1                      |
| `dialog-in`  | Modal dialog (desktop)     | `--transition-medium` — opacity 0→1, scale 0.96→1        |
| `slide-up`   | Modal dialog (mobile < md) | `--transition-medium` — translateY 100%→0 (bottom sheet) |
| `slide-in`   | Toast notification         | `--transition-medium` — opacity 0→1, translateX 16px→0   |
| `shimmer`    | Skeleton loader            | 1.4s ease-in-out infinite — background gradient sweep    |
| `spin`       | Spinner                    | 0.8s linear infinite — 360° rotation                     |

### Reduced Motion

When `prefers-reduced-motion: reduce` is active:

- All `transition` and `animation` durations should collapse to `0ms`
- Skeleton shimmer and Spinner rotation should stop or use opacity-only fallbacks

---

## Negative Constraints & Anti-Patterns

### Absolute Prohibitions

These patterns are **categorically forbidden** in the UniVerse codebase:

1. **No Tailwind CSS** — No utility classes (`flex`, `p-4`, `bg-white`, `rounded-lg`). The codebase is 100% SCSS Modules. Tailwind is banned at the ESLint level.

2. **No Hardcoded Colors** — Every color reference must use a CSS custom property. Raw HEX (`#333`), RGB (`rgb(0,0,0)`), and HSL values are forbidden in component styles. The only exception is within `tokens.css` / `vars.scss` definitions themselves.

3. **No Arbitrary Spacing** — Values like `margin: 13px`, `padding: 7px`, or `gap: 11px` violate the 8-point grid. Always use `--space-*` tokens.

4. **No Hardcoded Media Queries** — Never write `@media (max-width: 768px)`. Always use `@include narrower-than('md')` from `@universe/ui/breakpoints.scss`.

5. **No Raw HTML When Components Exist** — Writing `<button>`, `<input>`, `<select>`, or custom card/badge/modal wrappers when an `@una` primitive covers that use case is forbidden.

6. **No Invented Props** — Passing props not documented in `components.manifest.json` (e.g., `<Button color="red">`, `<Tag rounded>`) will either fail silently or produce unexpected behavior.

7. **No Inline Styles for Visual Properties** — `style={{ color: '...', background: '...' }}` is forbidden for theming-related properties. Inline styles are acceptable only for truly dynamic values (e.g., `width` based on a calculation, `--modal-dialog-width`).

8. **No CSS-in-JS** — No `styled-components`, `emotion`, or `@vanilla-extract`. The styling system is exclusively SCSS Modules.

### Common Mistakes to Avoid

| Mistake                                              | Correct Approach                                                     |
| :--------------------------------------------------- | :------------------------------------------------------------------- |
| Using raw palette token for surfaces (`--gray-50`)   | Use semantic token (`--bg-surface`) — it auto-adapts to theme        |
| Setting `border-radius: 8px` inline                  | Use `var(--border-radius-medium)` — cyberpunk theme overrides to 0px |
| Writing `<div onClick={...}>` for clickable areas    | Use `<Button>` or `<button type="button">` — keyboard accessible     |
| Adding `cursor: pointer` to non-interactive elements | Only interactive elements should have pointer cursor                 |
| Wrapping form controls in custom styled divs         | Use `<SimpleForm variant="card">` with `@una` inputs                 |
| Using `word-break: break-word` (deprecated)          | Use `overflow-wrap: break-word` instead                              |
| Setting fixed pixel widths on mobile                 | Use `width: 100%` with `min-width: 0` on flex/grid children          |
| Nesting interactive elements                         | Never put `<button>` inside `<a>` or vice versa                      |

### Mobile-Specific Constraints

1. No horizontal overflow — every page must fit within `100vw` on mobile
2. Flex children must have `min-width: 0` to allow text truncation
3. Primary lists render as vertical stacks (not horizontal carousels) on mobile
4. Desktop padding `--space-24` drops to `--space-16` below the `md` breakpoint
5. Modal switches to bottom-sheet pattern (slides up from bottom) on mobile

---

## Navigation & Layout Architecture

The application implements a highly adaptive, state-driven navigation system that seamlessly transitions between desktop, tablet, and mobile environments.

### 1. Data Structure & State Management

Navigation items must be defined centrally to ensure consistency across all responsive components (Sidebar and BottomNav).

**Configuration Schema:**

```typescript
type NavKey = 'overview' | 'courses' | 'grades' | 'schedule' | 'assignments';

interface NavItem {
  key: NavKey; // Unique identifier for state management
  icon: React.ReactNode; // Lucide-react icon component
  label: string; // Full label for desktop/tablet
  shortLabel: string; // Truncated/compact label for mobile BottomNav
}
```

**State Flow:**
The parent `DashboardLayout` holds the `activeKey: NavKey` state. This state, along with the `onSelectKey` updater, is passed down to all navigation components. Navigation elements act as controlled SPA tabs, NOT deep route links (`href`), to allow for instant, client-side view swapping without page reloads.

### 2. Responsive Layout Strategy & Breakpoints

Navigation components mount/unmount and change dimensions based on strict CSS media queries:

- **Desktop (`> 1024px`)**:
  - `DashboardSidebar` is visible and fixed at `240px` width.
  - Displays both `icon` and `label`.
- **Tablet (`768px - 1024px`)**:
  - `DashboardSidebar` collapses to `72px` width.
  - Text labels are hidden (`display: none`); only `icon` is shown.
  - Menu items center their content via `justify-content: center`.
- **Mobile (`< 768px`)**:
  - `DashboardSidebar` is completely hidden (`display: none`).
  - `MobileBottomNav` is displayed.
  - Page content container adds `padding-bottom: calc(88px + env(safe-area-inset-bottom, 0px))` to prevent content from being obscured by the floating nav.

### 3. Mobile Bottom Navigation (Glassmorphism)

The mobile navigation abandons the traditional tab bar in favor of a floating, glassmorphic pill.

**Visual Specs:**

- **Positioning**: Fixed at the bottom. `bottom: var(--space-16); left: var(--space-16); right: var(--space-16); height: 64px;`
- **Shape**: Fully rounded edges with `border-radius: 32px`.
- **Material**: Heavy glassmorphism using `color-mix` and `backdrop-filter`:
  ```css
  background: color-mix(in srgb, var(--bg-surface) 65%, transparent);
  backdrop-filter: blur(40px) saturate(150%);
  border: 1px solid color-mix(in srgb, var(--border-color) 50%, transparent);
  box-shadow: 0 8px 32px rgb(0 0 0 / 12%);
  ```
- **Text Handling**: Uses `shortLabel`. Must include `text-overflow: ellipsis; white-space: nowrap; overflow: hidden;` to prevent breaking the layout on narrow screens (e.g., iPhone SE).

### 4. Active State & Framer Motion Animation

The active tab indicator is an independent DOM node that physically slides between navigation items using Framer Motion.

**Implementation Rules:**

1. Render the `<motion.div>` conditionally only when `activeKey === item.key`.
2. Apply a shared `layoutId`. **CRITICAL**: Use different `layoutId` strings for desktop (`"active-nav-pill"`) and mobile (`"mobile-active-nav-pill"`) to prevent Framer Motion from attempting to animate the pill across the screen when crossing breakpoints.
3. Use strict physics: `transition={{ type: 'spring', stiffness: 380, damping: 30 }}`.

**Z-Index Layering:**
The active pill must sit visually _behind_ the text and icon, but within the button's DOM.

- Nav Item (`<button>`): `position: relative`
- Active Pill (`<motion.div>`): `position: absolute; inset: 0; z-index: 0;`
- Icon & Text wrappers: `position: relative; z-index: 1;` (Ensures clicks register and text sits on top of the background pill).

### 5. Header Responsibility Overflow

On mobile viewports, the `DashboardSidebar` (which normally houses global actions) disappears. To compensate, the `DashboardHeader`'s **User Profile Dropdown** absorbs these secondary actions.

If `window.innerWidth < 768px`, the User Dropdown must include:

1. `ThemeSwitcher` (Compact false, showLabel true)
2. Sound Toggle Button (Volume icon + text)
3. Moodle LMS External Link
4. Logout Button

These items are hidden on desktop (`.mobileOnlyItem { display: none; }` inside the dropdown).

### 6. Accessibility (A11y) & Interactions

- **Audio Feedback**: Every click on a navigation item must execute `playClick(soundEnabled)` _before_ triggering state changes.
- **Semantic Structure**:
  - The wrapper must be `<nav aria-label="Мобільна навігація">`.
  - The list should be `<ul>` with `<li>` items.
  - The clickable target MUST be a `<button type="button">`, NOT an `<a>` or `<div>`, since it controls page state, not URL routing.
- **Focus Management**:
  - When the sidebar is opened as a drawer (mobile overlay mode), a `useEffect` must trap focus.
  - It must query all focusable elements (`button:not([disabled]), [href], input, select, textarea, [tabindex]`).
  - Pressing `Tab` must cycle focus from the last element back to the first.
  - Pressing `Escape` must close the overlay menu.
