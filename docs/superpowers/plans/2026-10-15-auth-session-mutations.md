# Auth and Session on TanStack Query Implementation Plan (PR 7)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make login, Google login, linking and unlinking Moodle and logout TanStack Query mutations, and make every session boundary clear the query cache so one user's cached data can never be shown to the next user in the same tab.

**Architecture:** One session module owns the list of `localStorage` keys that belong to a session and one plain function that takes a `QueryClient`: `endSession` (logout, expired token). A successful login calls `queryClient.clear()` directly. The three copies of the key list that exist today (`clearUserSessionStorage` in the dashboard helpers, `AuthApi.logout`, the `DashboardHeader` fallback) collapse into it. Auth mutations live in one hook file and replace the `loading` / `try` / `catch` boilerplate in `LoginPage`, `LinkMoodleModal` and `UnlinkMoodleModal`.

**Tech Stack:** `@tanstack/react-query` v5, Next.js 16 router, Vitest (node env).

**Spec:** `docs/superpowers/specs/2026-10-15-server-state-and-contracts-roadmap-design.md` (row PR 7 and section "Known risk carried by the pilot").

**Prerequisite:** PRs #241, #242 and PRs 4 to 6 are below this branch (auth response types in `@core/types/auth`, `moodleKeys` in `queries/moodle/`, `useDashboardData` on queries). Re-run the greps below before editing.

## Global Constraints

- Branch `refactor/auth-session-mutations`, stacked on `refactor/dashboard-data-queries`.
- Rules in `docs/ai/data-and-contracts.md#server-state-tanstack-query`, including: clear the client whenever a session ends.
- Keep every existing storage key and its value format; only the list of keys to clear is centralized.
- The API client keeps its current storage side effects for tokens (moving them is a separate refactor tied to `ApiClient`, out of scope).
- No aliases or shims; one import per module path; explicit return types for new functions; empty line before `return`; every UI string through `formatMessage`.
- Commit messages follow Conventional Commits and end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Show the diff and wait for approval before each commit (user preference); do not push without being asked.
- Commands run from the repository root. Final pipeline: `pnpm lint`, `pnpm lint:style`, `pnpm typecheck`, `pnpm test`, `pnpm build`, prettier on changed files.

## Review Focus

- User A logs out (or gets a 401) and user B signs in within the same tab, without a reload: B never sees A's opportunities, dashboard data or profile, not even for one frame.
- Every session boundary clears both storage and the cache: explicit logout in the header, `DashboardPage.handleLogout`, the 401 redirect from the dashboard query, a successful login, a successful Google login that is already linked.
- Unlinking Moodle keeps the session and the user's opportunities, and drops only Moodle data (done in PR 6); a second tab still works after unlink.
- A failed login shows the server message and keeps the form values; the submit button is disabled while the request runs.
- The Google flow that needs Moodle linking (`isLinked: false`) does not mark the user as logged in until the link or the explicit skip.
- No code reads `res.data.token`, `refresh_token` or `userID` (removed in PR 4); the dead `moodleToken` write in `LoginPage` is gone.

## File Structure

| File (under `packages/uni-hub/`)                                                                                          | Responsibility                                                                |
| ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `services/api.session.ts` + `services/api.session.test.ts` (create)                                                       | `USER_SESSION_STORAGE_KEYS`, `clearUserSessionStorage`, `endSession`          |
| `hooks/useAuthMutations.ts` (create)                                                                                      | `useLogin`, `useGoogleLogin`, `useLinkMoodle`, `useUnlinkMoodle`, `useLogout` |
| `services/api.auth.ts`, `views/dashboard/hooks/helpers.ts`, `views/dashboard/layout/DashboardHeader.tsx` (modify)         | Use the single key list                                                       |
| `views/LoginPage.tsx`, `components/auth/LinkMoodleModal.tsx`, `UnlinkMoodleModal.tsx`, `views/DashboardPage.tsx` (modify) | Use the mutations and `endSession`                                            |

---

### Task 1: Session module

**Files:** create `services/api.session.ts`, `services/api.session.test.ts`.

**Interfaces:**

- Produces: `USER_SESSION_STORAGE_KEYS: readonly string[]`; `clearUserSessionStorage(): void`; `endSession(queryClient: QueryClient): void`.

- [ ] **Step 1: Collect the key lists**

Run `grep -rn "universe_dashboard_data\|universe_student_profile\|moodleToken" packages/uni-hub --include='*.ts' --include='*.tsx' --exclude-dir=node_modules --exclude-dir=.next` and read the three lists (`clearUserSessionStorage` in `views/dashboard/hooks/helpers.ts`, `AuthApi.logout`, the `catch` in `DashboardHeader.handleLogout`). The union of them is the canonical list: `isLoggedIn`, `accessToken`, `isMoodleLinked`, `moodleToken`, `username`, `universe_student_profile`, `universe_dashboard_data`, `universe_last_sync_time`.

- [ ] **Step 2: Write the failing tests**

`api.session.test.ts` (stub `localStorage` with `vi.stubGlobal` as `helpers.test.ts` does, real `QueryClient`):

1. `clearUserSessionStorage` removes every key of `USER_SESSION_STORAGE_KEYS` and leaves unrelated keys (for example a language preference) alone.
2. `endSession` clears the storage keys and empties the query cache (seed `opportunityKeys.mine()` and `moodleKeys.dashboard(...)` with data; afterwards `queryClient.getQueryCache().getAll()` is empty).
   Run `pnpm --filter @universe/uni-hub test -- api.session`. Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

```ts
import type { QueryClient } from '@tanstack/react-query';
import { safeStorage } from './api.storage';

export const USER_SESSION_STORAGE_KEYS = [
  'isLoggedIn',
  'accessToken',
  'isMoodleLinked',
  'moodleToken',
  'username',
  'universe_student_profile',
  'universe_dashboard_data',
  'universe_last_sync_time',
] as const;

export function clearUserSessionStorage(): void {
  for (const key of USER_SESSION_STORAGE_KEYS) {
    safeStorage.removeItem(key);
  }
}

export function endSession(queryClient: QueryClient): void {
  clearUserSessionStorage();
  queryClient.clear();
}
```

Login does not get its own function: `beginSession` would only proxy `queryClient.clear()`, so the login mutations call `queryClient.clear()` directly (review ruling, KISS). `endSession` stays because it coordinates the storage clearing and the cache clearing.

- [ ] **Step 4: Replace the duplicates**

Delete `clearUserSessionStorage` from `views/dashboard/hooks/helpers.ts` and its re-export from `useDashboardData.ts`; make `AuthApi.logout` call `clearUserSessionStorage()` in its `finally`; update every import (`grep -rn clearUserSessionStorage packages/uni-hub`). Move the test in `helpers.test.ts` ("clears user session storage") into `api.session.test.ts` (it is the same behavior).

- [ ] **Step 5: Verify and commit** (after diff approval)

`pnpm --filter @universe/uni-hub test && pnpm typecheck && pnpm lint`. Commit: `refactor(uni-hub): centralize session storage clearing`.

---

### Task 2: Auth mutations

**Files:** create `hooks/useAuthMutations.ts`; modify `views/LoginPage.tsx`, `components/auth/LinkMoodleModal.tsx`, `components/auth/UnlinkMoodleModal.tsx`, `views/dashboard/layout/DashboardHeader.tsx`, `views/DashboardPage.tsx`.

**Interfaces:**

- Produces: `useLogin()`, `useGoogleLogin()`, `useLinkMoodle()`, `useUnlinkMoodle()`, `useLogout()`; each returns the `UseMutationResult` of its mutation.
  - `useLogin` variables `{ username, password }`; `onSuccess` calls `queryClient.clear()`.
  - `useGoogleLogin` variables `idToken: string`; `onSuccess` calls `queryClient.clear()` unconditionally for every successful Google response (including when `response.data.isLinked` is false, ensuring any stale cache from a prior session in the same browser tab is discarded).
  - `useLinkMoodle` variables `{ username, password }`; no cache change at the login page (the cache is already empty); in the dashboard modal the existing `onSuccess` callback (PR 6) invalidates `moodleKeys.all`.
  - `useUnlinkMoodle`: no variables; `onSuccess` does nothing to the cache here (PR 6's `onUnlinkSuccess` removes Moodle queries).
  - `useLogout`: `mutationFn: () => authApi.logout()`; `onSettled: () => { endSession(queryClient); window.location.assign('/login'); }` (the page reload that exists today stays, the cache clear makes the SPA paths safe too).

- [ ] **Step 1: Write the hook file**

Each hook is `useMutation` with `mutationFn` calling the matching `authApi` method; no `loading` state is kept anywhere else. Example:

```ts
export function useLogin(): UseMutationResult<LoginResponse, Error, Credentials> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ username, password }: Credentials) => authApi.login(username, password),
    onSuccess: () => queryClient.clear(),
  });
}
```

- [ ] **Step 2: Move `LoginPage` to the mutations**

Replace `setLoading` / `try` / `finally` in `handleLogin`, `handleGoogleSuccess`, `handleLinkMoodle` with `mutateAsync` inside the existing `try` / `catch` (the catch keeps `setError` and the toast); `loading` becomes `login.isPending || googleLogin.isPending || linkMoodle.isPending`. Delete the `res.data?.token` / `moodleToken` write. Keep the validation and navigation order.

- [ ] **Step 2b: Modals**

`LinkMoodleModal` uses `useLinkMoodle` and `isPending`; `UnlinkMoodleModal` uses `useUnlinkMoodle` and `isPending`.

- [ ] **Step 3: Logout and session expiry**

`DashboardHeader.handleLogout` becomes `logout.mutate()` and the duplicated `localStorage` fallback is deleted (`endSession` runs in `onSettled`). In `DashboardPage`, `handleLogout` becomes `endSession(queryClient); router.push('/login');` and the dashboard hook's `onUnauthorized` (PR 6) does the same, so the 401 path clears the cache before navigating.

- [ ] **Step 4: Verify**

`pnpm --filter @universe/uni-hub typecheck && pnpm --filter @universe/uni-hub test && pnpm lint`. Run `grep -rn "authApi\.\(login\|loginWithGoogle\|linkMoodleAccount\|unlinkMoodleAccount\|logout\)" packages/uni-hub --include='*.tsx'`; Expected: no matches outside `hooks/useAuthMutations.ts`.

- [ ] **Step 5: Commit** (after diff approval): `refactor(uni-hub): move auth flows to TanStack Query mutations`.

---

### Task 3: Full verification and handoff

- [ ] **Step 1: Run the pipeline** (`pnpm lint`, `pnpm lint:style`, `pnpm typecheck`, `pnpm test`, `pnpm build`, prettier on changed files). Expected: zero errors and zero warnings.
- [ ] **Step 2: Whole-branch review** by a fresh reviewer on the most capable model with the Review Focus above; fix Critical and Important findings with a failing test first.
- [ ] **Step 3: Browser check** of the cross-user scenario with two test accounts (log in as A, open "My opportunities", end the session through a 401 or the dashboard logout, log in as B in the same tab): B sees only B's data. It needs Moodle logins; if it cannot be run, say so.
- [ ] **Step 4: Update the earlier PR** description of the Opportunities PR (#242): remove the "Known limitation" note about the cache not being cleared (it is added there if it was published), and mention the fix. Ask before pushing and `gh stack add refactor/auth-session-mutations`.
