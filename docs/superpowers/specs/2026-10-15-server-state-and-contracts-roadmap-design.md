# Server state and shared contracts: roadmap

## Goal

Make TanStack Query the single way `packages/uni-hub` reads and writes server data, and make
`@universe/core` the single description of every API contract shared by the frontend, the backend
DTOs and the Prisma schema. PR #241 (Opportunity contracts) and PR #242 (Opportunities on TanStack
Query) are the pilot. This roadmap covers the rest of the project and the instructions that make
the approach the default.

The design of the pilot is in `2026-10-15-opportunities-tanstack-query-design.md`.

## Principles (become rules in `docs/ai`)

- Server data is read with `useQuery` and written with `useMutation`. No `useState` mirror of API
  data, no `useEffect` fetching, no hand-rolled `loading` / `refetch` helpers.
- A feature keeps its query layer next to it: `queryKeys.ts` (key factory, every key starts with
  the feature root), `queries.ts` (loaders and `queryOptions`, errors propagate), `cache.ts` (plain
  functions that take a `QueryClient`). Behavior is tested through these plain functions because
  `uni-hub` tests run in vitest's `node` environment without jsdom.
- Mutations return the invalidation promise from `onSuccess`; optimistic updates keep a snapshot and
  restore or invalidate only for the last pending mutation.
- A failed load with no cached data shows an error state with retry; a failed background refetch
  keeps the cached data.
- Every API shape used by more than one package lives in `packages/core` as
  `types/<domain>.ts` plus, for closed sets of values, `constants/<domain>.ts`. Domain files are
  imported by path (`@core/types/<domain>`); `packages/core` forbids barrel files. Backend DTO
  classes `implements` the core types, and a Prisma-backed value set gets a drift test.
- Query cache entries are not user-scoped, so the client is cleared whenever a session ends.

## Stack

All PRs are stacked with `gh stack`, each branch on top of the previous one, and each PR targets
the branch below it. `develop` receives them in order.

| PR  | Branch (prefix)                           | Scope                                                                                                                                                            |
| --- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `refactor/opportunities-shared-contracts` | Opportunity contracts in core (#241)                                                                                                                             |
| 2   | `refactor/opportunities-tanstack-query`   | Opportunities on TanStack Query (#242)                                                                                                                           |
| 3   | `docs/server-state-and-contracts-rules`   | Update `docs/ai` with the rules above; commit this roadmap spec, the pilot spec and every plan                                                                   |
| 4   | `refactor/moodle-shared-contracts`        | Moodle gateway and auth contracts in core; DTOs implement them; drift between frontend types and backend responses is found and fixed                            |
| 5   | `refactor/course-and-assignments-queries` | `CourseContents`, `useAssignmentStatuses`, `AssignmentModal` on TanStack Query                                                                                   |
| 6   | `refactor/dashboard-data-queries`         | `useDashboardData` (seven Moodle requests, offline snapshot) on TanStack Query with persistence                                                                  |
| 7   | `refactor/auth-session-mutations`         | Login, Google login, link and unlink Moodle, logout as mutations; clear the query cache when a session ends (also closes the cross-user cache risk left by #242) |

Plans: `docs/superpowers/plans/2026-10-15-docs-server-state-rules.md` (PR 3),
`2026-10-15-moodle-shared-contracts.md` (PR 4), `2026-10-15-course-and-assignments-queries.md`
(PR 5), `2026-10-15-dashboard-data-queries.md` (PR 6), `2026-10-15-auth-session-mutations.md`
(PR 7). Plans for PRs 4 to 7 are written against the code after #242; the executor re-checks the
file anchors before each task.

## Known risk carried by the pilot

#242 does not clear the query cache when a session ends without a page reload
(`router.push('/login')` after a 401 and in `DashboardPage.handleLogout`).
A different user signing in within the same browser tab can see the previous user's cached opportunities
until the cache is explicitly cleared or garbage-collected (`gcTime`). PR 7 fixes it; until then it is listed in the #242 description.

## Out of scope

- An `ApiClient` base class (`docs/ai/api-and-config.md`); it is a separate transport refactor.
- Generating clients or types from OpenAPI.
- Server Components data fetching and Server Actions.
- Real-time updates between users.
