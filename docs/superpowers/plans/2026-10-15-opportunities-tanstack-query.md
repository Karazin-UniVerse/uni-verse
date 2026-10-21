# Opportunities TanStack Query Implementation Plan (PR 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hand-rolled `useAsyncList` and the refetch callbacks of the Opportunities tab with TanStack Query: cached queries, mutations that invalidate one key prefix, optimistic moderation, and a real error state.

**Architecture:** A `QueryClientProvider` wraps the app. `opportunities/queryKeys.ts` owns the keys, `queries.ts` the query options, and `cache.ts` the plain cache functions (invalidate, optimistic removal and rollback) that mutations call. Hooks keep their public role but use `useQuery` and `useMutation`; mutations return `invalidateOpportunities(queryClient)` from `onSuccess`. `uni-hub` tests run in vitest's `node` environment, so behavior is tested through the plain functions with a real `QueryClient`.

**Tech Stack:** `@tanstack/react-query` v5, React 19, Next.js 16, Vitest 5 (node env, `renderToString`).

**Spec:** `docs/superpowers/specs/2026-10-15-opportunities-tanstack-query-design.md` (section "PR 2: TanStack Query").

**Prerequisite:** PR 1 (`docs/superpowers/plans/2026-10-15-opportunities-shared-contracts.md`) is complete. This plan imports `Opportunity`, `OpportunityApplication`, `CreateOpportunityRequest`, `UpdateOpportunityRequest`, `ApplyOpportunityRequest` from `@core/types/opportunities` and `OPPORTUNITY_STATUS`, `OPPORTUNITY_PAYMENT_TYPE`, `OpportunityAppStatus`, `OpportunityLifecycle`, `OpportunityModerateAction`, `OpportunityPaymentType` from `@core/constants/opportunities`.

## Global Constraints

- Branch `refactor/opportunities-tanstack-query`, created from `refactor/opportunities-shared-contracts`. The PR targets that branch and is retargeted to `develop` after PR 1 merges.
- Do not add compatibility aliases or shims. Delete `useAsyncList`, `AsyncList`, every `setItems` and `setApplications` usage, `refetchActiveList`, `refetchOpportunities`, `onUpdated`, `onModerated` and `refreshTrigger`.
- One `import` statement per module path; inline `type` modifier for mixed imports. Descriptive names, explicit return types on functions, empty line before `return` and between logical blocks, no nested ternaries in JSX.
- Every UI string goes through `formatMessage`; add each new key to both `uk.ts` and `en.ts`.
- No magic values: the stale time is the constant `QUERY_STALE_TIME_MS` in `packages/uni-hub/constants/query.ts`.
- SCSS uses spacing tokens on the 4/8 grid (`var(--space-16)`, `var(--space-48)`); no raw pixel values.
- `QueryClient` defaults: `staleTime` `QUERY_STALE_TIME_MS` (30 s) and `retry: false`, because `request()` already retries twice with backoff.
- Components stay in their current tier; no Storybook stories outside `packages/ui`.
- Commit messages follow Conventional Commits and end with the trailer `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Before every commit show the user `git diff --stat` and the diff, and wait for approval (user preference). Do not push or open the PR without being asked.
- Every command runs from the repo root.
- Verification pipeline before the PR: `pnpm lint`, `pnpm lint:style`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and prettier on changed files, all with zero errors and zero warnings.

## Review Focus

- A background refetch fails while cached data exists: the list keeps showing the cached items, not the error state (Task 4, `toListState`).
- The reject confirmation fails: the modal stays open and the optimistically removed item returns to the queue (Task 2 rollback test, Task 4 `useModeration`).
- Two quick moderations in a row: `onMutate` cancels in-flight queue fetches so a stale response cannot resurrect a removed item (Task 2 `cancelQueries`).
- A non-moderator never requests the moderation queue (Task 4, `enabled: isModerator`).
- After creating an opportunity the user lands on "My opportunities", whose query was just invalidated and must fetch fresh data, and the catalog shows it when opened (Task 4 manual check).
- Applying to an opportunity now refreshes "My applications" (the old code never did); withdrawing refreshes it from the server instead of patching locally (Task 5 manual check).
- A failed list load shows the retry state and the retry button refetches (Task 4 test and manual check).

## File Structure

| File (under `packages/uni-hub/`)                                                                          | Responsibility                                                                   |
| --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `constants/query.ts` (create)                                                                             | `QUERY_STALE_TIME_MS`                                                            |
| `app/providers.tsx` (modify)                                                                              | `QueryClientProvider` with one client per session                                |
| `views/dashboard/tabs/opportunities/queryKeys.ts` (create)                                                | `opportunityKeys`                                                                |
| `views/dashboard/tabs/opportunities/queries.ts` (create)                                                  | Query options and loaders                                                        |
| `views/dashboard/tabs/opportunities/cache.ts` (create)                                                    | `invalidateOpportunities`, `removeFromModerationQueue`, `restoreModerationQueue` |
| `views/dashboard/tabs/opportunities/test-utils.ts` (create)                                               | `buildOpportunity` fixture shared by the tests                                   |
| `views/dashboard/tabs/opportunities/cache.test.ts` (create)                                               | Cache function tests                                                             |
| `views/dashboard/tabs/opportunities/queries.test.ts` (create)                                             | Query function tests                                                             |
| `views/dashboard/tabs/opportunities/LoadErrorState.tsx` (create)                                          | Error message with retry button                                                  |
| `views/dashboard/tabs/opportunities/LoadErrorState.test.ts` (create)                                      | Render test                                                                      |
| `views/dashboard/tabs/opportunities/useOpportunitiesData.ts` (rewrite)                                    | Four `useQuery` calls, `useAsyncList` removed                                    |
| `views/dashboard/tabs/opportunities/use*.ts` (modify)                                                     | Create, detail, moderation, applicant actions and applicants hooks               |
| `views/dashboard/tabs/opportunities/TabStateWrapper.tsx` + 4 tabs + `modals/ApplicantsModal.tsx` (modify) | `isError` and `onRetry` props                                                    |
| `views/dashboard/tabs/OpportunitiesTab.tsx`, `views/DashboardPage.tsx` (modify)                           | Wiring; remove `refreshTrigger`                                                  |
| `i18n/locales/uk.ts`, `i18n/locales/en.ts` (modify)                                                       | Two error keys                                                                   |

---

### Task 1: Dependency, provider and stale-time constant

**Files:**

- Modify: `packages/uni-hub/package.json`, `pnpm-lock.yaml`
- Create: `packages/uni-hub/constants/query.ts`
- Modify: `packages/uni-hub/app/providers.tsx`

**Interfaces:**

- Produces: `QUERY_STALE_TIME_MS: 30000`; a `QueryClientProvider` above `FeatureToggleProvider`, so every hook can call `useQueryClient()`.

- [ ] **Step 1: Create the branch and add the dependency**

```bash
git checkout -b refactor/opportunities-tanstack-query
pnpm --filter @universe/uni-hub add @tanstack/react-query
pnpm exec prettier --write pnpm-lock.yaml
```

Expected: `packages/uni-hub/package.json` lists `@tanstack/react-query` with a `^5` range in `dependencies`.

- [ ] **Step 2: Add the constant**

`packages/uni-hub/constants/query.ts`:

```ts
export const QUERY_STALE_TIME_MS = 30_000;
```

- [ ] **Step 3: Add the provider**

Replace `packages/uni-hub/app/providers.tsx` with:

```tsx
'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { QUERY_STALE_TIME_MS } from '@uni-hub/constants/query';
import { FeatureToggleProvider } from '@uni-hub/features';
import { LanguageProvider } from '@uni-hub/i18n/LanguageContext';
import { ThemeProvider } from '@uni-hub/theme/ThemeContext';
import { ToastProvider } from '@una';

export function Providers({ children }: Readonly<{ children: React.ReactNode }>) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: QUERY_STALE_TIME_MS, retry: false } },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <FeatureToggleProvider>
        <LanguageProvider>
          <ThemeProvider>
            <ToastProvider>{children}</ToastProvider>
          </ThemeProvider>
        </LanguageProvider>
      </FeatureToggleProvider>
    </QueryClientProvider>
  );
}
```

- [ ] **Step 4: Verify**

Run: `pnpm --filter @universe/uni-hub typecheck && pnpm --filter @universe/uni-hub test`
Expected: both succeed; behavior of the app is unchanged.

- [ ] **Step 5: Commit** (after diff approval)

```bash
git add packages/uni-hub/package.json pnpm-lock.yaml packages/uni-hub/constants/query.ts packages/uni-hub/app/providers.tsx
git commit -m "chore(uni-hub): add TanStack Query provider"
```

---

### Task 2: Query keys, queries and cache functions

**Files:**

- Create: `queryKeys.ts`, `queries.ts`, `cache.ts`, `test-utils.ts`, `cache.test.ts`, `queries.test.ts` in `packages/uni-hub/views/dashboard/tabs/opportunities/`

**Interfaces:**

- Produces:
  - `opportunityKeys.{ all, catalog(), mine(), applications(), moderation(), applicants(opportunityId: string) }`
  - `catalogQueryOptions`, `myOpportunitiesQueryOptions`, `myApplicationsQueryOptions`, `moderationQueueQueryOptions` (each a `queryOptions(...)` object) and `loadApplicants(opportunityId: string): Promise<OpportunityApplication[]>`
  - `invalidateOpportunities(queryClient: QueryClient): Promise<void>`
  - `removeFromModerationQueue(queryClient: QueryClient, opportunityId: string): Promise<Opportunity[] | undefined>` returning the previous queue
  - `restoreModerationQueue(queryClient: QueryClient, previousQueue: Opportunity[] | undefined): void`
  - `buildOpportunity(id: string): Opportunity` (test fixture)

- [ ] **Step 1: Write the fixture and the failing tests**

`test-utils.ts`:

```ts
import type { Opportunity } from '@core/types/opportunities';

export function buildOpportunity(id: string): Opportunity {
  return {
    id,
    title: `Opportunity ${id}`,
    description: 'Description',
    ownerContactInfo: 'owner@example.com',
    status: 'READY_FOR_REVIEW',
    lifecycleState: 'START',
    paymentType: 'UNPAID',
    ownerId: 'owner-1',
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
  };
}
```

`cache.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import type { Opportunity } from '@core/types/opportunities';
import {
  invalidateOpportunities,
  removeFromModerationQueue,
  restoreModerationQueue,
} from './cache';
import { opportunityKeys } from './queryKeys';
import { buildOpportunity } from './test-utils';

describe('opportunities cache', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('invalidateOpportunities', () => {
    it('marks every opportunity query stale and leaves other queries alone', async () => {
      queryClient.setQueryData(opportunityKeys.catalog(), []);
      queryClient.setQueryData(opportunityKeys.mine(), []);
      queryClient.setQueryData(opportunityKeys.applications(), []);
      queryClient.setQueryData(opportunityKeys.moderation(), []);
      queryClient.setQueryData(opportunityKeys.applicants('opp-1'), []);
      queryClient.setQueryData(['courses'], []);

      await invalidateOpportunities(queryClient);

      expect(queryClient.getQueryState(opportunityKeys.catalog())?.isInvalidated).toBe(true);
      expect(queryClient.getQueryState(opportunityKeys.mine())?.isInvalidated).toBe(true);
      expect(queryClient.getQueryState(opportunityKeys.applications())?.isInvalidated).toBe(true);
      expect(queryClient.getQueryState(opportunityKeys.moderation())?.isInvalidated).toBe(true);
      expect(queryClient.getQueryState(opportunityKeys.applicants('opp-1'))?.isInvalidated).toBe(
        true,
      );
      expect(queryClient.getQueryState(['courses'])?.isInvalidated).toBe(false);
    });
  });

  describe('removeFromModerationQueue', () => {
    it('removes the opportunity from the cached queue and returns the previous queue', async () => {
      const first = buildOpportunity('opp-1');
      const second = buildOpportunity('opp-2');

      queryClient.setQueryData<Opportunity[]>(opportunityKeys.moderation(), [first, second]);

      const previousQueue = await removeFromModerationQueue(queryClient, 'opp-1');

      expect(previousQueue).toEqual([first, second]);
      expect(queryClient.getQueryData(opportunityKeys.moderation())).toEqual([second]);
    });

    it('returns undefined and caches nothing when the queue was never loaded', async () => {
      const previousQueue = await removeFromModerationQueue(queryClient, 'opp-1');

      expect(previousQueue).toBeUndefined();
      expect(queryClient.getQueryData(opportunityKeys.moderation())).toBeUndefined();
    });
  });

  describe('restoreModerationQueue', () => {
    it('puts the previous queue back after a failed moderation', async () => {
      const first = buildOpportunity('opp-1');

      queryClient.setQueryData<Opportunity[]>(opportunityKeys.moderation(), [first]);

      const previousQueue = await removeFromModerationQueue(queryClient, 'opp-1');

      restoreModerationQueue(queryClient, previousQueue);

      expect(queryClient.getQueryData(opportunityKeys.moderation())).toEqual([first]);
    });

    it('does nothing without a snapshot', () => {
      restoreModerationQueue(queryClient, undefined);

      expect(queryClient.getQueryData(opportunityKeys.moderation())).toBeUndefined();
    });
  });
});
```

`queries.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { opportunitiesApi } from '@uni-hub/services/api.opportunities';
import {
  catalogQueryOptions,
  loadApplicants,
  moderationQueueQueryOptions,
  myOpportunitiesQueryOptions,
} from './queries';
import { buildOpportunity } from './test-utils';

describe('opportunities queries', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
  });

  afterEach(() => {
    queryClient.clear();
    vi.restoreAllMocks();
  });

  it('loads the catalog as a list', async () => {
    const opportunity = buildOpportunity('opp-1');

    vi.spyOn(opportunitiesApi, 'getOpportunities').mockResolvedValue({ data: [opportunity] });

    await expect(queryClient.fetchQuery(catalogQueryOptions)).resolves.toEqual([opportunity]);
  });

  it('requests only opportunities that wait for review for the moderation queue', async () => {
    const getOpportunities = vi
      .spyOn(opportunitiesApi, 'getOpportunities')
      .mockResolvedValue({ data: [] });

    await queryClient.fetchQuery(moderationQueueQueryOptions);

    expect(getOpportunities).toHaveBeenCalledWith({ status: 'READY_FOR_REVIEW' });
  });

  it('rejects instead of returning an empty list when the request fails', async () => {
    vi.spyOn(opportunitiesApi, 'getMyOpportunities').mockRejectedValue(new Error('HTTP error 500'));

    await expect(queryClient.fetchQuery(myOpportunitiesQueryOptions)).rejects.toThrow(
      'HTTP error 500',
    );
  });

  it('loads the applications of one opportunity', async () => {
    const getApplications = vi
      .spyOn(opportunitiesApi, 'getOpportunityApplications')
      .mockResolvedValue({ data: [] });

    await expect(loadApplicants('opp-7')).resolves.toEqual([]);
    expect(getApplications).toHaveBeenCalledWith('opp-7');
  });
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `pnpm --filter @universe/uni-hub test -- cache queries`
Expected: FAIL, the modules `./cache`, `./queries` and `./queryKeys` cannot be resolved.

- [ ] **Step 3: Implement the keys**

`queryKeys.ts`:

```ts
export const opportunityKeys = {
  all: ['opportunities'] as const,
  catalog: () => [...opportunityKeys.all, 'catalog'] as const,
  mine: () => [...opportunityKeys.all, 'mine'] as const,
  applications: () => [...opportunityKeys.all, 'applications'] as const,
  moderation: () => [...opportunityKeys.all, 'moderation'] as const,
  applicants: (opportunityId: string) =>
    [...opportunityKeys.all, 'applicants', opportunityId] as const,
};
```

- [ ] **Step 4: Implement the queries**

`queries.ts`:

```ts
import { queryOptions } from '@tanstack/react-query';
import type { Opportunity, OpportunityApplication } from '@core/types/opportunities';
import { OPPORTUNITY_STATUS } from '@core/constants/opportunities';
import { opportunitiesApi } from '@uni-hub/services/api.opportunities';
import { asList } from '@uni-hub/utils/arrays';
import { opportunityKeys } from './queryKeys';

async function loadCatalog(): Promise<Opportunity[]> {
  const response = await opportunitiesApi.getOpportunities();

  return asList(response.data);
}

async function loadMyOpportunities(): Promise<Opportunity[]> {
  const response = await opportunitiesApi.getMyOpportunities();

  return asList(response.data);
}

async function loadMyApplications(): Promise<OpportunityApplication[]> {
  const response = await opportunitiesApi.getMyApplications();

  return asList(response.data);
}

async function loadModerationQueue(): Promise<Opportunity[]> {
  const response = await opportunitiesApi.getOpportunities({
    status: OPPORTUNITY_STATUS.READY_FOR_REVIEW,
  });

  return asList(response.data);
}

export async function loadApplicants(opportunityId: string): Promise<OpportunityApplication[]> {
  const response = await opportunitiesApi.getOpportunityApplications(opportunityId);

  return asList(response.data);
}

export const catalogQueryOptions = queryOptions({
  queryKey: opportunityKeys.catalog(),
  queryFn: loadCatalog,
});

export const myOpportunitiesQueryOptions = queryOptions({
  queryKey: opportunityKeys.mine(),
  queryFn: loadMyOpportunities,
});

export const myApplicationsQueryOptions = queryOptions({
  queryKey: opportunityKeys.applications(),
  queryFn: loadMyApplications,
});

export const moderationQueueQueryOptions = queryOptions({
  queryKey: opportunityKeys.moderation(),
  queryFn: loadModerationQueue,
});
```

- [ ] **Step 5: Implement the cache functions**

`cache.ts`:

```ts
import type { QueryClient } from '@tanstack/react-query';
import type { Opportunity } from '@core/types/opportunities';
import { opportunityKeys } from './queryKeys';

export function invalidateOpportunities(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: opportunityKeys.all });
}

export async function removeFromModerationQueue(
  queryClient: QueryClient,
  opportunityId: string,
): Promise<Opportunity[] | undefined> {
  await queryClient.cancelQueries({ queryKey: opportunityKeys.moderation() });

  const previousQueue = queryClient.getQueryData<Opportunity[]>(opportunityKeys.moderation());

  queryClient.setQueryData<Opportunity[]>(opportunityKeys.moderation(), (queue) =>
    queue?.filter((item) => item.id !== opportunityId),
  );

  return previousQueue;
}

export function restoreModerationQueue(
  queryClient: QueryClient,
  previousQueue: Opportunity[] | undefined,
): void {
  if (!previousQueue) {
    return;
  }

  queryClient.setQueryData<Opportunity[]>(opportunityKeys.moderation(), previousQueue);
}
```

- [ ] **Step 6: Run the tests and see them pass**

Run: `pnpm --filter @universe/uni-hub test -- cache queries && pnpm --filter @universe/uni-hub typecheck`
Expected: all new tests PASS, typecheck clean.

- [ ] **Step 7: Commit** (after diff approval)

```bash
git add packages/uni-hub/views/dashboard/tabs/opportunities
git commit -m "feat(uni-hub): add Opportunities query keys, queries and cache helpers"
```

---

### Task 3: Load error state

**Files:**

- Create: `packages/uni-hub/views/dashboard/tabs/opportunities/LoadErrorState.tsx`, `LoadErrorState.test.ts`
- Modify: `packages/uni-hub/views/dashboard/tabs/OpportunitiesTab.module.scss` (after `.loadingBox`, line ~1075)
- Modify: `packages/uni-hub/i18n/locales/uk.ts`, `packages/uni-hub/i18n/locales/en.ts`

**Interfaces:**

- Consumes: `useLanguage().formatMessage`.
- Produces: `LoadErrorState: React.FC<{ onRetry: () => void }>` and the keys `opportunities.error.load`, `opportunities.error.retry`.

- [ ] **Step 1: Write the failing test**

`LoadErrorState.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { LanguageProvider } from '@uni-hub/i18n/LanguageContext';
import { LoadErrorState } from './LoadErrorState';

describe('LoadErrorState', () => {
  it('shows the failure message and a retry button', () => {
    const html = renderToString(
      React.createElement(
        LanguageProvider,
        null,
        React.createElement(LoadErrorState, { onRetry: () => {} }),
      ),
    );

    expect(html).toContain('Не вдалося завантажити дані');
    expect(html).toContain('Спробувати знову');
  });
});
```

Run: `pnpm --filter @universe/uni-hub test -- LoadErrorState`
Expected: FAIL, `./LoadErrorState` cannot be resolved.

- [ ] **Step 2: Add the translation keys**

In `packages/uni-hub/i18n/locales/uk.ts` add after the line `'opportunities.toast.moderateError': 'Помилка модерації',`:

```ts
  'opportunities.error.load': 'Не вдалося завантажити дані',
  'opportunities.error.retry': 'Спробувати знову',
```

In `packages/uni-hub/i18n/locales/en.ts` add after the line `'opportunities.toast.moderateError': 'Moderation error',`:

```ts
  'opportunities.error.load': 'Failed to load data',
  'opportunities.error.retry': 'Try again',
```

- [ ] **Step 3: Add the style**

In `OpportunitiesTab.module.scss`, directly after the `.loadingBox { ... }` block:

```scss
.errorState {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-16);
  padding: var(--space-48) 0;
}
```

- [ ] **Step 4: Implement the component**

`LoadErrorState.tsx`:

```tsx
'use client';

import React from 'react';
import { Button, Empty } from '@una';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import styles from '../OpportunitiesTab.module.scss';

export interface LoadErrorStateProps {
  onRetry: () => void;
}

export const LoadErrorState: React.FC<LoadErrorStateProps> = ({ onRetry }) => {
  const { formatMessage } = useLanguage();

  return (
    <div className={styles.errorState}>
      <Empty description={formatMessage('opportunities.error.load')} />
      <Button type="button" variant="secondary" size="small" onClick={onRetry}>
        {formatMessage('opportunities.error.retry')}
      </Button>
    </div>
  );
};
```

- [ ] **Step 5: Verify**

Run: `pnpm --filter @universe/uni-hub test -- LoadErrorState && pnpm --filter @universe/uni-hub typecheck && pnpm lint:style`
Expected: test PASS; typecheck and stylelint clean (the translation key type is derived from the locale files, so a missing key in either file fails typecheck).

- [ ] **Step 6: Commit** (after diff approval)

```bash
git add packages/uni-hub/views/dashboard/tabs packages/uni-hub/i18n/locales
git commit -m "feat(uni-hub): add load error state for Opportunities"
```

---

### Task 4: Move the Opportunities tab to TanStack Query

This task changes the read side and the write side together because `useAsyncList`'s `setItems` and the refetch callbacks only make sense as a pair; the app does not compile in between. Work through the steps in order and run the checks in Step 11.

**Files (all under `packages/uni-hub/views/`):**

- Modify: `dashboard/tabs/opportunities/OpportunitiesSubTabs.test.ts`
- Rewrite: `dashboard/tabs/opportunities/useOpportunitiesData.ts`
- Modify: `dashboard/tabs/opportunities/useApplicants.ts`, `useCreateOpportunity.ts`, `useOpportunityDetail.ts`, `useModeration.ts`, `useApplicantActions.ts`
- Modify: `dashboard/tabs/opportunities/TabStateWrapper.tsx`, `CatalogTab.tsx`, `MyOpportunitiesTab.tsx`, `MyApplicationsTab.tsx`, `ModerationQueueTab.tsx`, `modals/ApplicantsModal.tsx`
- Modify: `dashboard/tabs/OpportunitiesTab.tsx`, `DashboardPage.tsx`

**Interfaces:**

- Consumes: everything produced by Tasks 1 to 3.
- Produces:
  - `useOpportunitiesData(isModerator: boolean)` returns `{ activeSubTab, setActiveSubTab, search, setSearch, paymentFilter, setPaymentFilter, catalog, myOpportunities, myApplications, moderationQueue }` where each list is `ListState<T> = { items: T[]; loading: boolean; isError: boolean; refetch: () => void }`.
  - `useApplicants()` returns `{ isOpen, applications, loading, isError, refetch, open, close, handleUpdateStatus }`.
  - `useCreateOpportunity({ onCreated })`, `useOpportunityDetail()`, `useModeration()`, `useApplicantActions({ currentUser, selectedOpportunity })`.
  - Tab props gain `isError: boolean` and `onRetry: () => void`; `ApplicantsModal` gains the same.

- [ ] **Step 1: Write the failing test for the tab error state**

In `OpportunitiesSubTabs.test.ts` add `isError: false,` and `onRetry: () => {},` right after `loading: false,` in the four `React.createElement(<Tab>, { ... })` calls (`CatalogTab`, `MyOpportunitiesTab`, `MyApplicationsTab`, `ModerationQueueTab`), then add this test inside the `describe` block:

```ts
it('renders the retry state instead of the list when loading failed', () => {
  const html = renderToString(
    React.createElement(
      LanguageProvider,
      null,
      React.createElement(MyOpportunitiesTab, {
        loading: false,
        isError: true,
        onRetry: () => {},
        myOpportunities: [],
        onOpenApplicants: () => {},
        onOpenDetail: () => {},
      }),
    ),
  );

  expect(html).toContain('Не вдалося завантажити дані');
  expect(html).toContain('Спробувати знову');
});
```

Run: `pnpm --filter @universe/uni-hub test -- OpportunitiesSubTabs`
Expected: the new test FAILS (the wrapper ignores `isError`); the existing tests still pass.

- [ ] **Step 2: Rewrite `useOpportunitiesData.ts`**

Replace the whole file with:

```ts
import { useState } from 'react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { Opportunity, OpportunityApplication } from '@core/types/opportunities';
import type { OpportunityPaymentType } from '@core/constants/opportunities';
import { OPPORTUNITY_SUB_TAB, type OpportunitySubTab } from './constants';
import {
  catalogQueryOptions,
  moderationQueueQueryOptions,
  myApplicationsQueryOptions,
  myOpportunitiesQueryOptions,
} from './queries';

export interface ListState<T> {
  items: T[];
  loading: boolean;
  isError: boolean;
  refetch: () => void;
}

function toListState<T>(query: UseQueryResult<T[]>): ListState<T> {
  return {
    items: query.data ?? [],
    loading: query.isLoading,
    isError: query.isError && query.data === undefined,
    refetch: () => {
      void query.refetch();
    },
  };
}

export function useOpportunitiesData(isModerator: boolean) {
  const [activeSubTab, setActiveSubTab] = useState<OpportunitySubTab>(OPPORTUNITY_SUB_TAB.Catalog);
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<OpportunityPaymentType | ''>('');

  const catalog = useQuery({
    ...catalogQueryOptions,
    enabled: activeSubTab === OPPORTUNITY_SUB_TAB.Catalog,
  });
  const myOpportunities = useQuery({
    ...myOpportunitiesQueryOptions,
    enabled: activeSubTab === OPPORTUNITY_SUB_TAB.MyOpportunities,
  });
  const myApplications = useQuery({
    ...myApplicationsQueryOptions,
    enabled: activeSubTab === OPPORTUNITY_SUB_TAB.MyApplications,
  });
  const moderationQueue = useQuery({ ...moderationQueueQueryOptions, enabled: isModerator });

  return {
    activeSubTab,
    setActiveSubTab,
    search,
    setSearch,
    paymentFilter,
    setPaymentFilter,
    catalog: toListState<Opportunity>(catalog),
    myOpportunities: toListState<Opportunity>(myOpportunities),
    myApplications: toListState<OpportunityApplication>(myApplications),
    moderationQueue: toListState<Opportunity>(moderationQueue),
  };
}
```

`isError` is only reported when there is no cached data, so a failed background refetch keeps showing the last good list.

- [ ] **Step 3: Rewrite `useApplicants.ts`**

Replace the whole file with:

```ts
import { useState } from 'react';
import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@una';
import { getErrorMessage } from '@uni-hub/services/api';
import { opportunitiesApi } from '@uni-hub/services/api.opportunities';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import type { Opportunity } from '@core/types/opportunities';
import type { OpportunityAppStatus } from '@core/constants/opportunities';
import { invalidateOpportunities } from './cache';
import { opportunityKeys } from './queryKeys';
import { loadApplicants } from './queries';

interface ApplicationStatusChange {
  applicationId: string;
  status: OpportunityAppStatus;
}

export function useApplicants() {
  const toast = useToast();
  const { formatMessage } = useLanguage();
  const queryClient = useQueryClient();

  const [opportunityId, setOpportunityId] = useState<string | null>(null);

  const applicationsQuery = useQuery({
    queryKey: opportunityKeys.applicants(opportunityId ?? ''),
    queryFn: opportunityId ? () => loadApplicants(opportunityId) : skipToken,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ applicationId, status }: ApplicationStatusChange) =>
      opportunitiesApi.updateApplicationStatus(applicationId, status),
    onSuccess: () => invalidateOpportunities(queryClient),
  });

  const open = (opportunity: Opportunity): void => setOpportunityId(opportunity.id);

  const close = (): void => setOpportunityId(null);

  const handleUpdateStatus = async (
    applicationId: string,
    status: OpportunityAppStatus,
  ): Promise<void> => {
    try {
      await updateStatusMutation.mutateAsync({ applicationId, status });
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, formatMessage('opportunities.toast.statusUpdateError')));
    }
  };

  return {
    isOpen: opportunityId !== null,
    applications: applicationsQuery.data ?? [],
    loading: applicationsQuery.isLoading,
    isError: applicationsQuery.isError,
    refetch: () => {
      void applicationsQuery.refetch();
    },
    open,
    close,
    handleUpdateStatus,
  };
}
```

- [ ] **Step 4: Add `isError` and `onRetry` to the wrapper, the four tabs and the applicants modal**

`TabStateWrapper.tsx`: replace the file with:

```tsx
import React from 'react';
import { Spinner, Empty } from '@una';
import styles from '../OpportunitiesTab.module.scss';
import { LoadErrorState } from './LoadErrorState';

export interface TabStateWrapperProps {
  loading: boolean;
  isError: boolean;
  onRetry: () => void;
  isEmpty: boolean;
  emptyDescription: string;
  children: React.ReactNode;
}

export const TabStateWrapper: React.FC<TabStateWrapperProps> = ({
  loading,
  isError,
  onRetry,
  isEmpty,
  emptyDescription,
  children,
}) => {
  if (loading) {
    return (
      <div className={styles.loadingBox}>
        <Spinner size="large" />
      </div>
    );
  }

  if (isError) {
    return <LoadErrorState onRetry={onRetry} />;
  }

  if (isEmpty) {
    return <Empty description={emptyDescription} />;
  }

  return children;
};
```

In each of `CatalogTab.tsx`, `MyOpportunitiesTab.tsx`, `MyApplicationsTab.tsx`, `ModerationQueueTab.tsx`:

1. add `isError: boolean;` and `onRetry: () => void;` to the props interface right after `loading: boolean;`;
2. add `isError,` and `onRetry,` to the destructured props right after `loading,`;
3. pass `isError={isError}` and `onRetry={onRetry}` to `<TabStateWrapper ... />` right after `loading={loading}`.

`modals/ApplicantsModal.tsx`:

1. add `isError: boolean;` and `onRetry: () => void;` to `ApplicantsModalProps` after `loading: boolean;` and destructure them after `loading,`;
2. add `import { LoadErrorState } from '../LoadErrorState';` after the `ApplicationStatusBadge` import;
3. replace the `if (loading) { ... } else if (applications.length === 0) {` chain head so the error branch comes second:

```tsx
  if (loading) {
    content = (
      <div className={styles.loadingBox}>
        <Spinner size="large" />
      </div>
    );
  } else if (isError) {
    content = <LoadErrorState onRetry={onRetry} />;
  } else if (applications.length === 0) {
```

- [ ] **Step 5: Rewrite `useCreateOpportunity.ts`**

Replace the whole file with:

```ts
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@una';
import { getErrorMessage } from '@uni-hub/services/api';
import { opportunitiesApi } from '@uni-hub/services/api.opportunities';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import type {
  CreateOpportunityRequest,
  Opportunity,
  UpdateOpportunityRequest,
} from '@core/types/opportunities';
import { OPPORTUNITY_PAYMENT_TYPE } from '@core/constants/opportunities';
import { invalidateOpportunities } from './cache';
import type { CreateOpportunityFormData } from './types';

const INITIAL_FORM_DATA: CreateOpportunityFormData = {
  title: '',
  description: '',
  ownerContactInfo: '',
  paymentType: OPPORTUNITY_PAYMENT_TYPE.UNPAID,
  paymentDetails: '',
};

interface OpportunityUpdate {
  id: string;
  request: UpdateOpportunityRequest;
}

export interface UseCreateOpportunityProps {
  onCreated: () => void;
}

export function useCreateOpportunity({ onCreated }: UseCreateOpportunityProps) {
  const toast = useToast();
  const { formatMessage } = useLanguage();
  const queryClient = useQueryClient();

  const [isOpen, setIsOpen] = useState(false);
  const [editingOpportunityId, setEditingOpportunityId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateOpportunityFormData>(INITIAL_FORM_DATA);

  const createMutation = useMutation({
    mutationFn: (request: CreateOpportunityRequest) => opportunitiesApi.createOpportunity(request),
    onSuccess: () => invalidateOpportunities(queryClient),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, request }: OpportunityUpdate) =>
      opportunitiesApi.updateOpportunity(id, request),
    onSuccess: () => invalidateOpportunities(queryClient),
  });

  const openCreate = (): void => {
    setEditingOpportunityId(null);
    setFormData(INITIAL_FORM_DATA);
    setIsOpen(true);
  };

  const openEdit = (opportunity: Opportunity): void => {
    setEditingOpportunityId(opportunity.id);
    setFormData({
      title: opportunity.title,
      description: opportunity.description,
      ownerContactInfo: opportunity.ownerContactInfo || '',
      paymentType: opportunity.paymentType,
      paymentDetails: opportunity.paymentDetails || '',
    });
    setIsOpen(true);
  };

  const close = (): void => {
    setIsOpen(false);
    setEditingOpportunityId(null);
    setFormData(INITIAL_FORM_DATA);
  };

  const handleSubmit = async (event: React.SyntheticEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    try {
      if (editingOpportunityId) {
        await updateMutation.mutateAsync({
          id: editingOpportunityId,
          request: {
            title: formData.title.trim(),
            description: formData.description.trim(),
            ownerContactInfo: formData.ownerContactInfo.trim(),
            paymentType: formData.paymentType,
            paymentDetails:
              (formData.paymentType === OPPORTUNITY_PAYMENT_TYPE.PAID &&
                formData.paymentDetails.trim()) ||
              null,
          },
        });

        toast.success(formatMessage('opportunities.toast.updated'));
        close();
      } else {
        await createMutation.mutateAsync({
          title: formData.title.trim(),
          description: formData.description.trim(),
          ownerContactInfo: formData.ownerContactInfo.trim(),
          paymentType: formData.paymentType,
          paymentDetails: formData.paymentDetails.trim() || undefined,
        });

        toast.success(formatMessage('opportunities.toast.createdDraft'));
        close();
        onCreated();
      }
    } catch (err: unknown) {
      const errorKey = editingOpportunityId
        ? 'opportunities.toast.updateError'
        : 'opportunities.toast.createError';

      toast.error(getErrorMessage(err, formatMessage(errorKey)));
    }
  };

  return {
    isOpen,
    formData,
    setFormData,
    creating: createMutation.isPending || updateMutation.isPending,
    isEdit: editingOpportunityId !== null,
    openCreate,
    openEdit,
    close,
    handleSubmit,
  };
}
```

- [ ] **Step 6: Rewrite `useOpportunityDetail.ts`**

Replace the whole file with:

```ts
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@una';
import { getErrorMessage } from '@uni-hub/services/api';
import { opportunitiesApi } from '@uni-hub/services/api.opportunities';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import type { Opportunity } from '@core/types/opportunities';
import { OPPORTUNITY_STATUS, type OpportunityLifecycle } from '@core/constants/opportunities';
import { invalidateOpportunities } from './cache';

interface LifecycleChange {
  id: string;
  state: OpportunityLifecycle;
}

export function useOpportunityDetail() {
  const toast = useToast();
  const { formatMessage } = useLanguage();
  const queryClient = useQueryClient();

  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const sendToReviewMutation = useMutation({
    mutationFn: (id: string) =>
      opportunitiesApi.changeStatus(id, OPPORTUNITY_STATUS.READY_FOR_REVIEW),
    onSuccess: () => invalidateOpportunities(queryClient),
  });

  const lifecycleMutation = useMutation({
    mutationFn: ({ id, state }: LifecycleChange) => opportunitiesApi.changeLifecycle(id, state),
    onSuccess: () => invalidateOpportunities(queryClient),
  });

  const open = (opportunity: Opportunity): void => {
    setSelectedOpportunity(opportunity);
    setIsOpen(true);
  };

  const patchSelected = (id: string, patch: Partial<Opportunity>): void => {
    setSelectedOpportunity((current) => (current?.id === id ? { ...current, ...patch } : current));
  };

  const handleSendToReview = async (id: string): Promise<void> => {
    try {
      await sendToReviewMutation.mutateAsync(id);
      toast.success(formatMessage('opportunities.toast.sentToReview'));
      patchSelected(id, { status: OPPORTUNITY_STATUS.READY_FOR_REVIEW });
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, formatMessage('opportunities.toast.genericError')));
    }
  };

  const handleLifecycleChange = async (id: string, state: OpportunityLifecycle): Promise<void> => {
    try {
      await lifecycleMutation.mutateAsync({ id, state });
      toast.success(formatMessage('opportunities.toast.stateUpdated'));
      patchSelected(id, { lifecycleState: state });
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, formatMessage('opportunities.toast.genericError')));
    }
  };

  return {
    selectedOpportunity,
    isOpen,
    setIsOpen,
    open,
    handleSendToReview,
    handleLifecycleChange,
  };
}
```

- [ ] **Step 7: Rewrite `useModeration.ts`**

Replace the whole file with:

```ts
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@una';
import { getErrorMessage } from '@uni-hub/services/api';
import { opportunitiesApi } from '@uni-hub/services/api.opportunities';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import type { OpportunityModerateAction } from '@core/constants/opportunities';
import {
  invalidateOpportunities,
  removeFromModerationQueue,
  restoreModerationQueue,
} from './cache';
import type { RejectModalState } from './types';

const CLOSED_REJECT_MODAL: RejectModalState = { open: false, id: null, comment: '' };

const SUCCESS_MESSAGE_KEYS = {
  APPROVE: 'opportunities.toast.approved',
  REJECT: 'opportunities.toast.rejected',
  REQUIRE_CHANGES: 'opportunities.toast.requiresChanges',
} as const;

interface ModerationRequest {
  id: string;
  action: OpportunityModerateAction;
  comment?: string;
}

export function useModeration() {
  const toast = useToast();
  const { formatMessage } = useLanguage();
  const queryClient = useQueryClient();

  const [rejectModal, setRejectModal] = useState<RejectModalState>(CLOSED_REJECT_MODAL);

  const moderateMutation = useMutation({
    mutationFn: ({ id, action, comment }: ModerationRequest) =>
      opportunitiesApi.moderate(id, action, comment),
    onMutate: ({ id }) => removeFromModerationQueue(queryClient, id),
    onError: (_error, _request, previousQueue) =>
      restoreModerationQueue(queryClient, previousQueue),
    onSettled: () => invalidateOpportunities(queryClient),
  });

  const openRejectModal = (id: string): void => setRejectModal({ open: true, id, comment: '' });

  const closeRejectModal = (): void => setRejectModal(CLOSED_REJECT_MODAL);

  const changeRejectComment = (comment: string): void =>
    setRejectModal((current) => ({ ...current, comment }));

  const handleModerate = async (
    id: string,
    action: OpportunityModerateAction,
    comment?: string,
  ): Promise<boolean> => {
    try {
      await moderateMutation.mutateAsync({ id, action, comment });
      toast.success(formatMessage(SUCCESS_MESSAGE_KEYS[action]));

      return true;
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, formatMessage('opportunities.toast.moderateError')));

      return false;
    }
  };

  const handleRejectConfirm = async (
    id: string,
    action: OpportunityModerateAction,
    comment: string,
  ): Promise<void> => {
    if (await handleModerate(id, action, comment)) {
      closeRejectModal();
    }
  };

  return {
    rejectModal,
    submitting: moderateMutation.isPending,
    openRejectModal,
    closeRejectModal,
    changeRejectComment,
    handleModerate,
    handleRejectConfirm,
  };
}
```

- [ ] **Step 8: Rewrite `useApplicantActions.ts`**

Replace the whole file with:

```ts
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@una';
import { getErrorMessage } from '@uni-hub/services/api';
import { opportunitiesApi } from '@uni-hub/services/api.opportunities';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import type { ApplyOpportunityRequest, Opportunity } from '@core/types/opportunities';
import type { CurrentUser } from '@uni-hub/hooks/useCurrentUser';
import { invalidateOpportunities } from './cache';

interface ApplicationSubmission {
  opportunityId: string;
  request: ApplyOpportunityRequest;
}

export interface UseApplicantActionsProps {
  currentUser: CurrentUser;
  selectedOpportunity: Opportunity | null;
}

export function useApplicantActions({
  currentUser,
  selectedOpportunity,
}: UseApplicantActionsProps) {
  const toast = useToast();
  const { formatMessage } = useLanguage();
  const queryClient = useQueryClient();

  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [motivation, setMotivation] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [withdrawApplicationId, setWithdrawApplicationId] = useState<string | null>(null);

  const applyMutation = useMutation({
    mutationFn: ({ opportunityId, request }: ApplicationSubmission) =>
      opportunitiesApi.apply(opportunityId, request),
    onSuccess: () => invalidateOpportunities(queryClient),
  });

  const withdrawMutation = useMutation({
    mutationFn: (applicationId: string) => opportunitiesApi.withdrawApplication(applicationId),
    onSuccess: () => invalidateOpportunities(queryClient),
  });

  const handleApplySubmit = async (event: React.SyntheticEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    if (!selectedOpportunity) return;

    try {
      await applyMutation.mutateAsync({
        opportunityId: selectedOpportunity.id,
        request: {
          applicantName:
            currentUser.name ||
            currentUser.email ||
            formatMessage('opportunities.applyModal.defaultApplicantName'),
          contactInfo: contactInfo.trim() || currentUser.email || '',
          motivation: motivation.trim(),
        },
      });

      setIsApplyOpen(false);
      setMotivation('');
      setContactInfo('');
      toast.success(formatMessage('opportunities.toast.applySuccess'));
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, formatMessage('opportunities.toast.applyError')));
    }
  };

  const handleWithdraw = async (): Promise<void> => {
    if (!withdrawApplicationId) return;

    try {
      await withdrawMutation.mutateAsync(withdrawApplicationId);
      toast.success(formatMessage('opportunities.toast.withdrawn'));
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, formatMessage('opportunities.toast.genericError')));
    } finally {
      setWithdrawApplicationId(null);
    }
  };

  return {
    isApplyOpen,
    setIsApplyOpen,
    motivation,
    setMotivation,
    contactInfo,
    setContactInfo,
    applying: applyMutation.isPending,
    handleApplySubmit,
    withdrawApplicationId,
    setWithdrawApplicationId,
    withdrawing: withdrawMutation.isPending,
    handleWithdraw,
  };
}
```

- [ ] **Step 9: Update `OpportunitiesTab.tsx`**

Apply these edits:

1. Props: replace the interface and the component signature with

```tsx
export interface OpportunitiesTabProps {
  soundEnabled?: boolean;
}

export const OpportunitiesTab: React.FC<OpportunitiesTabProps> = () => {
```

2. Replace the block from `const data = useOpportunitiesData(isModerator);` through the closing of the `React.useEffect` with:

```tsx
const data = useOpportunitiesData(isModerator);
const { activeSubTab, setActiveSubTab } = data;
const detail = useOpportunityDetail();
const create = useCreateOpportunity({
  onCreated: () => setActiveSubTab(OPPORTUNITY_SUB_TAB.MyOpportunities),
});
const applicants = useApplicants();
const applicantActions = useApplicantActions({
  currentUser,
  selectedOpportunity: detail.selectedOpportunity,
});
const moderation = useModeration();
```

3. Pass the new props to the tabs: in `<CatalogTab>` add `isError={data.catalog.isError}` and `onRetry={data.catalog.refetch}`; in `<MyOpportunitiesTab>` use `data.myOpportunities`; in `<MyApplicationsTab>` use `data.myApplications`; in `<ModerationQueueTab>` use `data.moderationQueue` (each right after its `loading=` line).
4. In `<ApplicantsModal>`: replace `onClose={() => applicants.setIsOpen(false)}` with `onClose={applicants.close}` and add `isError={applicants.isError}` and `onRetry={applicants.refetch}` after `loading={applicants.loading}`.

- [ ] **Step 10: Update `DashboardPage.tsx`**

1. Add `import { useQueryClient } from '@tanstack/react-query';` after the `clsx` import and `import { invalidateOpportunities } from './dashboard/tabs/opportunities/cache';` after the `formatLastSync` import.
2. Replace the line `const [opportunitiesRefreshTrigger, setOpportunitiesRefreshTrigger] = useState(0);` with `const queryClient = useQueryClient();`.
3. Replace the `case NAV_KEY.Opportunities:` return with `return <OpportunitiesTab soundEnabled={soundEnabled} />;`.
4. Replace `handleRefresh` with:

```tsx
const handleRefresh = useCallback((): void => {
  void invalidateOpportunities(queryClient);
  void fetchData(true);
}, [queryClient, fetchData]);
```

- [ ] **Step 11: Verify**

```bash
pnpm --filter @universe/uni-hub typecheck
pnpm --filter @universe/uni-hub test
pnpm lint
```

Expected: typecheck clean, all tests PASS including the new error-state test from Step 1, lint clean with zero warnings.

Then confirm nothing old is left:

```bash
grep -rn "useAsyncList\|AsyncList\|refetchOpportunities\|refetchActiveList\|refreshTrigger\|onUpdated\|onModerated\|setItems\|setApplications" packages/uni-hub --include='*.ts' --include='*.tsx' --exclude-dir=node_modules --exclude-dir=.next
```

Expected: no output.

- [ ] **Step 12: Commit** (after diff approval)

```bash
git add packages/uni-hub
git commit -m "refactor(uni-hub): move Opportunities tab to TanStack Query"
```

---

### Task 5: Full verification and handoff

**Files:** none (verification; fix anything the checks flag).

- [ ] **Step 1: Run the full pipeline**

```bash
pnpm lint
pnpm lint:style
pnpm typecheck
pnpm test
pnpm build
git diff --name-only refactor/opportunities-shared-contracts...HEAD | xargs pnpm exec prettier --check
```

Expected: every command exits 0 with zero warnings. Fix prettier findings with `pnpm exec prettier --write` and commit them as `style:` after approval.

- [ ] **Step 2: Walk the pre-commit checklist**

Open `docs/ai/workflow.md#pre-commit-checklist` and confirm each line (no aliases, unused exports removed, every UI string translated, no nested ternaries, vertical spacing).

- [ ] **Step 3: Manual check in the running app**

Start the stack (`pnpm dev`, or the `run` skill) with a moderator account and walk through:

1. Create an opportunity: it appears in "My opportunities" without F5; open "Catalog" after approval and see it there.
2. Edit a draft, send it for review, change a lifecycle state: lists update without F5.
3. As moderator approve one item and reject another with a comment: each leaves the queue immediately and the badge count drops; stop the backend and try again to see the item return to the queue and the error toast.
4. As a student apply to an opportunity: "My applications" shows it without F5; withdraw it and see the status change.
5. Click the dashboard "Оновити" button on the Opportunities tab: the active list refetches.
6. Stop the backend and reload the tab: the retry state appears; start the backend and press "Спробувати знову".

If the backend, database or Moodle cannot be started in this environment, say so explicitly in the report instead of claiming the check passed.

- [ ] **Step 4: Report to the user**

Summarize the diff, the pipeline results and which manual checks were run. Suggest adding a short "Server state" section to `docs/ai/frontend.md` (queries and keys live next to the feature, mutations invalidate a key prefix, no hand-rolled loading state) and ask whether to include it in this PR. Ask before pushing the branch and opening the PR (target `refactor/opportunities-shared-contracts`, retarget to `develop` after PR 1 merges), and remind them the PR description needs UI screenshots.
