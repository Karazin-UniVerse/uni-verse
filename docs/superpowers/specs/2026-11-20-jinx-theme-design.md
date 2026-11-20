# Jinx Theme

Date: 2026-11-20

## Goal

Add a `jinx` theme (Notion task 251: "Add new theme - Jinx") inspired by Jinx (Arcane / League of Legends) and the neon-graffiti Minesweeper reference: a deep Zaun midnight-plum canvas with neon chalk graffiti doodles, intense hot-pink and electric-cyan dual glows, expressive poster display headings with chromatic neon split shadows, edgy industrial corners, and high-contrast lavender-white typography.

## Theme

- Dark base: joins `dark`, `universeSpace`, and `karazinGold` in the shared dark token block and overrides the Jinx-specific palette, radii, typography, and surfaces in `[data-theme='jinx']`.
- Color scheme: mapped to `'dark'` in `THEME_COLOR_SCHEME` so shared dark rules (`Tag`, `Popover`, `LiveCountdown`, offline banner) apply automatically via `[data-color-scheme='dark']`.
- Palette: deep Zaun midnight-navy void (`--jinx-void: #070b18`) and cobalt surface (`--jinx-surface: #0e1529`), crisp ice-white primary text (`--jinx-text: #f0f6ff`), cool steel-blue secondary text (`--jinx-text-muted: #9eb6d9`), electric Jinx blue (`--jinx-blue-300..500`), blazing hot pink (`--jinx-pink-300..600`), electric cyan (`--jinx-cyan-300..400`), and chemtech acid lime (`--jinx-lime-400`).
- Contrast: primary buttons use saturated neon magenta-pink (`--jinx-pink-500: #cc1466`, hover `#e31b74`, active `#a60f52`) with white text (`>= 4.6:1` WCAG AA across states); borders, secondary accents, focus rings, and chart lead series use electric Jinx blue (`--jinx-blue-300` / `--jinx-blue-400`).
- Graffiti backdrop & surfaces: `--bg-page` layers a fixed SVG Arcane graffiti wall (Fishbones shark jaws, Monkey Bomb, skull & crossbones, crazy X-eyed bunny, broken heart, tally marks, 5-point star, crosshair, lightning bolt, and canonical LoL Jinx quotes such as `"RULES ARE MADE TO BE BROKEN..."`, `"JINX? STANDS FOR JINX!"`, `"I'M CRAZY! GOT A DOCTOR'S NOTE."`, `"STAND STILL! I'M TRYING TO SHOOT YOU!"`, and `"SAY HELLO TO MY FRIENDS!"`) over four-corner electric-blue and hot-pink radial glows; sapphire glass cards use edgy industrial radii (`2px`/`4px`/`8px`), electric-blue neon borders, and dual blue+pink hover blooms; cobalt sidebar active items get a pink-to-blue neon gradient plate.
- Typography: loads `Rubik_Spray_Paint` (headings) and `Rubik_Dirt` (background graffiti quotes, both weight 400, Latin + Cyrillic, `preload: false`) in `layout.tsx`, with headings in toxic electric cyan (`--jinx-cyan-400`) and no glow (`--heading-shadow: none`).
- Component accents: `[data-theme='jinx']` enhances `Button` (pink/cyan neon bloom), `ActionCard` (alternating hot-pink and electric-cyan hover borders and glows), `Chart` (neon pink/cyan/lime series with drop-shadow glow), and `Slider` (pink track with glowing cyan thumb).
- Integration: registered in `APP_THEMES` and `THEME_COLOR_SCHEME`, added to the pre-hydration `THEME_INIT_SCRIPT` in `layout.tsx`, wired into `ThemeSwitcher` with the `Bomb` icon and `theme.jinx` (`uk.ts`, `en.ts`), and added to the Storybook theme toolbar.
