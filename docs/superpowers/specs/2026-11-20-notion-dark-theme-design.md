# Notion Dark Theme

Date: 2026-11-20

## Goal

Add a `notionDark` theme (`Notion Dark`): a flat, matte, gradient-free dark workspace inspired by Notion's dark mode.

## Theme

- Dark base: joins `dark`, `universeSpace`, and `karazinGold` in the shared dark token block and maps to `'dark'` in `THEME_COLOR_SCHEME`.
- Palette & surfaces: matte charcoal canvas (`#121212`), matte sidebar (`#161616`), flat elevated cards (`#1b1b1b`, no blur, no resting shadow, zero gradients on `--bg-page` and `--bg-mesh*`), soft off-white text (`#dedede`), muted warm gray (`#9b9a97`), and Notion blue accents (`#2383e2` / `#529cca`).
- Integration: registered in `APP_THEMES`, `THEME_COLOR_SCHEME`, `THEME_INIT_SCRIPT` in `layout.tsx`, Storybook theme toolbar, i18n (`theme.notionDark` in `uk.ts` and `en.ts`), and `ThemeSwitcher` with the `FileText` icon.
