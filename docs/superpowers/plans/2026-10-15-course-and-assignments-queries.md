# Course Contents and Assignments on TanStack Query Implementation Plan (PR 5)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the course contents view, the per-assignment status loading and the assignment modal (status, file upload, submit) from `useState` + `useEffect` fetching to TanStack Query, with a shared Moodle query layer and a shared load error state.

**Architecture:** A new package-level query layer `packages/uni-hub/queries/moodle/` (`queryKeys.ts`, `queries.ts`) is shared by the course view, the assignment list and the assignment modal, and by the dashboard data in PR 6. `useAssignmentStatuses` becomes `useQueries` whose loader runs through a small concurrency limiter (replacing the hand-written batches of 10). The assignment modal reads the status with `useQuery` (same cache entry as the list) and submits with `useMutation`. `LoadErrorState` moves out of the Opportunities folder because it now has a second consumer.

**Tech Stack:** `@tanstack/react-query` v5, React 19, Vitest (node env, `renderToString`).

**Spec:** `docs/superpowers/specs/2026-10-15-server-state-and-contracts-roadmap-design.md` (row PR 5).

**Prerequisite:** PRs #241, #242 and PR 4 (`2026-10-15-moodle-shared-contracts.md`) are in the stack below this branch: types come from `@core/types/moodle` and `@core/constants/moodle`. Anchors below were read before PR 4 landed; re-run the greps in each task.

## Global Constraints

- Branch `refactor/course-and-assignments-queries`, stacked on `refactor/moodle-shared-contracts`.
- Rules in `docs/ai/data-and-contracts.md#server-state-tanstack-query`: no `useEffect` fetching, no hand-rolled `loading`, loaders let errors propagate, mutations return the invalidation promise, `retry: false` stays the global default.
- Query layer location: `packages/uni-hub/queries/moodle/`; keys start with `moodleKeys.all = ['moodle']`.
- Every UI string goes through `formatMessage`; each new key exists in `uk.ts` and `en.ts`. Renaming a key updates every call site (no aliases).
- No aliases or shims; one import per module path; explicit return types for new functions; empty line before `return`.
- `uni-hub` tests run in the vitest node environment without jsdom; hooks that now need a provider are rendered with `QueryClientProvider` and `renderToString`.
- Commit messages follow Conventional Commits and end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Show the diff and wait for approval before each commit (user preference); do not push without being asked.
- Commands run from the repository root. Final pipeline: `pnpm lint`, `pnpm lint:style`, `pnpm typecheck`, `pnpm test`, `pnpm build`, prettier on changed files.

## Review Focus

- Assignment status requests never run more than 10 at a time, and an assignment that already has `submissionStatus` or a cached status is not requested again.
- The modal and the assignment list share one cache entry per assignment: after a successful submit the list shows the new status without a reload.
- Opening the modal for another assignment never shows the previous assignment's status or form text.
- A failed status or contents load shows the shared error state with retry instead of a toast and an empty view.
- The first section of a course opens by default, and toggling sections keeps working after a refetch.
- Gamification effects (celebration, `DEADLINE_SNIPER` badge) still fire only after a successful submit.

## File Structure

| File (under `packages/uni-hub/`)                                            | Responsibility                                                      |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `components/common/LoadErrorState.tsx` + `.module.scss` + `.test.ts` (move) | Shared error state with retry                                       |
| `queries/moodle/queryKeys.ts` (create)                                      | `moodleKeys`                                                        |
| `queries/moodle/queries.ts` (create)                                        | Loaders and query options for course contents and assignment status |
| `utils/concurrency.ts` + `utils/tests/concurrency.test.ts` (create)         | `createLimiter`                                                     |
| `views/CourseContents.tsx` (modify)                                         | `useQuery` instead of effect fetching                               |
| `components/assignments/hooks/useAssignmentStatuses.ts` (+ test)            | `useQueries`                                                        |
| `components/assignments/AssignmentModal.tsx` (+ helpers)                    | Status query and submit mutation                                    |
| `i18n/locales/uk.ts`, `en.ts`                                               | Error keys renamed to `common.error.*`                              |

---

### Task 1: Move `LoadErrorState` to shared components

**Files:** move `views/dashboard/tabs/opportunities/LoadErrorState.tsx` and `LoadErrorState.test.ts` to `components/common/`; add `LoadErrorState.module.scss`; update `TabStateWrapper.tsx` and `modals/ApplicantsModal.tsx`; rename i18n keys; remove `.errorState` from `OpportunitiesTab.module.scss`.

- [ ] **Step 1: Move the test and run it red**

Move `LoadErrorState.test.ts` to `components/common/` and keep its import `./LoadErrorState`. Run `pnpm --filter @universe/uni-hub test -- LoadErrorState`. Expected: FAIL, module not found.

- [ ] **Step 2: Move the component**

Move the component to `components/common/LoadErrorState.tsx`. Its style class `.errorState` moves into `components/common/LoadErrorState.module.scss` (same declarations: flex column, centered, `gap: var(--space-16)`, `padding: var(--space-48) 0`) and the component imports `./LoadErrorState.module.scss`. Delete `.errorState` from `OpportunitiesTab.module.scss`.

- [ ] **Step 3: Rename the keys**

`opportunities.error.load` becomes `common.error.load` and `opportunities.error.retry` becomes `common.error.retry` in `uk.ts`, `en.ts` and the component. `grep -rn "opportunities.error" packages/uni-hub` must return nothing.

- [ ] **Step 4: Update the consumers**

In `TabStateWrapper.tsx` and `modals/ApplicantsModal.tsx` import `LoadErrorState` from `@uni-hub/components/common/LoadErrorState`.

- [ ] **Step 5: Verify and commit** (after diff approval)

`pnpm --filter @universe/uni-hub test && pnpm --filter @universe/uni-hub typecheck && pnpm lint:style`. Commit: `refactor(uni-hub): share the load error state`.

---

### Task 2: Moodle query layer and the concurrency limiter

**Files:** create `queries/moodle/queryKeys.ts`, `queries/moodle/queries.ts`, `utils/concurrency.ts`, `utils/tests/concurrency.test.ts`, `queries/moodle/queries.test.ts`.

**Interfaces:**

- Produces: `moodleKeys.{ all, courseContents(courseId: number), assignmentStatus(assignmentId: number) }`; `courseContentsQueryOptions(courseId: number)`, `assignmentStatusQueryOptions(assignmentId: number)`, `loadAssignmentStatus(assignmentId: number): Promise<SubmissionStatus>`; `createLimiter(maxConcurrent: number): <T>(task: () => Promise<T>) => Promise<T>`.

- [ ] **Step 1: Write the failing limiter tests**

`utils/tests/concurrency.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createLimiter } from '../concurrency';

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve: () => void = () => {};
  const promise = new Promise<void>((done) => {
    resolve = done;
  });

  return { promise, resolve };
}

describe('createLimiter', () => {
  it('never runs more tasks at once than the limit', async () => {
    const limit = createLimiter(2);
    const gates = [deferred(), deferred(), deferred(), deferred()];
    let running = 0;
    let peak = 0;

    const results = gates.map((gate) =>
      limit(async () => {
        running += 1;
        peak = Math.max(peak, running);
        await gate.promise;
        running -= 1;
      }),
    );

    await Promise.resolve();
    expect(running).toBe(2);

    for (const gate of gates) {
      gate.resolve();
      await Promise.resolve();
    }

    await Promise.all(results);

    expect(peak).toBe(2);
  });

  it('starts the next waiting task when one finishes, even if it fails', async () => {
    const limit = createLimiter(1);
    const order: string[] = [];

    const failing = limit(async () => {
      order.push('first');
      throw new Error('boom');
    });
    const following = limit(async () => {
      order.push('second');
    });

    await expect(failing).rejects.toThrow('boom');
    await following;

    expect(order).toEqual(['first', 'second']);
  });

  it('returns the task result', async () => {
    const limit = createLimiter(3);

    await expect(limit(async () => 42)).resolves.toBe(42);
  });
});
```

Run `pnpm --filter @universe/uni-hub test -- concurrency`. Expected: FAIL, module not found.

- [ ] **Step 2: Implement the limiter**

`utils/concurrency.ts`:

```ts
export function createLimiter(maxConcurrent: number): <T>(task: () => Promise<T>) => Promise<T> {
  let active = 0;
  const waiting: Array<() => void> = [];

  const release = (): void => {
    const startNext = waiting.shift();

    if (startNext) {
      startNext();
    } else {
      active -= 1;
    }
  };

  return async <T>(task: () => Promise<T>): Promise<T> => {
    if (active < maxConcurrent) {
      active += 1;
    } else {
      await new Promise<void>((resolve) => waiting.push(resolve));
    }

    try {
      return await task();
    } finally {
      release();
    }
  };
}
```

A finished task hands its slot straight to the next waiter, so `active` never exceeds the limit. Re-run the tests; Expected: PASS.

- [ ] **Step 3: Write the failing query tests**

`queries/moodle/queries.test.ts` (real `QueryClient`, `vi.spyOn(moodleApi, ...)` as in the Opportunities tests): `courseContentsQueryOptions(7)` calls `moodleApi.getCourseContents(7)` and resolves the sections; a rejected request rejects `fetchQuery` (no swallowing); `loadAssignmentStatus(5)` returns the `SubmissionStatus` from `moodleApi.getAssignmentStatus(5)`; and 25 concurrent `loadAssignmentStatus` calls never have more than 10 `getAssignmentStatus` requests pending (use a deferred-based mock and count). Run; Expected: FAIL, module not found.

- [ ] **Step 4: Implement keys and queries**

`queries/moodle/queryKeys.ts`:

```ts
export const moodleKeys = {
  all: ['moodle'] as const,
  courseContents: (courseId: number) => [...moodleKeys.all, 'course-contents', courseId] as const,
  assignmentStatus: (assignmentId: number) =>
    [...moodleKeys.all, 'assignment-status', assignmentId] as const,
};
```

`queries/moodle/queries.ts`:

```ts
import { queryOptions } from '@tanstack/react-query';
import type { SubmissionStatus } from '@core/types/moodle';
import { moodleApi } from '@uni-hub/services/api';
import { createLimiter } from '@uni-hub/utils/concurrency';
import { moodleKeys } from './queryKeys';

const ASSIGNMENT_STATUS_MAX_CONCURRENT = 10;

const limitAssignmentStatusRequests = createLimiter(ASSIGNMENT_STATUS_MAX_CONCURRENT);

export function loadAssignmentStatus(assignmentId: number): Promise<SubmissionStatus> {
  return limitAssignmentStatusRequests(async () => {
    const response = await moodleApi.getAssignmentStatus(assignmentId);

    return response.data;
  });
}

export function courseContentsQueryOptions(courseId: number) {
  return queryOptions({
    queryKey: moodleKeys.courseContents(courseId),
    queryFn: async () => (await moodleApi.getCourseContents(courseId)).data,
  });
}

export function assignmentStatusQueryOptions(assignmentId: number) {
  return queryOptions({
    queryKey: moodleKeys.assignmentStatus(assignmentId),
    queryFn: () => loadAssignmentStatus(assignmentId),
  });
}
```

`moodleApi.getAssignmentStatus` currently returns `unknown`; PR 4 types it as `SubmissionStatus`. If it still returns `unknown` when this task runs, fix the typing in `api.moodle.ts` first (it is a one-line generic change) rather than casting here.

- [ ] **Step 5: Run the tests**

`pnpm --filter @universe/uni-hub test -- concurrency queries`. Expected: PASS.

- [ ] **Step 6: Commit** (after diff approval): `feat(uni-hub): add Moodle query layer and concurrency limiter`.

---

### Task 3: Course contents on `useQuery`

**Files:** `views/CourseContents.tsx`; new pure helper and test next to it (`views/course-contents.helpers.ts`, `views/course-contents.helpers.test.ts`).

- [ ] **Step 1: Write the failing helper test**

`selectVisibleSections(sections)` keeps only sections that have a name and at least one module (the filter that is inline today). Test: a list with an unnamed section, an empty section and a valid one returns only the valid one; an empty list returns `[]`. Run; Expected: FAIL.

- [ ] **Step 2: Implement the helper**

```ts
import type { CourseSection } from '@core/types/moodle';

export function selectVisibleSections(sections: CourseSection[]): CourseSection[] {
  return sections.filter(
    (section) => section.name && section.modules && section.modules.length > 0,
  );
}
```

- [ ] **Step 3: Replace the effect in `CourseContents.tsx`**

Delete `sections`, `loading`, `formatMessageRef` and the fetching `useEffect`; add:

```tsx
const courseIdNumber = Number.parseInt(courseId, 10);
const contentsQuery = useQuery({
  ...courseContentsQueryOptions(courseIdNumber),
  select: selectVisibleSections,
  enabled: Number.isInteger(courseIdNumber),
});
const sections = contentsQuery.data ?? [];
const [openSectionIds, setOpenSectionIds] = useState<Set<string> | null>(null);
const openSections =
  openSectionIds ?? new Set(sections.slice(0, 1).map((section) => section.id.toString()));
```

`toggleSection` now writes `setOpenSectionIds((previous) => { const next = new Set(previous ?? openSections); ... })`. In `renderSections()` the order is: `contentsQuery.isLoading` shows the spinner, `contentsQuery.isError` (and no data) shows `<LoadErrorState onRetry={() => void contentsQuery.refetch()} />`, empty data shows the existing `Empty`. Remove the `courseContents.loadError` toast and delete the key from both locale files if nothing else uses it (`grep` first).

- [ ] **Step 3b: Check `useToast` and unused imports**

Remove `useToast` if no longer used and any unused imports; `pnpm lint` must be clean.

- [ ] **Step 4: Verify and commit** (after diff approval)

`pnpm --filter @universe/uni-hub test && pnpm typecheck && pnpm lint`. Commit: `refactor(uni-hub): load course contents with TanStack Query`.

---

### Task 4: `useAssignmentStatuses` on `useQueries`

**Files:** `components/assignments/hooks/useAssignmentStatuses.ts`, `useAssignmentStatuses.test.ts`.

- [ ] **Step 1: Update the existing test to the new contract (red)**

Wrap the test components in `QueryClientProvider` (a fresh `QueryClient` per test) and add a pure-function test for `getAssignmentsNeedingStatus(assignments)` (returns the ids of assignments without `submissionStatus`, de-duplicated) exported from the hook file. Run; Expected: FAIL (function missing, hook still needs no provider).

- [ ] **Step 2: Implement**

```ts
import { useQueries } from '@tanstack/react-query';
import type { Assignment } from '@core/types/moodle';
import { assignmentStatusQueryOptions } from '@uni-hub/queries/moodle/queries';

export type AssignmentLocalStatuses = Record<number, { status?: string; grade?: string }>;

export function getAssignmentsNeedingStatus(assignments: Assignment[]): number[] {
  return [...new Set(assignments.filter((item) => !item.submissionStatus).map((item) => item.id))];
}

export function useAssignmentStatuses(assignments: Assignment[]): AssignmentLocalStatuses {
  const ids = getAssignmentsNeedingStatus(assignments);

  return useQueries({
    queries: ids.map((id) => assignmentStatusQueryOptions(id)),
    combine: (results) =>
      Object.fromEntries(
        results.flatMap((result, index) =>
          result.data
            ? [[ids[index], { status: result.data.status, grade: result.data.grade }]]
            : [],
        ),
      ),
  });
}
```

A failed request for one assignment simply has no entry (the old code ignored per-item errors too). Statuses stay cached per id for the stale time, and the shared limiter keeps the old maximum of 10 concurrent requests.

- [ ] **Step 3: Verify and commit** (after diff approval)

`pnpm --filter @universe/uni-hub test -- useAssignmentStatuses AssignmentsTab`. Commit: `refactor(uni-hub): load assignment statuses with useQueries`.

---

### Task 5: `AssignmentModal` on a status query and a submit mutation

**Files:** `components/assignments/AssignmentModal.tsx`; new `components/assignments/assignment-submission.helpers.ts` and test.

- [ ] **Step 1: Write failing tests for the pure pieces**

`assignment-submission.helpers.test.ts`: `extractUploadedItemId(uploaded)` returns the first `itemid` of a non-empty array and `undefined` for `undefined`, `[]` or a non-array; `canSubmitAssignment(status)` is true for no status, `new` and `draft`, false for `submitted` and `graded`. Run; Expected: FAIL.

- [ ] **Step 2: Implement the helpers**

```ts
import type { SubmissionStatus, UploadedFile } from '@core/types/moodle';

export function extractUploadedItemId(uploaded: UploadedFile[] | undefined): number | undefined {
  return Array.isArray(uploaded) && uploaded.length > 0 ? uploaded[0].itemid : undefined;
}

export function canSubmitAssignment(status: SubmissionStatus | undefined): boolean {
  return !status || status.status === 'new' || status.status === 'draft';
}
```

Also move `readFileAsDataUrl(file: File): Promise<string>` (the `FileReader` promise from `handleSubmit`) into this file.

- [ ] **Step 3: Replace the status effect**

Delete `status`, `loading`, the `fetchStatus` function and the effect that fetches and resets. Add:

```tsx
const instance = module?.instance;
const statusQuery = useQuery({
  ...assignmentStatusQueryOptions(instance ?? 0),
  enabled: visible && instance !== undefined,
});
const status = statusQuery.data;
```

Reset the form when the modal closes or the assignment changes by giving the form part its own keyed component or by clearing `text`, `files` and `formError` in the close handler and in a `key={instance}` on the form; do not use an effect that calls `setState`. Use `canSubmitAssignment(status)` to decide whether to render the submission form (preserving the behavior that submitted and graded assignments do not show the form). Render order for the status panel: `statusQuery.isLoading` shows the existing spinner, `statusQuery.isError` shows `<LoadErrorState onRetry={() => void statusQuery.refetch()} />`, otherwise the existing status row. Delete the `assignmentModal.loadStatusError` toast and key if unused elsewhere.

- [ ] **Step 4: Replace `handleSubmit` with a mutation**

```tsx
const submitMutation = useMutation({
  mutationFn: async ({ instanceId, answerText, file }: SubmissionRequest) => {
    const fileItemId = file
      ? extractUploadedItemId(
          (await moodleApi.uploadFile(file.name, await readFileAsDataUrl(file))).data,
        )
      : undefined;

    await moodleApi.submitAssignment(instanceId, answerText, fileItemId);
  },
  onSuccess: () =>
    queryClient.invalidateQueries({ queryKey: moodleKeys.assignmentStatus(instance ?? 0) }),
});
```

`submitting` becomes `submitMutation.isPending`; the "uploading" label can be derived from `submitMutation.isPending && files.length > 0`. `handleSubmit` keeps the empty-form validation, calls `await submitMutation.mutateAsync(...)`, then runs the existing toast, `triggerCelebration` and `DEADLINE_SNIPER` logic and clears the form; failures keep the `assignmentModal.submitError` toast. Because the status query key is the same one `useAssignmentStatuses` uses, the list updates too.

- [ ] **Step 5: Verify and commit** (after diff approval)

`pnpm --filter @universe/uni-hub test && pnpm typecheck && pnpm lint`. Commit: `refactor(uni-hub): load and submit assignments with TanStack Query`.

---

### Task 6: Full verification and handoff

- [ ] **Step 1: Run the pipeline** (`pnpm lint`, `pnpm lint:style`, `pnpm typecheck`, `pnpm test`, `pnpm build`, prettier on changed files). Expected: zero errors and zero warnings.
- [ ] **Step 2: Whole-branch review** by a fresh reviewer on the most capable model with the Review Focus above; fix Critical and Important findings with a failing test first.
- [ ] **Step 3: Report**, including that the browser check of the modal (submit, status refresh, error retry) needs a Moodle login and a populated database; say so if it was not run. Ask before pushing and `gh stack add refactor/course-and-assignments-queries`.
