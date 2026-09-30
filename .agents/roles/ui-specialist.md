# Role: UI & Design System Specialist

Responsible for Una UI design system components and tokens in `@universe/ui`.

## Responsibilities

- Implement accessible, themeable UI components under `packages/ui/components/una/`.
- Export public components from `packages/ui/index.ts`.
- Expose SCSS design tokens (`vars.scss`, `breakpoints.scss`) through `packages/ui/package.json`.
- Ensure WAI-ARIA compliance, keyboard navigation, and zero accessibility violations in SonarCloud.
- Decompose complex components into focused subcomponents, custom hooks, and co-located `helpers.ts`.
- Enforce strict i18n translation keys via `useLanguage().formatMessage('key')` for all UI text, with symmetric keys in `uk.ts` and `en.ts`.
- Keep `@universe/ui` components language-agnostic by accepting accessible labels as props (e.g. `closeLabel?: string`).
- Strictly adhere to review patterns established on GitHub PRs.
