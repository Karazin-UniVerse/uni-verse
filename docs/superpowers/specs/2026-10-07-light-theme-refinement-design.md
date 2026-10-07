# Light Theme Refinement

Date: 2026-10-07

## Goal

The light theme looked flat and washed out: cards and the content area were the same gray (1.00:1), secondary text was 3.3:1 on white (below the 4.5:1 minimum), placeholders 1.5:1 and borders 1.19:1. This change makes it crisper without touching any other theme.

## Changes

All overrides live in one block, `:root:not([data-theme]), [data-theme='light']`, placed after the shared defaults. The shared defaults stay as they were, so dark, Space, cyberpunk and Karazin Classic (which inherit some of them) do not change. Verified by comparing computed styles of the sidebar, header, content, cards, buttons and links in those four themes before and after: zero differences.

- Slate palette (`--slate-50..900`): cool grays with a blue undertone.
- White surfaces (`--neutral-surface`) on a `--slate-50` canvas, so cards separate from the page; the canvas carries the shared mesh gradient (`--bg-page: var(--bg-mesh), var(--slate-50)`) and the content area is transparent, as in the dark themes.
- Text: primary `--slate-900` (17.9:1), secondary `--slate-500` (5.8:1 on white), disabled and placeholder `--slate-400`.
- Borders `--slate-300`; hover and secondary-button fills from slate-100..300.
- Cards: border `rgb(15 23 42 / 10%)` and a two-layer soft shadow, stronger on hover.
- White header; the active nav item gets a 3px accent bar (`--sidebar-item-active-accent: var(--accent-primary)`).

## Verification

Dashboard and login page in the light theme checked in a browser (Playwright, logged-in student); lint, typecheck and tests pass.
