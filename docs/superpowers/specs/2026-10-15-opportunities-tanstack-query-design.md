# Opportunities: shared contracts and TanStack Query

## Goal

Make the Opportunities data flow correct and effective without manual refetch plumbing, and make
the frontend and backend share one description of the Opportunity contract. The work is the first
step of a wider migration of server state to TanStack Query; other areas migrate in later PRs.

## Problems today

- Opportunity types and request DTOs are written three times: `packages/uni-hub/types.ts`,
  `packages/uni-hub/services/api.opportunities.ts` and the backend DTO classes in
  `packages/backend/opportunities/dto/`. Nothing checks that they agree. The moderate action union
  is repeated as a literal in the API client, as `ModerationAction` in the frontend and as
  `ModerateAction` in a backend DTO file.
- Server state lives in `useAsyncList` (four `useState` lists with manual `refetch`). Every
  mutation must be told which lists to refresh, so `onCreated`, `onUpdated`, `onModerated`,
  `refetchOpportunities` and `refreshTrigger` are threaded through three hooks and `DashboardPage`.
- `useAsyncList` and `useApplicants` turn load errors into an empty list, so a failed request looks
  like "no items".
- Applying to an opportunity does not refresh "My applications".
- Each refetch sets `loading` back to `true`, so lists flash a spinner while data is already shown.

## Decisions

- Types are shared through `@universe/core` (hand-written contract, not generated from OpenAPI).
- TanStack Query (`@tanstack/react-query` v5) owns all server state of the Opportunities tab.
- Delivery is two stacked PRs. PR 2 targets the PR 1 branch and is retargeted to `develop` once
  PR 1 merges.
- Existing frontend type names are kept (`OpportunityAppStatus`, not a rename to
  `OpportunityApplicationStatus`) so PR 1 stays a move, not a rename. Request contracts are named
  `*Request` in core so they do not clash with the backend DTO classes that implement them.

## Stack

| PR  | Branch                                    | Base                                      |
| --- | ----------------------------------------- | ----------------------------------------- |
| 1   | `refactor/opportunities-shared-contracts` | `develop`                                 |
| 2   | `refactor/opportunities-tanstack-query`   | `refactor/opportunities-shared-contracts` |

Implementation plans: `docs/superpowers/plans/2026-10-15-opportunities-shared-contracts.md` and
`docs/superpowers/plans/2026-10-15-opportunities-tanstack-query.md`.

## PR 1: shared contracts

### Core

- `packages/core/constants/opportunities.ts`: const objects with derived types (never `enum`, see
  [quality](../../ai/quality.md)): `OPPORTUNITY_STATUS`, `OPPORTUNITY_LIFECYCLE`,
  `OPPORTUNITY_PAYMENT_TYPE`, `OPPORTUNITY_APP_STATUS`, `OPPORTUNITY_MODERATE_ACTION`, with types
  `OpportunityStatus`, `OpportunityLifecycle`, `OpportunityPaymentType`, `OpportunityAppStatus`,
  `OpportunityModerateAction`.
- `packages/core/types/opportunities.ts`: `Opportunity`, `OpportunityApplication`,
  `OpportunityOwner`, `CreateOpportunityRequest`, `UpdateOpportunityRequest`,
  `ApplyOpportunityRequest`, `GetOpportunitiesParams`. Dates stay `string` because they arrive as
  JSON. Imported by its own path (`@core/types/opportunities`, `@universe/core/types/opportunities`): `packages/core` forbids barrel files, so it is not re-exported from `types/index.ts`.
- Types and constants get no unit tests of their own; the Prisma drift test below covers the
  constants.

### Backend

- DTO classes `implements` the matching core request types. `FindOpportunitiesDto` implements
  `GetOpportunitiesParams`. `ModerateOpportunityDto` uses `OpportunityModerateAction` from core;
  `ModerateAction` is removed from the DTO file and the service uses
  `OPPORTUNITY_MODERATE_ACTION`.
- A backend spec asserts that each Prisma enum (`OpportunityStatus`, `OpportunityLifecycleState`,
  `PaymentType`, `ApplicationStatus`) has exactly the values of the matching core constant. Adding
  a value to the Prisma schema without core (or the reverse) fails `pnpm test`.

### Frontend

- Remove the Opportunity block from `packages/uni-hub/types.ts`. Every import moves to
  `@core/types/opportunities` (interfaces) and `@core/constants/opportunities` (unions). No aliases or re-exports
  are left behind. `ModerationAction` in `opportunities/types.ts` is replaced by
  `OpportunityModerateAction`.
- `api.opportunities.ts` imports the request types from core instead of declaring them, and uses
  `OpportunityModerateAction` instead of the inline union. Its change is limited to types, so the
  `ApiClient` migration from [api-and-config](../../ai/api-and-config.md#api-clients) is not part
  of this stack; the PR description mentions it.

### Result

Behavior is unchanged. The PR is a pure type and constant move plus the Prisma drift test.

## PR 2: TanStack Query

### Setup

- Add `@tanstack/react-query` to `packages/uni-hub`.
- `Providers` in `packages/uni-hub/app/providers.tsx` creates one `QueryClient` per browser session
  (`useState(() => new QueryClient(...))`) and wraps the tree in `QueryClientProvider`.
  Defaults: `staleTime` 30 s (`QUERY_STALE_TIME_MS` in `packages/uni-hub/constants/query.ts`) and
  `retry: false`, because `request()` in `api.request.ts` already retries twice with backoff.

### Keys and queries

- `opportunities/queryKeys.ts` with `opportunityKeys.all`, `.catalog()`, `.mine()`,
  `.applications()`, `.moderation()` and `.applicants(opportunityId)`. Every key starts with
  `opportunityKeys.all`.
- `opportunities/queries.ts` holds the query option factories and the `load*` functions that move
  out of `useOpportunitiesData`. Errors are no longer swallowed.
- `useOpportunitiesData` keeps its public role (active sub-tab, search, payment filter, derived
  lists) but each list is a `useQuery`. Catalog, my opportunities and my applications are `enabled`
  only for the active sub-tab; the moderation queue is `enabled` for moderators so the tab badge
  stays current. Search and payment filter stay client-side as today.
- `useApplicants` loads the applications of the opened opportunity with a `useQuery` keyed by
  `opportunityKeys.applicants(id)`.
- `useAsyncList`, `AsyncList` and all `setItems` / `setApplications` usages are removed.
- Failed loads render an error state with a retry button (`LoadErrorState`) in the four tabs and in
  the applicants modal. New translation keys are added to `uk.ts` and `en.ts`.

### Mutations

Each mutation is a `useMutation` whose `onSuccess` returns
`invalidateOpportunities(queryClient)` (`invalidateQueries({ queryKey: opportunityKeys.all })`), so
`mutateAsync` settles after active lists are fresh. Toasts stay where they are.

| Hook                   | Mutations                                                                 |
| ---------------------- | ------------------------------------------------------------------------- |
| `useCreateOpportunity` | create, update; `creating` becomes `isPending`                            |
| `useOpportunityDetail` | send to review, change lifecycle; keep `patchSelected` for the open modal |
| `useModeration`        | moderate; `submitting` becomes `isPending`; optimistic removal from queue |
| `useApplicantActions`  | apply, withdraw; both now refresh "My applications"                       |
| `useApplicants`        | update application status                                                 |

- Moderation removes the item from the cached queue in `onMutate`, restores the snapshot in
  `onError`, and invalidates in `onSettled`. The cache logic lives in plain functions in
  `opportunities/cache.ts` so it can be unit tested without a DOM.
- Callbacks `onCreated` (kept only for the sub-tab switch), `onUpdated`, `onModerated`,
  `refetchOpportunities`, `refetchActiveList` and the `refreshTrigger` prop are deleted.
- The dashboard refresh button calls `invalidateOpportunities(queryClient)` alongside the existing
  `fetchData(true)`. With no Opportunities query mounted it only marks the cache stale, so no tab
  check is needed. `DashboardPage` no longer owns `opportunitiesRefreshTrigger`.

### Loading state

`isLoading` (first load) drives the spinner, so cached data stays visible during background
refetches and the spinner no longer flashes.

## Testing

- PR 1: the Prisma/core drift spec; existing backend and frontend suites keep passing.
- PR 2: `uni-hub` tests run in vitest's `node` environment and the package has no jsdom or React
  Testing Library, so behavior is tested through plain functions with a real `QueryClient`:
  `cache.test.ts` (invalidation marks every opportunity query stale, optimistic removal and
  rollback of the moderation queue) and `queries.test.ts` (a failed load rejects instead of
  returning an empty list). The existing `renderToString` tests cover the new error state. Hook
  wiring is verified by `pnpm typecheck` and a manual run of the app.
- Both PRs pass the full pipeline from [workflow](../../ai/workflow.md): `pnpm lint`,
  `pnpm lint:style`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and prettier on changed files.

## Out of scope

- Migrating Moodle dashboard data (`fetchData`), assignments or other tabs.
- Generating a client from OpenAPI.
- Moving `request` into an `ApiClient` base class.
- Real-time updates between users (polling, SSE); `refetchOnWindowFocus` is the only freshness
  mechanism added.
- Persisting the query cache.
