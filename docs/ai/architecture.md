# Architecture

## Packages and dependency rules

```
uni-verse/
├── packages/
│   ├── core/       # @universe/core — contracts, domain models, grade logic, constants, utils
│   │   └── types/  # import as '@universe/core/types'
│   ├── ui/         # @universe/ui — Una design system (@una), SCSS tokens, Storybook
│   ├── backend/    # @universe/backend — NestJS gateway over the Moodle LMS
│   ├── database/   # @universe/database — Prisma ORM data layer
│   └── uni-hub/    # @universe/uni-hub — Next.js 16 App Router student portal
├── configs/        # shared oxlint, ESLint and TypeScript presets
└── tests/e2e/      # standalone requirement-driven Vitest suite
```

- **`@universe/core`**: Zero internal dependencies. Holds all shared types, DTO contracts, constants and grading math. Shared types and DTOs used by both frontend and backend live in `@universe/core/types`.
- Never create a standalone `packages/types` package. An empty `packages/types` directory may exist locally; it is not a package.
- **`@universe/ui`**: consumed by frontend packages.
- **`@universe/backend`**: all DTOs and models must align with `@universe/core/types`.
- **`@universe/uni-hub`**: prefer React Server Components, see [frontend](frontend.md).

### Core layout

- One file per domain, grouped by kind: `constants/grades.ts`, `constants/breakpoints.ts`, `utils/grades.ts`, `utils/browser.ts`. Import the specific module (`@universe/core/utils/browser`, or the `@core/utils/browser` alias inside uni-hub), never the package root.
- No barrel `index.ts` in `constants/` and `utils/`. Barrels hide where code lives and force a split later; add domain files from the start.
- Types, constants and functions never share a file (except types derived directly from a constant, such as `type GradesThreshold = (typeof GRADES_THRESHOLD)[keyof typeof GRADES_THRESHOLD]`). Other types stay under `types/`.
- Tests sit next to the code in a sibling `tests/` directory (`utils/tests/grades.test.ts`).
- Do not write unit tests for types and constants; test behavior only.

## Monorepo rules

- Keep packages isolated. Never use relative paths such as `../../../` to reach code outside the current workspace; import through the package name (for example `import { Button } from '@una'`).
- Workspace dependencies in `package.json` must use `"workspace:*"`.

## UI components (`packages/ui`)

- All shared UI components live under `packages/ui/components/`.
- Una design system components (`packages/ui/components/una/`) are imported through the `@una` alias, for example `import { Button, Tag } from '@una';`.
- Do NOT export Una components from the `@universe/ui` root (`packages/ui/index.ts`). That file is reserved for non-Una exports such as complex components and hooks.

### Three placement tiers

| Tier                                                           | Contains                                                                                                                         | Rules                                                                                                                                         |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Design system primitives — `packages/ui/components/una/`       | Atomic elements: buttons, inputs, modal, toast, tag                                                                              | Language-agnostic, zero application logic, imported via `@una`                                                                                |
| Complex UI-Only Components — `packages/ui/components/complex/` | Composite presentational components built from Una primitives                                                                    | **Strictly UI-only**: no business logic, no domain data fetching, no application store or context; driven purely by props and event callbacks |
| Application components — `packages/uni-hub/components/`        | Business logic, domain workflows, store subscriptions (for example `useGamificationStore`), API calls (Moodle auth, assignments) | Compose and reuse `complex` components from `@universe/ui` instead of embedding composite presentation layouts inside logic components        |

Before creating any component, decide which tier fits. If the placement is ambiguous, ask the user before writing code.

## Storybook

- Stories are written only for components in `packages/ui` (`@universe/ui`). Writing stories in `packages/uni-hub`, `packages/backend` or any other package is STRICTLY PROHIBITED.
- Sidebar sections: Una components go under `Una/*` (for example `title: 'Una/Buttons/Button'`); complex components go under `Complex/*` (for example `title: 'Complex/ExampleComponent'`).
- Use Component Story Format 3 with `satisfies Meta<typeof Component>` and `StoryObj<typeof meta>`. No untyped parameters (`any`) in story templates.
- Procedure for writing a story: the `storybook-story-writing` skill.

## Backend (NestJS)

- Follow Clean Architecture.
- Controllers only handle HTTP routing, request parsing and response formatting.
- Services contain all business logic.
- Inject Prisma as a service (managed through `@universe/database`).
- Use dependency injection and keep modules highly cohesive.
