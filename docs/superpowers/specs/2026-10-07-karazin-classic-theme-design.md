# Karazin Classic Theme and Region Background Tokens

Date: 2026-10-07

## Goal

Add a fourth theme, `karazinClassic`, to the `uni-hub` portal: a dark navy sidebar, a white header and a light content area with white cards, as in the reference screenshot (Notion task "Add classic Karazin design theme").

To make this possible, extend the design tokens so that the page, content area, cards, sidebar and header each get their own background token. Every background token holds a CSS `background` value, so it accepts a color or a gradient. The planned gradient tasks (light, dark, cyberpunk, "Karazin gold gradient") then only need new token values.

## Scope

In scope:

- Region tokens in `packages/ui/vars.scss` (table below).
- The `karazinClassic` theme: palette, overrides, chart tokens.
- Wiring the tokens into `DashboardPage.module.scss`, `html, body` and the login page background.
- A single `APP_THEMES` source of truth for the theme list; switcher entry, icon, i18n keys, Storybook toolbar entry.

Out of scope:

- Gradient values for the other themes and the gold gradient theme.
- Sidebar section labels, a logo inside the header, uppercase button text.
- Any change to light, dark or cyberpunk appearance.

## Region tokens

Defaults live in the `:root, [data-theme='light']` block and equal what each region uses today, so existing themes do not change visually. Dark and cyberpunk inherit them through their existing `--bg-*` overrides; the only per-theme region value is `--sidebar-text-active`.

| Token                          | Default                                                         | Consumer                                            |
| ------------------------------ | --------------------------------------------------------------- | --------------------------------------------------- |
| `--bg-page`                    | `var(--bg-color)`                                               | `html, body`, `.layout`                             |
| `--bg-content`                 | `var(--neutral-surface)`                                        | `.content`                                          |
| `--sidebar-bg`                 | `var(--bg-surface)`                                             | `.sider`                                            |
| `--sidebar-border`             | `var(--border-color)`                                           | `.sider`, `.brand`, `.siderFooter`                  |
| `--sidebar-text`               | `var(--text-secondary)`                                         | `.navItem`, footer buttons, switchers               |
| `--sidebar-text-strong`        | `var(--text-primary)`                                           | `.brand`, hover states, Moodle status link          |
| `--sidebar-text-active`        | `var(--blue-700)` (dark: `--white-10`, cyberpunk: `--blue-400`) | `.active`                                           |
| `--sidebar-control`            | `var(--accent-primary)`                                         | collapse button                                     |
| `--sidebar-control-hover`      | `var(--accent-primary-hover)`                                   | collapse button hover                               |
| `--sidebar-item-hover-bg`      | `var(--bg-hover)`                                               | hover of footer buttons, switchers, collapse button |
| `--sidebar-item-active-bg`     | `color-mix(in srgb, var(--accent-primary) 18%, transparent)`    | `.activePill`                                       |
| `--sidebar-item-active-accent` | `transparent`                                                   | left border of `.activePill`                        |
| `--header-bg`                  | `var(--bg-color)`                                               | `.header`                                           |
| `--header-border`              | `var(--border-color)`                                           | `.header`                                           |

There is no `--bg-card`: cards keep `--bg-surface`. Karazin classic makes the cards white by setting `--bg-surface` to white and `--bg-content` to light gray, so no extra token is needed. The sidebar's chevrons read an optional `--chevron-color` (fallback `--text-secondary`) that `.siderFooter` sets to `--sidebar-text`.

Consumers use `background:` (not `background-color:`) so gradients work. The mesh-gradient `.page` and the login page keep their own `background-color` plus `background-image` layering and do not read `--bg-page` yet.

The per-theme `.active` color blocks in `DashboardPage.module.scss` (`:global([data-theme='light']) .active`, etc.) are deleted; `--sidebar-text-active` replaces them. The values they set today move into the matching theme blocks so light, dark and cyberpunk keep their current active-item colors.

## Theme `karazinClassic`

- New `--karazin-*` primitives in `vars.scss`, next to `--cyberpunk-*`: navy, blue, gold, light gray. Values are sampled from the reference screenshot (sidebar `#142545`, primary and active pill `#203979`, content `#f5f7fb`); the gold `#e0b04a` is an approximation.
- Overrides semantic tokens (`--neutral-*`, `--accent-*`, `--btn-*`, `--bg-*`, `--text-*`, `--border-color`, `--focus-ring-color`, `--bg-hover`, `*-rgb` channels) for a light page.
- Region tokens: navy `--sidebar-bg`, light `--sidebar-text` and `--sidebar-text-active`, a lighter blue `--sidebar-item-active-bg`, gold `--sidebar-item-active-accent`, `--sidebar-border` as a translucent light line; `--bg-content` light gray, `--bg-card` white, white header.
- `--font-family-heading` set to a system serif stack (`Georgia, 'Times New Roman', serif`); `--font-heading` shorthand follows. No new web font. Precedent: cyberpunk overrides the same token.
- `--chart-*` tokens are not overridden: they alias `--accent-primary` and the semantic tokens, so charts follow the palette.
- No hardcoded hex outside `vars.scss` (design-system rule).

## Theme list as one source of truth

Today the theme list is repeated in `AppTheme`, the stored-value check in `ThemeContext.tsx`, and the icon and key maps in `ThemeSwitcher.tsx`.

- `ThemeContext.tsx` exports `APP_THEMES` (const array); `AppTheme` is derived from it; the stored-value check uses `APP_THEMES.includes`.
- `ThemeSwitcher.tsx` iterates `APP_THEMES`; icon map and key map remain `Record<AppTheme, ...>`, so TypeScript fails if a theme is missing.
- Icon for the new theme: `GraduationCap` (lucide-react).
- i18n: `theme.karazinClassic` in `uk.ts` and `en.ts`.
- Storybook: add the theme to the toolbar in `packages/ui/.storybook/preview.tsx`.

## Verification

- `pnpm lint`, `pnpm lint:style`, `pnpm typecheck`, `pnpm test`, `pnpm build` pass with zero warnings; prettier passes on changed files.
- No unit tests for tokens or constants (repository rule). Existing tests keep passing.
- Visual check in the browser, all four themes on the dashboard, plus login: light, dark and cyberpunk look the same as before; Karazin classic matches the reference (navy sidebar, gold active bar, white cards on light gray, serif headings), including focus rings and chart colors.

## Risks

- The Karazin sidebar is dark inside a light theme: any sidebar child that reads global `--text-*` or `--border-color` would be unreadable. Mitigation: all sidebar styles read `--sidebar-*` tokens, including `.brand`, footer buttons and the Moodle status link; verify in the browser.
- `html, body` switches from `background-color` to `background`; check there is no flash or scroll-area mismatch.
