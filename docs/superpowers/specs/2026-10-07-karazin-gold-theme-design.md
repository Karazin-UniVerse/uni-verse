# Karazin Gold Theme

Date: 2026-10-07

## Goal

Add a `karazinGold` theme (Notion task "Add Karazin gold gradient theme"): a near-black base with a gold accent, gold-bordered glass cards and golden headings, as in the reference slides. The first prototype leaned violet; the chosen variant keeps violet to a single corner glow.

## Theme

- Dark base: joins `dark` and `universeSpace` in the shared token block and overrides the rest in `[data-theme='karazinGold']`.
- Palettes: the gold scale `--karazin-gold-100..700` moves from the Karazin Classic block to the root palette (shared by both themes); new `--obsidian-*` and `--cream-50`.
- Accent: gold (`--karazin-gold-400` for links and icons); the primary button is gold with dark text (`--obsidian-950`).
- Page: obsidian base with gold glows in three corners and one violet glow (top-right, 14%); glass cards with a 38% gold border and a soft gold glow; translucent sidebar and header with gold hairlines; the active nav item gets a gold gradient plate and bar.
- Headings use new tokens `--heading-color` and `--heading-shadow` (default: the text color and no shadow, so other themes are unchanged); Karazin Gold sets a gold color and a soft glow.
- Charts lead with gold; the switcher uses the `Crown` icon and `theme.karazinGold` (`uk.ts`, `en.ts`); Storybook title added.

## Shared dark rules keyed by color scheme

The component rules for dark themes (`Tag`, `Popover`, `LiveCountdown`, the dashboard offline banner) listed theme names one by one. A third dark theme would have made it four copies, so:

- `@universe/core/constants/themes` now holds `APP_THEMES`, the `AppTheme` type and `THEME_COLOR_SCHEME` (every theme is mapped to `light` or `dark`; the `Record` type makes TypeScript fail if a theme is missing). `ThemeContext`, `ThemeSwitcher` and the Storybook preview import from there; the toolbar list is derived from `APP_THEMES`.
- `ThemeContext` sets `data-color-scheme` next to `data-theme`; the Storybook decorator does the same.
- The shared rules now use `[data-color-scheme='dark']` (cyberpunk was already part of those lists, so it stays covered).

The CSS property `color-scheme: dark` for native controls is deliberately not added here.

## Verification

Computed styles of the sidebar, header, content, cards, tags, countdown, buttons and links were compared before and after, in all six pre-existing themes: zero differences after the refactor and after adding the theme. Dashboard, theme dropdown and login page of the new theme checked in a browser (Playwright, logged-in student).
