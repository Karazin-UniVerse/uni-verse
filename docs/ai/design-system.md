# Design System Rules (UniDesign)

This document contains the strict rules and instructions for using the **UniVerse** design system that AI agents and developers must follow. The rules are ranked by level of strictness.

## 🔴 Critical Strictness

### 1. Colors

- Use **ONLY** variables from the design system.
- **DO NOT** hardcode any HEX, RGB or HSL values (for example, `#FF0000`, `rgb(255, 0, 0)`).
- If a required color is missing from the system:
  - Propose adding a new token to the design system (vars.scss).
  - Or change the design to match the existing palette.

### 2. Typography (Fonts and Sizes)

- Use **only** system font sizes and font families (font-family).
- Fonts and sizes apply to the whole field / component as a unit.
- Changing the base typography in the design system is **strictly prohibited**.
- _Exceptions:_ Custom sizes are allowed **only** for unique or specific elements (for example, charts, logos), and only if explicitly approved.

## 🟠 High Strictness

### 3. Spacing (Margins & Paddings)

- Spacing is written case by case, but **STRICTLY** following the multiples principle:
  - Primary grid: multiples of **8** (`8px`, `16px`, `24px`, `32px`...).
  - Secondary grid: multiples of **4** (`4px`, `12px`, `20px`...).
  - Micro spacing: multiples of **2** (only for very tight UI elements).
- Using odd or arbitrary values (for example, `7px`, `13px`, `15px`) is **prohibited**.

### 4. Border Radius

- Use only standardized system tokens (for example, `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-full`).
- Do not hardcode arbitrary pixel values (for example, `border-radius: 5px;`).

## 🟡 Medium Strictness

### 5. Shadows & Z-Index

- **Shadows (Elevation):** Writing custom shadows (`box-shadow: 0px 4px ...`) is prohibited. Use only the system elevation levels (elevation-1, elevation-2).
- **Z-Index:** Use clear system levels (for example, `z-dropdown`, `z-sticky`, `z-modal`, `z-tooltip`) to avoid conflicts and stacking issues (z-index wars). Avoid magic numbers such as `z-index: 9999`.

### 6. Animations & Transitions

- All `transition-duration` and `transition-timing-function` values must use the shared system variables (for example, `duration-200 ease-in-out`). This ensures a smooth and consistent experience.
