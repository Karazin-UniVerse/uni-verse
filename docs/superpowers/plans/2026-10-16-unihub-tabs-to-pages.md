# UniHub Tabs to Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the single-page UniHub dashboard (`/?tab=…`) into real Next.js routes, with detail pages for courses, assignments and opportunities instead of modals or in-tab state.

**Architecture:** A route group `app/(dashboard)/` holds one client layout that mounts `DashboardProvider` (data, filters, Moodle link state) and `DashboardShell` (sidebar, header, bottom nav, banners, link modals). The shell stays mounted across navigation, so data is not refetched between pages. Pages are thin and render the existing tab components. Tabs inside `/study` and `/opportunities` stay local component state and never change the URL; only detail pages have their own URLs.

**Tech Stack:** Next.js 16 App Router, React 19, TanStack Query, SCSS Modules, Una/`@ui`, Vitest.

**Spec:** agreed in chat on 2026-10-16 (no spec file). Route map:

| URL                                 | Content                                                     |
| ----------------------------------- | ----------------------------------------------------------- |
| `/`                                 | redirects to `/wall`                                        |
| `/wall`                             | Overview (`OverviewTab`)                                    |
| `/study`                            | `StudyTab` with local views Subjects / Grades / Assignments |
| `/study/courses/{courseId}`         | course contents                                             |
| `/study/assignments/{assignmentId}` | assignment page (replaces `AssignmentModal`)                |
| `/schedule`                         | `ScheduleView`                                              |
| `/opportunities`                    | `OpportunitiesTab` with local sub-tabs                      |
| `/opportunities/{opportunityId}`    | opportunity detail (replaces `OpportunityDetailModal`)      |
| `/connect-moodle`                   | `ConnectMoodleTab`                                          |

## Global Constraints

- Read `packages/uni-hub/node_modules/next/dist/docs/` (route groups, layouts, `redirect`, dynamic routes, `useParams`) before writing routes; `packages/uni-hub/AGENTS.md` says this Next.js differs from older versions.
- Project rules in `docs/ai/*` apply: descriptive names, explicit return types, more than 3 parameters means one typed object, empty line before `return`, no compatibility aliases or re-export shims (update every call site, delete obsolete files), every UI string through `formatMessage` with keys in both `uk.ts` and `en.ts`, `@universe/ui` stays language-agnostic, SCSS tokens only (no hex, spacing multiples of 4, tokens for radius, shadow and transition), no new hardcoded breakpoints.
- Business logic must not change: gating by feature flags, Moodle-linked rules, DEADLINE_SNIPER badge, opportunity permissions (`isOwner`, `canEdit`, `canSendToReview`, `canApply`).
- Tabs inside `/study` and `/opportunities` are local state. Back links from detail pages go to `/study?view=subjects`, `/study?view=assignments` and `/opportunities`; `/study` already reads `view` as its initial value.
- Conventional Commits, one commit per task. The branch is `refactor/RS-170-courses-page-and-mobile-layout`, stacked on `refactor/layout-and-translations`.
- Before each commit: `pnpm exec prettier --write` on touched files, `pnpm lint`, `pnpm lint:style`, `pnpm --filter @universe/uni-hub typecheck`, `pnpm --filter @universe/uni-hub test`.

## Review Focus

- Non-numeric or unknown `{courseId}` on `/study/courses/…`: show the load-error state, never crash or fetch `NaN`.
- Feature-gated routes (`/study` with Moodle off, `/schedule` with eDean off, `/opportunities` with the flag off): redirect to `/wall`, as `resolveNavKey` does today.
- `/connect-moodle` while Moodle is linked, and `/study` while it is not linked: redirect rules stay as `resolveNavKey` defines them.
- Assignment page for an id missing from the dashboard assignments list (opened from course contents, list stale or empty): still renders status and the Moodle link from the status query; no crash.
- Unauthenticated deep link to any dashboard route: goes to `/login`, as `DashboardPage` does today.
- Opportunity changed on its detail page (edit, lifecycle, send to review): the page and the lists show fresh data after the change.
- Opportunity id that does not exist: `LoadErrorState`, not a blank page.

---

### Task 1: Reset the in-tab experiment and add the routes module

**Files:**

- Revert (uncommitted work, superseded): all uncommitted changes under `packages/uni-hub` and `docs/ONBOARDING.md`
- Create: `packages/uni-hub/views/dashboard/routes.ts`
- Test: `packages/uni-hub/views/dashboard/routes.test.ts`

**Interfaces:**

- Produces, all exported from `routes.ts`:
  - `ROUTE` const object: `Wall '/wall'`, `Study '/study'`, `Schedule '/schedule'`, `Opportunities '/opportunities'`, `ConnectMoodle '/connect-moodle'`
  - `NAV_KEY_ROUTE: Record<NavKey, string>` mapping `overview→/wall`, `study→/study`, `schedule→/schedule`, `opportunities→/opportunities`, `connectMoodle→/connect-moodle`
  - `getNavKeyFromPathname(pathname: string): NavKey` — matches the first path segment (`/study/courses/5` → `study`); unknown paths return `NAV_KEY.Overview`
  - `getStudyHref(view: StudyView): string` → `/study?view=<view>`
  - `getCourseHref(courseId: number): string` → `/study/courses/<id>`
  - `getAssignmentHref(assignmentId: number): string` → `/study/assignments/<id>`
  - `getOpportunityHref(opportunityId: string): string` → `/opportunities/<id>`

- [ ] **Step 1: Discard the in-tab work.** Run `git restore --staged --worktree packages/uni-hub docs/ONBOARDING.md`, then `git status --short` must show nothing under those paths (the restored `app/courses/[courseId]/contents/page.tsx` and `views/CourseContents.*` come back; later tasks delete them).
- [ ] **Step 2: Write `routes.test.ts`** with: `getNavKeyFromPathname('/wall')` is `overview`; `'/study/courses/5'` is `study`; `'/opportunities/abc'` is `opportunities`; `'/connect-moodle'` is `connectMoodle`; `'/unknown'` is `overview`; `getStudyHref('assignments')` equals `'/study?view=assignments'`; `getCourseHref(5)` equals `'/study/courses/5'`; `getAssignmentHref(7)` equals `'/study/assignments/7'`; `getOpportunityHref('x1')` equals `'/opportunities/x1'`.
- [ ] **Step 3: Run** `pnpm --filter @universe/uni-hub test -- routes` — expected FAIL (module missing).
- [ ] **Step 4: Implement `routes.ts`** with the signatures above.
- [ ] **Step 5: Run the test again** — expected PASS. Commit `feat(uni-hub): add dashboard route constants and href builders`.

### Task 2: DashboardProvider

**Files:**

- Create: `packages/uni-hub/views/dashboard/DashboardContext.tsx`
- Modify: `packages/uni-hub/views/dashboard/hooks/useMoodleLink.ts`, `useMoodleLink.test.ts`, `views/dashboard/index.ts`
- Test: `packages/uni-hub/views/dashboard/hooks/useMoodleLink.test.ts`

**Interfaces:**

- Consumes: `useDashboardData`, `useMoodleLink`, `fallbackStudentProfile`, `isLoggedIn`, `endSession`.
- Produces from `DashboardContext.tsx`:
  - `DashboardProvider: React.FC<{ children: React.ReactNode }>` — owns everything `DashboardPage` held for data: filter state (`dateFrom`, `dateTo`, `sortOrder`, `hideCompleted`), `useDashboardData` call, `useMoodleLink` call, and the `onUnauthorized` redirect to `/login`
  - `useDashboard(): DashboardContextValue`, throws if used outside the provider
  - `DashboardContextValue` (declare in `views/dashboard/types.ts`): `data: DashboardData`, `loading`, `hasCachedData`, `lastSyncTime`, `isOfflineData`, `activeStudentProfile: StudentProfile`, `refresh: () => void` (the existing `handleRefresh`, which also invalidates opportunities), the four filter values with their setters (same names as today), `isMoodleLinked`, `linkModalMode`, `isLinkModalOpen`, `isUnlinkModalOpen`, `openLinkModal`, `closeLinkModal`, `openUnlinkModal`, `closeUnlinkModal`, `handleLinkSuccess`, `handleUnlinkSuccess`
- `useMoodleLink` loses `activeKey` and `setActiveKey` options. After a successful link it calls `onLinkSuccess` only; the provider's `onLinkSuccess` also does `router.push(ROUTE.Wall)` when `usePathname()` is `ROUTE.ConnectMoodle`.

- [ ] **Step 1: Update `useMoodleLink.test.ts`** to the new options (no `activeKey`/`setActiveKey`): `handleLinkSuccess` closes the modal, sets `isMoodleLinked`, stores `isMoodleLinked=true`, and calls `onLinkSuccess`. Remove the case that expected `setActiveKey('overview')`.
- [ ] **Step 2: Run** `pnpm --filter @universe/uni-hub test -- useMoodleLink` — expected FAIL.
- [ ] **Step 3: Change `useMoodleLink.ts`** and its `UseMoodleLinkOptions` accordingly; run the test — expected PASS.
- [ ] **Step 4: Create `DashboardContext.tsx`** by moving the data and Moodle-link code out of `DashboardPage.tsx` as specified. The provider must not read `useSearchParams`. `DashboardPage.tsx` is not edited here.
- [ ] **Step 5: Typecheck, lint, prettier.** Commit `refactor(uni-hub): extract dashboard data into DashboardProvider`.

### Task 3: Shell, layout and the simple pages

**Files:**

- Create: `packages/uni-hub/app/(dashboard)/layout.tsx`, `app/(dashboard)/wall/page.tsx`, `app/(dashboard)/schedule/page.tsx`, `app/(dashboard)/connect-moodle/page.tsx`, `packages/uni-hub/views/dashboard/layout/DashboardShell.tsx`
- Modify: `app/page.tsx`, `views/dashboard/layout/DashboardSidebar.tsx`, `components/dashboard/MobileBottomNav.tsx`, `views/dashboard/tabs/OverviewTab.tsx`, `views/dashboard/tabs/CoursesTab.tsx`, `views/dashboard/types.ts`, `views/dashboard/index.ts`, `docs/ONBOARDING.md`
- Delete: `views/DashboardPage.tsx` (its remaining parts move in this task and Task 4)
- Test: `views/dashboard/layout/DashboardSidebar.test.ts`

**Interfaces:**

- Consumes: Task 1 `ROUTE`, `NAV_KEY_ROUTE`, `getNavKeyFromPathname`, `getCourseHref`; Task 2 `DashboardProvider`, `useDashboard`.
- Produces:
  - `DashboardShell: React.FC<{ children: React.ReactNode }>` — renders `BadgeSystem`, `DashboardSidebar`, `MobileBottomNav`, `DashboardHeader`, the page title row (title from `PAGE_TITLE_KEYS[activeKey]`, sync info, refresh button), offline and link-Moodle banners, `DashboardSkeleton` while `loading && !hasCachedData`, `LinkMoodleModal`/`UnlinkMoodleModal`, then `children`. It holds only UI state (`collapsed`, `mobileMenuOpen`). `activeKey` is `resolveNavKey(getNavKeyFromPathname(pathname), …)`; when the resolved key differs from the path's key it calls `router.replace(NAV_KEY_ROUTE[resolved])`. It redirects to `/login` when `!isLoggedIn()`, as `DashboardPage` did.
  - `app/page.tsx` becomes a server component that calls `redirect(ROUTE.Wall)` from `next/navigation`.
  - `DashboardSidebar` and `MobileBottomNav` keep the `onSelectKey` prop; the shell passes `(key) => router.push(NAV_KEY_ROUTE[key])`.
  - `OverviewTab` and `CoursesTab` navigate themselves with `useRouter`: a course click does `router.push(getCourseHref(course.id))`; "all courses" in Overview does `router.push(getStudyHref('subjects'))`; every other `onNavigate(key, view)` call becomes `router.push(getStudyHref(view))` or `router.push(NAV_KEY_ROUTE[key])`. Remove the `onNavigate` prop from `OverviewTabProps` and delete `NavigateHandler` if nothing uses it afterwards.

- [ ] **Step 1: Add a case to `DashboardSidebar.test.ts`** that `NAV_KEY_ROUTE` has an entry for every `NAV_ITEMS` key (pins the nav-to-route mapping).
- [ ] **Step 2: Read the Next docs** named in Global Constraints, then create `(dashboard)/layout.tsx` as a client component: `<DashboardProvider><DashboardShell>{children}</DashboardShell></DashboardProvider>`.
- [ ] **Step 3: Implement `DashboardShell.tsx`** by moving the layout JSX from `DashboardPage.tsx` as specified. `wall`, `schedule` and `connect-moodle` pages render `OverviewTab` (props from `useDashboard()`), `ScheduleView`, and `ConnectMoodleTab` (`onConnect` calls `openLinkModal(LinkMoodleMode.CONNECT)`).
- [ ] **Step 4: Switch Sidebar, bottom nav and tab navigation** to routes as specified; replace `app/page.tsx`. Leave `/study` and `/opportunities` for Tasks 4 and 6; until then their nav items 404, so do this task and the next two before running the browser smoke test.
- [ ] **Step 5: Run the full check set**, then commit `refactor(uni-hub): split the dashboard into a route group with a shared shell`.

### Task 4: Study page and course page

**Files:**

- Create: `app/(dashboard)/study/page.tsx`, `app/(dashboard)/study/courses/[courseId]/page.tsx`
- Move: `views/CourseContents.tsx` and `.module.scss` to `views/dashboard/tabs/CourseContents.tsx` and `.module.scss`
- Modify: `views/dashboard/tabs/AssignmentsTab.tsx`, `views/dashboard/types.ts`, `views/dashboard/index.ts`, `i18n/locales/uk.ts`, `en.ts`
- Delete: `app/courses/[courseId]/contents/page.tsx`

**Interfaces:**

- Consumes: Tasks 1 to 3.
- Produces:
  - `study/page.tsx`: client page wrapped in `<Suspense>` (needs `useSearchParams`). It keeps the existing "requested view versus local selection" pattern from `DashboardPage` for `StudyView`, renders `StudyTab` with `CoursesTab` / `GradesTab` (owns `simulatorOpen` and `GradeSimulator`) / `AssignmentsTab`. Assignment rows navigate with `router.push(getAssignmentHref(item.id))`.
  - `CourseContents: React.FC<{ courseId: number }>` in `views/dashboard/tabs/CourseContents.tsx`. The course page reads `courseId` with `useParams`; a non-integer id renders `LoadErrorState` and never calls the query. The component drops its own header, language and theme switchers and breadcrumb; it shows a back button (`router.push(getStudyHref('subjects'))`, label `courseContents.back`) and the panel with an `h3`. Assignment modules link to `getAssignmentHref(courseModule.instance)`; other modules open `url` in a new tab as today. Delete the now-unused `courseContents.breadcrumbs` key.

- [ ] **Step 1: Add a test** in `views/dashboard/utils.test.ts` for the route id guard `parseRouteId(raw: string | string[] | undefined): number | null`, exported from `views/dashboard/utils.ts` (also used by Task 5): returns `5` for `'5'`, `null` for `'abc'`, `null` for `undefined`, `null` for `'5.5'`, `null` for `['5']`. Run it, expect FAIL, implement, expect PASS.
- [ ] **Step 2: Build the study page and move `CourseContents`** as specified; delete the old route file.
- [ ] **Step 3: Run the full check set.** Commit `feat(uni-hub): add /study and /study/courses/[courseId] pages`.

### Task 5: Assignment page

**Files:**

- Create: `app/(dashboard)/study/assignments/[assignmentId]/page.tsx`, `components/assignments/AssignmentDetail.tsx` (+ `.module.scss` renamed from `AssignmentModal.module.scss`)
- Modify: `components/assignments/index.ts`, `i18n/locales/uk.ts`, `en.ts`
- Delete: `components/assignments/AssignmentModal.tsx`
- Test: `components/assignments/helpers.test.ts` (existing helpers stay covered)

**Interfaces:**

- Produces: `AssignmentDetail: React.FC<AssignmentDetailProps>` with `AssignmentDetailProps = { assignmentId: number; assignment: Assignment | undefined }`. The body is `AssignmentModal` without the `Modal` wrapper and without the `visible`/`onClose` props: the same status query (`assignmentStatusQueryOptions(assignmentId)`), form, submit mutation, gamification rules and Moodle link. Title is `assignment?.name ?? formatMessage('assignmentModal.defaultTitle')`. The deadline for DEADLINE_SNIPER is `assignment?.duedate`. A back button goes to `getStudyHref('assignments')` with a new key `assignmentPage.back` (uk "Назад до завдань", en "Back to assignments"). `getAssignmentStatusLabel` keeps its export.
- Page: parses `assignmentId` with `parseRouteId` (Task 4), finds the assignment in `useDashboard().data.assignments` by `id`, and renders `AssignmentDetail`. A missing assignment is allowed (Review Focus).
- All `AssignmentModal` imports and the modal state in `study/page.tsx` are removed.

- [ ] **Step 1: Create `AssignmentDetail`** by moving the code from `AssignmentModal.tsx` as specified; delete the modal file and its export; keep the `assignmentModal.*` translation keys (my call: they are still used and renaming adds churn).
- [ ] **Step 2: Add the page and remove modal usage** from `study/page.tsx` and `CourseContents.tsx`.
- [ ] **Step 3: Run the full check set.** Commit `feat(uni-hub): add /study/assignments/[assignmentId] page`.

### Task 6: Opportunities pages

**Files:**

- Create: `app/(dashboard)/opportunities/page.tsx`, `app/(dashboard)/opportunities/[opportunityId]/page.tsx`, `views/dashboard/tabs/opportunities/OpportunityDetailPage.tsx`, `packages/ui/components/complex/OpportunityDetail/` (`OpportunityDetail.tsx`, `.types.ts`, `.module.scss`, `.stories.tsx`, `index.ts`)
- Modify: `views/dashboard/tabs/OpportunitiesTab.tsx`, `opportunities/queries.ts`, `queries.test.ts`, `queryKeys.ts`, `hooks/useOpportunityDetail.ts` (renamed `useOpportunityActions.ts`), `opportunities/index.ts`, `packages/ui/components/complex/index.ts`, `i18n/locales/uk.ts`, `en.ts`
- Delete: `packages/ui/components/complex/OpportunityDetailModal/`, `views/dashboard/tabs/opportunities/modals/OpportunityDetailModal.tsx`
- Test: `views/dashboard/tabs/opportunities/queries.test.ts`

**Interfaces:**

- Produces:
  - `opportunityKeys.detail(opportunityId: string)` → `[...all, 'detail', opportunityId]`
  - `opportunityDetailQueryOptions(opportunityId: string)` in `queries.ts`, calling `opportunitiesApi.getOpportunity(opportunityId)` and returning `response.data`
  - `OpportunityDetail` in `@ui` complex: the former `OpportunityDetailModal` content without `Modal`. Props: the old ones minus `open`, `onClose`, `closeText`; plus `onBack: () => void` and `backText: string` (back button at the top replaces the footer close button). Title renders as `h3`. Stories under `Complex/OpportunityDetail` (CSF3, `satisfies Meta`), replacing the modal's story.
  - `useOpportunityActions()` returns `{ handleSendToReview(id: string): Promise<void>; handleLifecycleChange(id: string, state: OpportunityLifecycle): Promise<void> }`; the selected-opportunity state and `patchSelected` go away because `invalidateOpportunities` already refetches the detail query.
  - `OpportunityDetailPage: React.FC<{ opportunityId: string }>` uses the detail query, `useOpportunityActions`, `useCreateOpportunity` (edit, modal over the page), `useApplicantActions` (apply modal), `useCurrentUser`, renders `OpportunityDetail` with the same prop mapping the old modal wrapper had, `LoadErrorState` for a failed or missing opportunity and `Spinner` while loading. Back goes to `ROUTE.Opportunities`; new key `opportunities.detail.back` (uk "Назад до можливостей", en "Back to opportunities").
  - In `OpportunitiesTab`, `onOpenDetail` becomes `router.push(getOpportunityHref(opportunity.id))`; the detail modal, `useOpportunityDetail` wiring and `selectedOpportunity` passed to `useApplicantActions` are removed. `useApplicantActions` is used only by the detail page for apply and by `OpportunitiesTab` only for withdraw; if its `selectedOpportunity` option becomes unused in the tab, make the option required only where needed (do not add a fork).

- [ ] **Step 1: Add to `queries.test.ts`** a case that `opportunityDetailQueryOptions('x1')` has `queryKey` `['opportunities', 'detail', 'x1']` and its `queryFn` calls `opportunitiesApi.getOpportunity` with `'x1'` and returns the data. Run, expect FAIL.
- [ ] **Step 2: Implement key and query options;** run, expect PASS.
- [ ] **Step 3: Create the `@ui` `OpportunityDetail` component and story,** delete the modal component and its story; update `complex/index.ts`.
- [ ] **Step 4: Add `useOpportunityActions`, `OpportunityDetailPage` and both pages;** rewire `OpportunitiesTab`; delete the old modal wrapper.
- [ ] **Step 5: Run the full check set including** `pnpm --filter @universe/ui typecheck`. Commit `feat(uni-hub): add /opportunities and /opportunities/[opportunityId] pages`.

### Task 7: Cleanup, docs and verification

**Files:**

- Modify: `docs/ONBOARDING.md` (route list around line 72), `docs/ai/architecture.md` if it names `DashboardPage`, `packages/uni-hub` imports of removed names
- Delete: `views/DashboardPage.tsx` leftovers if any remain

- [ ] **Step 1: Find leftovers:** `grep -rn "DashboardPage'\|?tab=\|AssignmentModal\|OpportunityDetailModal\|NavigateHandler\|onNavigate\|courses/.*contents" packages docs` must show only intended hits (`DashboardPage.module.scss` keeps its name, my call). Remove unused exports, files and translation keys.
- [ ] **Step 2: Update `docs/ONBOARDING.md`** with the new route map from the top of this plan.
- [ ] **Step 3: Run** `pnpm lint`, `pnpm lint:style`, `pnpm typecheck`, `pnpm test`, `pnpm build`; all must pass with zero warnings.
- [ ] **Step 4: Browser smoke test** with the dev server and the test user the user provided in chat (do not store credentials in the repo): log in, then visit `/wall`, `/study` (switch all three views), open a course, open an assignment from the course and from the Assignments view, `/schedule`, `/opportunities` (enable the flag via the `universe_feature_overrides` localStorage key if `.env.local` has it off), open an opportunity, `/connect-moodle`, and an unknown course id such as `/study/courses/abc`. Check the mobile bottom nav at phone width, including that deep links keep the right item highlighted.
- [ ] **Step 5: Commit** `docs(uni-hub): document the route map`.
