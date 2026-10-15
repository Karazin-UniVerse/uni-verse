# Dashboard Data on TanStack Query Implementation Plan (PR 6)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `useDashboardData` (seven parallel Moodle requests, a hand-written "latest request" guard, a `localStorage` snapshot and fallback) with TanStack Query, and drop the `useEffect` in `DashboardPage` that refetches on every filter change.

**Architecture:** One query returns the assembled `DashboardData` (the same `Promise.all` of seven requests and the same `assembleDashboardData`), keyed by the assignment filters, with `keepPreviousData` so changing a filter does not blank the page. The existing snapshot keys in `localStorage` stay: the loader writes the snapshot after a successful load, and the query starts from it as `initialData` with `initialDataUpdatedAt` set to the stored sync time, so a failed load keeps showing the last good data (the offline state). The profile is a second query. A pure function derives `loading`, `isOfflineData`, `hasLoadedOnce` and `lastSyncTime` from the query state so it can be tested without a DOM.

**Tech Stack:** `@tanstack/react-query` v5 (`keepPreviousData`, `initialData`), React 19, Vitest (node env).

**Spec:** `docs/superpowers/specs/2026-10-15-server-state-and-contracts-roadmap-design.md` (row PR 6).

**Prerequisite:** PRs #241, #242, PR 4 (types from `@core/types/moodle`) and PR 5 (`packages/uni-hub/queries/moodle/` exists, `LoadErrorState` is shared) are below this branch. Anchors below were read before they landed; re-run the greps.

## Global Constraints

- Branch `refactor/dashboard-data-queries`, stacked on `refactor/course-and-assignments-queries`.
- Rules in `docs/ai/data-and-contracts.md#server-state-tanstack-query`. Keep the existing `localStorage` keys (`universe_dashboard_data`, `universe_last_sync_time`, `universe_student_profile`) and their helpers so existing sessions keep their snapshot.
- No `useEffect` that fetches or that exists only to refetch on dependency change; side effects of a failed load (toast, redirect) are driven by the query error state, once per failure.
- No aliases or shims; delete `fetchRequestIdRef`, `setData`, `cancelPendingFetch` and every caller. One import per module path, explicit return types for new functions, empty line before `return`, i18n for every string.
- Commit messages follow Conventional Commits and end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Show the diff and wait for approval before each commit (user preference); do not push without being asked.
- Commands run from `/Users/ReDL/Documents/Programming/Projects/uni-verse`. Final pipeline: `pnpm lint`, `pnpm lint:style`, `pnpm typecheck`, `pnpm test`, `pnpm build`, prettier on changed files.

## Review Focus

- A failed load with a stored snapshot keeps showing the snapshot, flags the offline state and shows one info toast (not one per render); a failed load with no snapshot shows the load error once.
- A 401 clears the session storage, shows the session-expired toast once and redirects to login; it is not retried.
- Changing the sort order, date range or "hide completed" filter shows the previous data until the new data arrives (no blank page, no spinner flash) and does not refetch when the same filters come back within the stale time.
- A manual refresh shows the sync success toast only when the load succeeded.
- After "unlink Moodle" no dashboard request is made and no old data is shown; after "link Moodle" the data loads.
- When the Moodle integration flag is off, no request is made.
- The unread notification count and event data come from the contract types fixed in PR 4.

## File Structure

| File (under `packages/uni-hub/`)                                 | Responsibility                                           |
| ---------------------------------------------------------------- | -------------------------------------------------------- |
| `queries/moodle/queryKeys.ts`, `queries.ts` (modify)             | Dashboard and profile keys and query options             |
| `views/dashboard/hooks/dashboard-state.ts` + `.test.ts` (create) | Pure derivation of loading, offline, sync time           |
| `views/dashboard/hooks/useDashboardData.ts` (rewrite)            | `useQuery` wrapper with side effects of failures         |
| `views/dashboard/hooks/helpers.ts` (modify)                      | Remove what the query replaces; keep snapshot helpers    |
| `views/DashboardPage.tsx` (modify)                               | Use the new hook; remove the filter effect and `setData` |

---

### Task 1: Dashboard and profile queries

**Files:** `queries/moodle/queryKeys.ts`, `queries/moodle/queries.ts`, `queries/moodle/queries.test.ts`.

**Interfaces:**

- Consumes: `moodleApi.getCourses`, `getGrades`, `getAssignments`, `getEvents`, `getNotifications`, `getStatistics`, `getProfile`; `buildAssignmentParams`, `assembleDashboardData`, `persistDashboardSnapshot`, `syncStudentProfile`, `isUnauthorizedError`, `clearUserSessionStorage` from `views/dashboard/hooks/helpers.ts`.
- Produces: `moodleKeys.dashboard(filters: DashboardFilters)`, `moodleKeys.profile()`; `loadDashboardData(filters: DashboardFilters): Promise<DashboardData>`; `dashboardQueryOptions(filters)`; `profileQueryOptions()`; type `DashboardFilters = { sortOrder: 'asc' | 'desc'; dateFrom: string; dateTo: string; hideCompleted: boolean }` (the existing `BuildAssignmentParamsOptions` is reused instead of declaring a second type).

- [ ] **Step 1: Write the failing tests**

In `queries/moodle/queries.test.ts` add (spying on `moodleApi` methods, real `QueryClient`):

1. `loadDashboardData` assembles the six responses into `DashboardData` (courses, grades from `data.grades`, assignments, events, notifications with `unreadCount` taken from `unreadcount`, statistics) and calls `getAssignments` with the params built from the filters.
2. A successful load writes the snapshot (stub `localStorage` with `vi.stubGlobal` as `helpers.test.ts` does) with the new sync time.
3. When `getCourses` rejects with `new Error('HTTP error 401')`, `loadDashboardData` clears the session storage keys and rethrows.
4. When `getCourses` rejects with a 500 error, the stored snapshot is not touched and the error is rethrown.
   Run `pnpm --filter @universe/uni-hub test -- queries`. Expected: FAIL (functions missing).

- [ ] **Step 2: Implement**

Add to `queryKeys.ts`:

```ts
dashboard: (filters: BuildAssignmentParamsOptions) =>
  [...moodleKeys.all, 'dashboard', filters] as const,
profile: () => [...moodleKeys.all, 'profile'] as const,
```

Add to `queries.ts`:

```ts
export async function loadDashboardData(
  filters: BuildAssignmentParamsOptions,
): Promise<DashboardData> {
  try {
    const responses = await Promise.all([
      moodleApi.getCourses(),
      moodleApi.getGrades(),
      moodleApi.getAssignments(buildAssignmentParams(filters)),
      moodleApi.getEvents(),
      moodleApi.getNotifications(),
      moodleApi.getStatistics(),
    ]);
    const freshData = assembleDashboardData(responses);

    persistDashboardSnapshot(Date.now(), freshData);

    return freshData;
  } catch (error) {
    if (isUnauthorizedError(error)) {
      clearUserSessionStorage();
    }

    throw error;
  }
}

export function dashboardQueryOptions(filters: BuildAssignmentParamsOptions) {
  return queryOptions({
    queryKey: moodleKeys.dashboard(filters),
    queryFn: () => loadDashboardData(filters),
  });
}

export const profileQueryOptions = queryOptions({
  queryKey: moodleKeys.profile(),
  queryFn: async () => {
    const response = await moodleApi.getProfile();

    syncStudentProfile(response.data);

    return response.data;
  },
});
```

The profile was optional in the old code (`getProfile().catch(() => null)`); the profile query is separate so a profile failure never fails the dashboard. Run the tests; Expected: PASS.

- [ ] **Step 3: Commit** (after diff approval): `feat(uni-hub): add dashboard and profile queries`.

---

### Task 2: Pure dashboard state derivation

**Files:** create `views/dashboard/hooks/dashboard-state.ts` and `dashboard-state.test.ts`.

**Interfaces:**

- Produces: `deriveDashboardState(query: { data: DashboardData | undefined; isError: boolean; isFetching: boolean; dataUpdatedAt: number }): { loading: boolean; hasLoadedOnce: boolean; isOfflineData: boolean; lastSyncTime: number | null }`.

- [ ] **Step 1: Write the failing tests**

Cases: no data and fetching gives `loading: true`, `hasLoadedOnce: false`; data present and fetching gives `loading: true` (the page shows the small updating indicator when it has data) and `hasLoadedOnce: true`; data present and `isError` gives `isOfflineData: true`; no data and `isError` gives `isOfflineData: false`; `dataUpdatedAt: 0` gives `lastSyncTime: null`, a positive value is returned as is. Run; Expected: FAIL.

- [ ] **Step 2: Implement**

```ts
import type { DashboardData } from '../types';

export interface DashboardQueryState {
  data: DashboardData | undefined;
  isError: boolean;
  isFetching: boolean;
  dataUpdatedAt: number;
}

export interface DashboardState {
  loading: boolean;
  hasLoadedOnce: boolean;
  isOfflineData: boolean;
  lastSyncTime: number | null;
}

export function deriveDashboardState(query: DashboardQueryState): DashboardState {
  const hasData = query.data !== undefined;

  return {
    loading: query.isFetching,
    hasLoadedOnce: hasData,
    isOfflineData: query.isError && hasData,
    lastSyncTime: query.dataUpdatedAt > 0 ? query.dataUpdatedAt : null,
  };
}
```

Run; Expected: PASS.

- [ ] **Step 3: Commit** (after diff approval): `feat(uni-hub): derive dashboard state from query state`.

---

### Task 3: Rewrite `useDashboardData`

**Files:** `views/dashboard/hooks/useDashboardData.ts`; remove replaced exports from `helpers.ts`.

**Interfaces:**

- Produces: `useDashboardData(options: UseDashboardDataOptions)` returning `{ data, loading, hasLoadedOnce, lastSyncTime, isOfflineData, studentProfile, refresh }` where `refresh(): Promise<void>` runs a manual refetch and toasts on success. `UseDashboardDataOptions` keeps `sortOrder`, `dateFrom`, `dateTo`, `hideCompleted`, `onUnauthorized`, `enabled`.

- [ ] **Step 1: Write the hook**

```ts
'use client';

import { useEffect } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useToast } from '@una';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { dashboardQueryOptions, profileQueryOptions } from '@uni-hub/queries/moodle/queries';
import { deriveDashboardState } from './dashboard-state';
import {
  buildFallbackData,
  getInitialSyncTime,
  isMoodleUnlinked,
  isUnauthorizedError,
  loadCachedDashboardData,
} from './helpers';
import type { DashboardData } from '../types';
```

Body outline (write it out in full when implementing, each piece below is the whole behavior):

- `const snapshot = loadCachedDashboardData()` read once with `useState(() => ...)` (no window access during SSR: the helper already guards with try/catch and `typeof window`).
- `const query = useQuery({ ...dashboardQueryOptions(filters), enabled, placeholderData: keepPreviousData, initialData: snapshot ? { ...EMPTY_DASHBOARD_DATA, ...snapshot } : undefined, initialDataUpdatedAt: getInitialSyncTime() ?? undefined })`.
- `const profileQuery = useQuery({ ...profileQueryOptions, enabled })`; `studentProfile = profileQuery.data ?? null`.
- `const state = deriveDashboardState(query)`; when `state.isOfflineData`, `data = buildFallbackData({ cachedData: query.data, previousData: EMPTY_DASHBOARD_DATA, hideCompleted, dateFrom, dateTo })`, otherwise `query.data ?? EMPTY_DASHBOARD_DATA`.
- One `useEffect` keyed on `query.errorUpdatedAt` reacts to a failure once: skip when `isMoodleUnlinked()`; if `isUnauthorizedError(query.error)` show `dashboard.sessionExpired` and call `onUnauthorized()`; else if data exists show `dashboard.offlineNotice` (info) else show `dashboard.loadError`. The effect calls no `setState`.
- `refresh` is `async () => { const result = await query.refetch(); if (!result.isError) toast.success(formatMessage('dashboard.syncSuccess')); }`.
- `EMPTY_DASHBOARD_DATA` is a module constant with `courses: []`, `grades: []`, `assignments: []`, `events: []`, `notifications: []`, `unreadCount: 0`, `statistics: null` (it replaces the three inline copies, including the one in `DashboardPage`).

- [ ] **Step 2: Delete what the query replaces**

Remove `fetchRequestIdRef`, `fetchData`, `cancelPendingFetch`, `setData`, `setStudentProfile`, `getInitialDashboardData` and `getInitialHasLoadedOnce` from the hook file. In `helpers.ts` remove only helpers that have no remaining caller (`grep -rn "<name>" packages/uni-hub` for each); keep the ones used by the loader and their tests.

- [ ] **Step 3: Verify**

`pnpm --filter @universe/uni-hub typecheck` will fail at `DashboardPage.tsx` until Task 4; that is expected, do not commit between Task 3 and Task 4.

---

### Task 4: `DashboardPage` and Moodle link wiring

**Files:** `views/DashboardPage.tsx`, `views/dashboard/hooks/useMoodleLink.ts` (callers only).

- [ ] **Step 1: Use the new hook**

Destructure `{ data, loading, hasLoadedOnce, lastSyncTime, isOfflineData, studentProfile, refresh }`. Delete the effect with the `eslint-disable-next-line react-hooks/exhaustive-deps` that calls `fetchData()` and `cancelPendingFetch()` on every filter change: the query key carries the filters now. Pass `enabled: features.isMoodleIntegrationEnabled && isMoodleLinked && isLoggedIn()` (move the `useMoodleLink` call above the data hook or lift `isMoodleLinked` so both are declared before use). Replace `setStudentProfile` use (initial profile seeding) with `placeholderData: getInitialUserProfile()` on the profile query, and `activeStudentProfile = studentProfile ?? getInitialUserProfile() ?? fallbackStudentProfile`.

- [ ] **Step 2: Link and unlink**

`onLinkSuccess` calls `void queryClient.invalidateQueries({ queryKey: moodleKeys.all })`. `onUnlinkSuccess` calls `queryClient.removeQueries({ queryKey: moodleKeys.all })` (this cancels in-flight requests and drops the old data) and clears the stored snapshot (`universe_dashboard_data`, `universe_last_sync_time`) via an existing helper. Replace the inline empty-data object with `EMPTY_DASHBOARD_DATA`.

- [ ] **Step 3: Refresh button**

`handleRefresh` becomes `void invalidateOpportunities(queryClient); void refresh();`.

- [ ] **Step 4: Verify and commit** (after diff approval)

`pnpm --filter @universe/uni-hub typecheck && pnpm --filter @universe/uni-hub test && pnpm lint`. Existing tests for `helpers.ts` and `useMoodleLink` must still pass; update only tests whose subject was deleted. Commit (Tasks 3 and 4 together): `refactor(uni-hub): load dashboard data with TanStack Query`.

---

### Task 5: Full verification and handoff

- [ ] **Step 1: Run the pipeline** (`pnpm lint`, `pnpm lint:style`, `pnpm typecheck`, `pnpm test`, `pnpm build`, prettier on changed files). Expected: zero errors and zero warnings.
- [ ] **Step 2: Whole-branch review** by a fresh reviewer on the most capable model with the Review Focus above; fix Critical and Important findings with a failing test first.
- [ ] **Step 3: Report**, saying plainly whether the offline path (stop the backend, reload with a stored snapshot) and the filter changes were checked in a browser; they need a Moodle login. Ask before pushing and `gh stack add refactor/dashboard-data-queries`.
