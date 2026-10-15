# Opportunities: shared contracts and TanStack Query

## Goal

Make the Opportunities data flow correct and effective without manual refetch plumbing, and make
the frontend and backend share one description of the Opportunity contract. The work is the first
step of a wider migration of server state to TanStack Query; other areas migrate in later PRs.

## Problems today

- Opportunity types and request DTOs are written three times: `packages/uni-hub/types.ts`,
  `packages/uni-hub/services/api.opportunities.ts` and the backend DTO classes in
  `packages/backend/opportunities/dto/`. Nothing checks that they agree. The moderate action union
  is repeated as a literal in the API client and as `ModerateAction` in a backend DTO file.
- Server state lives in `useAsyncList` (four `useState` lists with manual `refetch`). Every
  mutation must be told which lists to refresh, so `onCreated`, `onUpdated`, `onModerated`,
  `refetchOpportunities` and `refreshTrigger` are threaded through three hooks and `DashboardPage`.
- `useAsyncList` turns load errors into an empty list, so a failed request looks like "no items".
- Applying to an opportunity does not refresh "My applications".
- Each refetch sets `loading` back to `true`, so lists flash a spinner while data is already shown.

## Decisions

- Types are shared through `@universe/core` (hand-written contract, not generated from OpenAPI).
- TanStack Query (`@tanstack/react-query` v5) owns all server state of the Opportunities tab.
- Delivery is two stacked PRs. PR 2 targets the PR 1 branch and is retargeted to `develop` once
  PR 1 merges.

## Stack

| PR  | Branch                                    | Base                                      |
| --- | ----------------------------------------- | ----------------------------------------- |
| 1   | `refactor/opportunities-shared-contracts` | `develop`                                 |
| 2   | `refactor/opportunities-tanstack-query`   | `refactor/opportunities-shared-contracts` |

## PR 1: shared contracts

### Core

- `packages/core/constants/opportunities.ts`: const objects with derived types (never `enum`, see
  [quality](../../ai/quality.md)): `OPPORTUNITY_STATUS`, `OPPORTUNITY_LIFECYCLE`,
  `OPPORTUNITY_PAYMENT_TYPE`, `OPPORTUNITY_APPLICATION_STATUS`, `OPPORTUNITY_MODERATE_ACTION`, with
  types `OpportunityStatus`, `OpportunityLifecycle`, `OpportunityPaymentType`,
  `OpportunityApplicationStatus`, `OpportunityModerateAction`.
- `packages/core/types/opportunities.ts`: `Opportunity`, `OpportunityApplication`,
  `OpportunityOwner`, `CreateOpportunityDto`, `UpdateOpportunityDto`, `ApplyOpportunityDto`,
  `GetOpportunitiesParams`. Dates stay `string` because they arrive as JSON. Re-exported from
  `packages/core/types/index.ts` with `export *`.
- Unit tests are not written for types and constants. One type-level check lives in the backend
  (below).

### Backend

- DTO classes `implements` the matching core request types. `FindOpportunitiesDto`,
  `ChangeOpportunityStatusDto`, `ChangeLifecycleStateDto` and `ModerateOpportunityDto` use the core
  constants; `ModerateAction` is removed from the DTO file.
- A compile-time check in a backend spec file asserts that each Prisma enum
  (`OpportunityStatus`, `OpportunityLifecycleState`, `PaymentType`, `ApplicationStatus`) has
  exactly the values of the matching core constant, in both directions. Adding a value to the
  Prisma schema without core (or the reverse) fails `pnpm typecheck`.

### Frontend

- Remove the Opportunity block from `packages/uni-hub/types.ts`. Every import (hooks, modals, tab
  components, `packages/ui` complex components, stories) moves to `@core/types` and
  `@core/constants/opportunities`. No aliases or re-exports are left behind.
- `api.opportunities.ts` imports the request types from core instead of declaring them, and uses
  `OpportunityModerateAction` instead of the inline union.

### Result

Behavior is unchanged. The PR is a pure type and constant move plus the Prisma drift check.

## PR 2: TanStack Query

### Setup

- Add `@tanstack/react-query` to `packages/uni-hub`.
- `Providers` in `packages/uni-hub/app/providers.tsx` creates one `QueryClient` per browser session
  (`useState(() => new QueryClient(...))`) and wraps the tree in `QueryClientProvider`.
  Defaults: `staleTime` 30 s; `retry` skips 4xx responses.

### Keys and queries

- `opportunities/queryKeys.ts` with `opportunityKeys.all`, `.catalog(params)`, `.mine()`,
  `.applications()`, `.moderation()`. Every key starts with `opportunityKeys.all`.
- `useOpportunitiesData` keeps its public role (active sub-tab, search, payment filter, derived
  lists) but each list is a `useQuery` that is `enabled` only for the active sub-tab. The search
  and payment filter stay client-side as today.
- `useAsyncList`, `AsyncList` and all `setItems` usages are removed.
- Query functions are the existing `load*` functions; errors are no longer swallowed, so each tab
  renders an error state with a retry button (`refetch`). New translation keys are added to `uk.ts`
  and `en.ts`.

### Mutations

Each mutation is a `useMutation` whose `onSuccess` calls
`queryClient.invalidateQueries({ queryKey: opportunityKeys.all })`. The success and error toasts
stay where they are.

| Hook                   | Mutations                                                                 |
| ---------------------- | ------------------------------------------------------------------------- |
| `useCreateOpportunity` | create, update; `creating` becomes `isPending`                            |
| `useOpportunityDetail` | send to review, change lifecycle; keep `patchSelected` for the open modal |
| `useModeration`        | moderate; `submitting` becomes `isPending`; optimistic removal from queue |
| `useApplicantActions`  | apply, withdraw; both now refresh "My applications"                       |

- Moderation removes the item from the cached queue in `onMutate`, restores the snapshot in
  `onError`, and invalidates in `onSettled`.
- Callbacks `onCreated`, `onUpdated`, `onModerated`, `refetchOpportunities`, `refetchActiveList`
  and the `refreshTrigger` prop are deleted. Creating still switches to the "My opportunities"
  sub-tab through the mutation's `onSuccess` in `OpportunitiesTab`.
- The dashboard refresh button calls `invalidateQueries({ queryKey: opportunityKeys.all })` when
  the Opportunities tab is active, alongside the existing `fetchData(true)`. `DashboardPage` no
  longer owns `opportunitiesRefreshTrigger`.

### Loading state

`isLoading` (first load) drives the skeleton and `isFetching` drives the small "updating"
indicator, so cached data stays visible during background refetches.

## Testing

- PR 1: the Prisma/core drift check; existing backend and frontend suites keep passing.
- PR 2: hook tests wrapped in a fresh `QueryClientProvider` per test: invalidation after create,
  update, moderate, apply and withdraw; optimistic removal and rollback in moderation; error state
  instead of an empty list; refresh button invalidates only when the Opportunities tab is active.
- Both PRs pass the full pipeline from [workflow](../../ai/workflow.md): `pnpm lint`,
  `pnpm lint:style`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and prettier on changed files.
  PR 1 also runs `pnpm --filter @universe/ui build-storybook` because complex components in
  `packages/ui` change imports.

## Out of scope

- Migrating Moodle dashboard data (`fetchData`), assignments or other tabs.
- Generating a client from OpenAPI.
- Real-time updates between users (polling, SSE); `refetchOnWindowFocus` is the only freshness
  mechanism added.
- Persisting the query cache.
