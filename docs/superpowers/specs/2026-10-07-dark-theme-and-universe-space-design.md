# Dark Theme Refresh and UniVerse Space Theme

Date: 2026-10-07

## Goal

The dark theme looked flat and low-contrast: cards and the content area were the same gray (1.00:1), white text on the primary button was 2.54:1, and the accent barely showed. This change deepens the dark theme and adds a second, more vivid dark theme, `universeSpace`, built on the same base.

## Dark theme

- New night palette: `--night-950` (page), `--night-900` (surfaces), `--night-850` (sidebar).
- The page background is the shared mesh gradient (`--bg-page: var(--bg-mesh), var(--bg-color)`), the same gradient the login page uses at its default strength; `--bg-content` and `--header-bg` are transparent so it shows through.
- Primary button uses `--blue-500` (white text 4.55:1) while links keep the lighter `--accent-primary`.
- Borders and hovers are translucent whites; secondary button colors are translucent whites too.

## UniVerse Space

- Shares one token block with dark (`[data-theme='dark'], [data-theme='universeSpace']`) and overrides only what makes it vivid: `--mesh-alpha: 0.34`, glass cards (`--bg-card` translucent plus `--card-backdrop: blur(14px)`), translucent sidebar and header, a blue-to-purple gradient active-item plate, blue-tinted borders and shadows.
- `[data-theme='dark']` selectors in `Tag`, `Popover`, `LiveCountdown` and `DashboardPage` also match `universeSpace`.
- Dropdown panels and inputs keep the opaque `--bg-surface`; only card rules use the glass token.

## New tokens

- `--bg-mesh` and `--mesh-alpha`: the four-corner mesh gradient built from `--primary-rgb` and `--secondary-rgb`; `LoginPage` now reads `--bg-mesh` (no visual change).
- `--bg-card` (default `var(--bg-surface)`) and `--card-backdrop` (default `none`), applied to the nine card rules (`statCard`, `panel`, `courseCard`, `assignmentCard` and its two variants, `studentCard`, `recentGradesPanel`, `actionCard`).

## Theme list

`APP_THEMES` gains `universeSpace`; the switcher uses the `Orbit` icon and the key `theme.universeSpace` (`uk.ts`, `en.ts`); Storybook gets the theme in its toolbar.

## Verification

Checked in a browser (Playwright, logged-in student): dashboard in dark and Space, the theme dropdown in Space (panel stays opaque), the login page in dark, and the dashboard in light, Karazin Classic and cyberpunk (unchanged).
