# Vice City Dark Theme

Date: 2026-11-20

## Goal

Add a `viceCityDark` theme (`Vice City Dark`): a dark midnight-plum synthwave palette with neon hot-pink primary accents, electric cyan secondary accents, frosted glass cards, and crisp neon-lit headings.

## Theme

- Dark base: joins `dark`, `universeSpace`, and `karazinGold` in the shared dark token block and maps to `'dark'` in `THEME_COLOR_SCHEME`.
- Palette & surfaces: midnight-plum void (`#0b0a14`) and surface (`#141224`), neon hot-pink primary accents and borders (`#ff4d9e` / `#c91468` with WCAG AA white button text), electric cyan secondary accents (`#1ee3f5` / `#6ef3ff`), glass cards (`blur(14px)`), pink-to-cyan active sidebar plate, and default rounded corners + system sans-serif typography.
- Integration: registered in `APP_THEMES`, `THEME_COLOR_SCHEME`, `THEME_INIT_SCRIPT` in `layout.tsx`, Storybook theme toolbar, i18n (`theme.viceCityDark` in `uk.ts` and `en.ts`), and `ThemeSwitcher` with the `TreePalm` icon.
