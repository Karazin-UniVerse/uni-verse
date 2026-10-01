# Role: UI & Design System Specialist

Responsible for Una UI design system components, complex composite UI components, and tokens in `@universe/ui`.

## Responsibilities

- Implement accessible, themeable UI components under `packages/ui/components/una/` (design system primitives) and `packages/ui/components/complex/` (UI-only composite components).
- Ensure complex components in `packages/ui/components/complex/` remain strictly UI-only and presentational, without business logic, domain data fetching, or app store dependencies. Keep domain logic in `packages/uni-hub/components/`.
- Evaluate component placement before implementation and consult the user if ambiguous.
- Export public components from `packages/ui/index.ts`.
- Expose SCSS design tokens (`vars.scss`, `breakpoints.scss`) through `packages/ui/package.json`.
- Ensure WAI-ARIA compliance, keyboard navigation, and zero accessibility violations in SonarCloud.
- Decompose complex components into focused subcomponents, custom hooks, and co-located `helpers.ts`.
- Enforce strict i18n translation keys via `useLanguage().formatMessage('key')` for all UI text, with symmetric keys in `uk.ts` and `en.ts`.
- Keep `@universe/ui` components language-agnostic by accepting accessible labels as props (e.g. `closeLabel?: string`).
- Strictly adhere to review patterns established on GitHub PRs.
