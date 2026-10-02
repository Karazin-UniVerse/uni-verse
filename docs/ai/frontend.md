# Frontend (Next.js and React)

## Server vs client components

Prioritize React Server Components. Use client components (`"use client"`) only when interactivity or browser APIs (`useState`, `useEffect`, `window`) are required.

## Component decomposition

- Components over ~150-200 lines, or with several distinct UI sections (cards, grids, feeds, action panels), MUST be split into focused subcomponents. Examples: `StudentCard`, `StatCardGrid`, `UpcomingEventsList`; `DeanContactModal` into `DeanContactInfo` and `DeanTopicChips`.
- Complex stateful logic, data fetching, localStorage caching and lifecycle listeners MUST be extracted into custom hooks (for example `useDashboardData`, `useAssignmentStatuses`).
- Keep pages and tab views declarative and thin: layout composition only.
- Never let a component become a monolith that mixes data fetching, caching, several UI sections and inline business math.
- Helper placement rules: [code-style](code-style.md#reuse-before-writing-dry).

## Localization (i18n)

- Zero hardcoded strings in the UI. All user-facing text (headings, button labels, tooltips, placeholders, toast notifications, aria-labels) goes through translation keys: `useLanguage().formatMessage('some.key')`.
- Define every key in both `packages/uni-hub/i18n/locales/uk.ts` and `packages/uni-hub/i18n/locales/en.ts`, satisfying `Record<TranslationKey, string>`. Keep the two files in sync.
- `@universe/ui` components stay language-agnostic: no hardcoded Ukrainian or English text. Accessibility labels come in as props (for example `closeLabel?: string`), and the consumer supplies the localized value.

## Responsive breakpoints

- Never use magic numbers (`768`) or string literals (`'md'`) for breakpoints in TypeScript logic. Use the `BREAKPOINTS` map from `@core/constants/breakpoints` (numbers: `xs 480`, `sm 640`, `md 768`, `lg 1024`, `xl 1280`, `xxl 1536`; `Breakpoint` is `keyof typeof BREAKPOINTS`).
- Observe breakpoints with `useMediaQuery` from `packages/uni-hub/hooks/useMediaQuery.ts`:

```ts
import { BREAKPOINTS } from '@core/constants/breakpoints';

const isMobile = useMediaQuery('less', BREAKPOINTS.md);
const isDesktop = useMediaQuery('wider', BREAKPOINTS.lg);
```

- `BREAKPOINTS` is the single source of truth. Do not create a second breakpoint object next to it.
- In SCSS use the mixins from `@universe/ui/breakpoints.scss`:

```scss
@use '@universe/ui/breakpoints.scss' as *;

.container {
  @include narrower-than('md') {
    flex-direction: column;
  }

  @include wider-than('lg') {
    max-width: 1200px;
  }
}
```

## SSR safety and hydration

- No window initializers in `useState`; they cause hydration mismatches. Use `useMediaQuery` (built on `useSyncExternalStore`) for browser state.

```ts
// ❌ FORBIDDEN
const [isMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);

// ✅ CORRECT
const isMobile = useMediaQuery('less', BREAKPOINTS.md);
```

- No synchronous `setState` directly inside a top-level `useEffect` without an event or subscription (lint rule `react/set-state-in-effect`). Use `useSyncExternalStore` for external browser-state subscriptions.

## Meaningful empty states

When a view supports filters (for example `AssignmentsTab`), distinguish:

1. Filtered empty: «Завдань за обраними фільтрами не знайдено» (neutral prompt).
2. Truly empty: «Ура, всі завдання виконані! 🎉» (celebratory completion).
