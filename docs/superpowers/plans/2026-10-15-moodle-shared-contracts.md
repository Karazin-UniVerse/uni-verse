# Moodle Gateway and Auth Shared Contracts Implementation Plan (PR 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Declare the Moodle gateway and auth API shapes once in `@universe/core`, make the backend DTOs implement them and the frontend import them, and fix the drift this exposes between what the backend returns and what the frontend reads.

**Architecture:** Same pattern as PR #241: `constants/moodle.ts` and `types/moodle.ts` (plus `types/auth.ts`) in core, imported by path; backend DTO classes `implements` the core types; `packages/uni-hub/types.ts` loses its copies. Unlike #241 this is not a pure move: the frontend types were written by hand and already disagree with the backend in places, so each domain starts with a failing test that pins the real contract.

**Tech Stack:** TypeScript 6, NestJS 11 + class-validator, Jest (backend), Vitest (uni-hub), `node --test` (core).

**Spec:** `docs/superpowers/specs/2026-10-15-server-state-and-contracts-roadmap-design.md` (row PR 4).

**Prerequisite:** PRs #241 and #242 are merged or this branch is stacked on them. The anchors below were taken from the code after #242; re-run the grep in each task before editing.

## Global Constraints

- Branch `refactor/moodle-shared-contracts`, stacked on the PR 3 branch (`docs/server-state-and-contracts-rules`).
- `packages/core` forbids barrel files: new files are `types/moodle.ts`, `types/auth.ts`, `constants/moodle.ts`, imported as `@core/types/moodle`, `@universe/core/types/moodle` and so on; nothing is added to `types/index.ts`.
- No TS `enum`, no aliases or re-export shims, one import per module path (inline `type` modifier for mixed imports), explicit return types, descriptive names, empty line before `return`.
- The core `types/index.ts` already exports `Course` (alias of `CurriculumItem`) and `GradeRecord`; the Moodle gateway course is therefore named `MoodleCourse`. Other names are kept (`Grade`, `Assignment`, `MoodleEvent`, `Notification`, `NotificationsResponse`, `CourseStatistics`, `CourseSection`, `CourseModule`, `CourseModuleFile`, `CourseModuleName`).
- Where the frontend and the backend disagree, the backend response is the truth unless a UI feature clearly depends on the frontend shape; then the backend is changed to supply it. Every such decision is written in the PR description.
- Commit messages follow Conventional Commits and end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Before each commit show the diff and wait for approval (user preference); do not push without being asked.
- Commands run from `/Users/ReDL/Documents/Programming/Projects/uni-verse`. Final pipeline: `pnpm lint`, `pnpm lint:style`, `pnpm typecheck`, `pnpm test`, `pnpm build`, prettier on changed files.

## Review Focus

- The unread notification count is read from `unreadcount` (the field the backend sends) and shows the real number, not always 0.
- An event shows its time and links to its URL once the backend forwards `formattedtime` and `url`; an event without them still renders.
- A grade object in the gateway response matches the contract field for field; legacy snake_case fallbacks (`course_name`, `rawgrade`) are either supplied by the backend or removed with their readers.
- Auth responses (`access_token`, Google `isLinked`) are typed once and the frontend does not read `token`, `refresh_token` or `userID` that no endpoint returns.
- `COURSE_MODULE_NAMES` (a runtime constant) is no longer exported from a types file.

## File Structure

| File                                                                         | Responsibility                                                                                                  |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `packages/core/constants/moodle.ts` (create)                                 | `COURSE_MODULE_NAMES` and `CourseModuleName`                                                                    |
| `packages/core/types/moodle.ts` (create)                                     | Course, grade, assignment, submission status, event, notification, statistics, course content, upload contracts |
| `packages/core/types/auth.ts` (create)                                       | Login, Google login and logout response contracts                                                               |
| `packages/backend/moodle/*/…-dto.ts`, `packages/backend/auth/dto/*` (modify) | DTO classes implement the core types                                                                            |
| `packages/backend/moodle/moodle-events/moodle-events.service.ts` (modify)    | Forward `url` and `formattedtime`                                                                               |
| `packages/uni-hub/types.ts` (delete the Moodle block)                        | Only non-API UI types remain                                                                                    |
| `packages/uni-hub/views/dashboard/hooks/helpers.ts` (modify)                 | Read `unreadcount`                                                                                              |
| ~30 files importing `@uni-hub/types`                                         | Import path changes                                                                                             |

---

### Task 1: Core constants and types

**Files:** create `packages/core/constants/moodle.ts`, `packages/core/types/moodle.ts`, `packages/core/types/auth.ts`.

**Interfaces:**

- Produces: `COURSE_MODULE_NAMES`, `CourseModuleName`; `MoodleCourse`, `GradeValue`, `Grade`, `Assignment`, `SubmissionStatus`, `MoodleEvent`, `Notification`, `NotificationsResponse`, `CourseStatistics`, `CourseModuleFile`, `CourseModule`, `CourseSection`, `UploadedFile`; `AuthResponse`, `GoogleAuthResponse`, `LogoutResponse`.

- [ ] **Step 1: Create `constants/moodle.ts`**

```ts
export const COURSE_MODULE_NAMES = {
  RESOURCE: 'resource',
  FOLDER: 'folder',
  ASSIGN: 'assign',
  QUIZ: 'quiz',
  FORUM: 'forum',
} as const;

export type CourseModuleName =
  (typeof COURSE_MODULE_NAMES)[keyof typeof COURSE_MODULE_NAMES] | (string & {});
```

- [ ] **Step 2: Create `types/moodle.ts`**

Copy the interfaces from `packages/uni-hub/types.ts` (`Grade`, `GradeValue`, `Assignment`, `MoodleEvent`, `Notification`, `NotificationsResponse`, `CourseStatistics`, `CourseModuleFile`, `CourseModule`, `CourseSection`) and rename `Course` to `MoodleCourse`. Import `ControlType` from `../utils/grades.ts` and `CourseModuleName` from `../constants/moodle.ts` (relative imports in core carry the `.ts` extension). Then apply the corrections found in the backend DTOs:

```ts
export interface MoodleCourse {
  id: number;
  fullname: string;
  shortname?: string;
  summary?: string;
  progress?: number | null;
  year?: number | null;
  semester?: number | null;
}

export interface MoodleEvent {
  id: number;
  name: string;
  description?: string;
  courseName?: string;
  timestart: number;
  timeduration?: number;
  formattedtime?: string;
  eventtype: string;
  url?: string;
}

export interface Notification {
  id: number;
  subject: string;
  fullmessage?: string;
  timecreated: number;
  read: boolean;
}

export interface NotificationsResponse {
  notifications: Notification[];
  unreadcount: number;
}

export interface SubmissionStatus {
  status: string;
  grade?: string;
  submittedAt?: number;
  isLate?: boolean;
}

export interface UploadedFile {
  itemid?: number;
}
```

Keep `Grade`, `Assignment`, `CourseStatistics`, `CourseModule*` and `CourseSection` exactly as they are in `packages/uni-hub/types.ts` for now; Task 4 settles their drift. Fields the backend DTOs mark optional are optional here (`MoodleEvent.formattedtime`, `url`).

- [ ] **Step 3: Create `types/auth.ts`**

```ts
export interface AuthResponse {
  access_token: string;
}

export interface GoogleAuthResponse {
  access_token: string;
  isLinked: boolean;
}

export interface LogoutResponse {
  message: string;
}
```

- [ ] **Step 4: Verify core**

Run: `pnpm --filter @universe/core typecheck && pnpm --filter @universe/core build && pnpm --filter @universe/core test && pnpm lint`
Expected: all pass; `pnpm lint` reports no `no-barrel-file` finding.

- [ ] **Step 5: Commit** (after diff approval): `feat(core): add Moodle gateway and auth contracts`.

---

### Task 2: Notifications and events (the two known drifts), backend first

**Files:**

- Modify: `packages/backend/moodle/moodle-notifications/moodle-notifications-dto.ts`, `packages/backend/moodle/moodle-events/moodle-events-dto.ts`, `packages/backend/moodle/moodle-events/moodle-events.service.ts`, `packages/backend/moodle/moodle-events/moodle-events.service.spec.ts`
- Modify: `packages/uni-hub/views/dashboard/hooks/helpers.ts:80` and its test `helpers.test.ts`

- [ ] **Step 1: Write the failing backend test for events**

In `moodle-events.service.spec.ts` extend the "should return parsed events" case (or add a sibling case) so the Moodle mock event carries `url: 'https://moodle.example/event/1'` and `formattedtime: '<span>10:00</span>'`, and assert the returned event contains both. Run `pnpm --filter @universe/backend test -- moodle-events`; Expected: FAIL (fields missing).

- [ ] **Step 2: Forward the fields**

In `moodle-events.service.ts` add `url: event.url,` and `formattedtime: event.formattedtime,` to the mapped object. Add `url?: string;` and `formattedtime?: string;` (with `@ApiPropertyOptional`) to `CalendarEventDto` and make it `implements MoodleEvent` (`import type { MoodleEvent } from '@universe/core/types/moodle'`). Re-run the test; Expected: PASS.

- [ ] **Step 3: Notifications DTO**

Make `NotificationDto implements Notification` and `NotificationsResponseDto implements NotificationsResponse` (import from `@universe/core/types/moodle`). Run `pnpm --filter @universe/backend typecheck`; Expected: clean (the DTO already has `fullmessage` and `unreadcount`).

- [ ] **Step 4: Write the failing frontend test for the unread count**

In `packages/uni-hub/views/dashboard/hooks/helpers.test.ts` add a case for `assembleDashboardData` where the notifications response is `{ data: { notifications: [], unreadcount: 3 } }` and expect `unreadCount` to be `3`. Run `pnpm --filter @universe/uni-hub test -- helpers`; Expected: FAIL (it returns 0).

- [ ] **Step 5: Fix the reader**

In `helpers.ts` replace `notificationsRes?.data?.unreadCount || 0` with `notificationsRes?.data?.unreadcount || 0`. Re-run; Expected: PASS.

- [ ] **Step 6: Commit** (after diff approval): `fix: forward event url and time and read the unread notification count`.

---

### Task 3: Courses, assignments, statistics, course contents DTOs

**Files:** `packages/backend/moodle/moodle-courses/moodle-courses-dto.ts`, `moodle-assignments/moodle-assignments-dto.ts`, `moodle-statistics/moodle-statistics-dto.ts`, `moodle-course-contents/moodle-course-contents-dto.ts`.

- [ ] **Step 1: Pin each contract**

For every DTO listed below, make the class `implements` the core type and run `pnpm --filter @universe/backend typecheck`. Each mismatch the compiler reports is a drift item: fix it on the side that is wrong (the DTO is the truth for what the service returns; read the service's mapping to be sure) and write it in the PR description.

| DTO class                              | implements                       |
| -------------------------------------- | -------------------------------- |
| `MoodleCoursesDto`                     | `MoodleCourse`                   |
| `AssignmentItemDto`                    | `Assignment`                     |
| `SubmissionStatusDto`                  | `SubmissionStatus`               |
| `StatisticsDto`                        | `CourseStatistics`               |
| `CourseContentDto` / `CourseModuleDto` | `CourseSection` / `CourseModule` |

Known mismatches to expect: `AssignmentItemDto.year` is `string | null` while `Assignment.year` is `number | null`; `MoodleCoursesDto` has no `summary` although the service returns it; `CourseModuleDto.modname` is optional while the frontend requires it; the frontend `CourseModule` has `instance`, `contents`, `duedate`, `dueUnixSec` that `CourseModuleDto` does not declare. For each, read the service output first, then decide (extend the DTO if the service returns the field, or make the core field optional or remove it if no endpoint supplies it and no UI reads it; `grep -rn "<field>" packages/uni-hub` decides).

- [ ] **Step 2: Add a test where behavior changes**

If a service mapping changes (for example a new field is forwarded), add the failing service spec case first, as in Task 2.

- [ ] **Step 3: Verify and commit** (after diff approval)

Run `pnpm --filter @universe/backend typecheck && pnpm --filter @universe/backend test -- moodle`. Expected: pass. Commit: `refactor(backend): implement shared Moodle contracts in DTOs`.

---

### Task 4: Grades and auth DTOs

**Files:** `packages/backend/moodle/moodle-grades/moodle-grades-dto.ts`, `packages/backend/auth/dto/auth-response.dto.ts`, `google-auth-response.dto.ts`, `logout-response.dto.ts`.

- [ ] **Step 1: Compare `Grade` with `MoodleGradeItemDto`**

`MoodleGradeItemDto` already `implements Partial<StudentRecordBookItem>`. Run:

```bash
grep -rnE "course_name|rawgrade\b|\.year\b" packages/uni-hub --include='*.ts' --include='*.tsx' --exclude-dir=node_modules --exclude-dir=.next | grep -iE "grade"
```

For each frontend-only field of `Grade` (`course_name`, `rawgrade`, `year`, `credits`) decide: supplied by the backend (add it to the DTO and service with a test), or read only as a defensive fallback (delete the fallback and the field). `resolveGradesResponse` in `views/dashboard/hooks/helpers.ts` is where such fallbacks live. Update `Grade` in core to match and make `MoodleGradeItemDto` implement `Grade`. Keep or add tests in `helpers.test.ts` for the surviving behavior.

- [ ] **Step 2: Auth DTOs**

Make `AuthResponseDto implements AuthResponse`, `GoogleAuthResponseDto implements GoogleAuthResponse`, `LogoutResponseDto implements LogoutResponse`, importing from `@universe/core/types/auth`.

- [ ] **Step 3: Verify and commit** (after diff approval)

Run `pnpm --filter @universe/backend typecheck && pnpm --filter @universe/backend test`. Commit: `refactor(backend): implement shared grade and auth contracts`.

---

### Task 5: Frontend imports the core contracts

**Files:** `packages/uni-hub/types.ts` and every file that imports one of the moved names from `@uni-hub/types` (about 29), `packages/uni-hub/services/api.moodle.ts`, `api.auth.ts`.

- [ ] **Step 1: Delete the Moodle block from `types.ts`**

Remove `Course`, `GradeValue`, `Grade`, `Assignment`, `MoodleEvent`, `Notification`, `NotificationsResponse`, `AuthResponse`, `CourseStatistics`, `COURSE_MODULE_NAMES`, `CourseModuleName`, `CourseModuleFile`, `CourseModule`, `CourseSection` and the now unused `ControlType` import. If the file becomes empty, delete it and fix any remaining importer.

- [ ] **Step 2: Update every importer**

List them: `grep -rln "from '@uni-hub/types'" packages/uni-hub packages/ui --include='*.ts' --include='*.tsx' --exclude-dir=node_modules --exclude-dir=.next`. In each file replace the import with `@core/types/moodle` (interfaces; `Course` becomes `MoodleCourse`), `@core/constants/moodle` (`COURSE_MODULE_NAMES`, `CourseModuleName`) and `@core/types/auth` (`AuthResponse`, plus the Google response type that `api.auth.ts` declares locally). In `api.moodle.ts` replace inline casts (`as Array<{ itemid?: number }>`, `{ status?: string; grade?: string }`) with `UploadedFile[]` and `SubmissionStatus`. In `api.auth.ts` delete local response interfaces in favor of the core ones and remove reads of `token`, `refresh_token`, `userID` that no endpoint returns (`grep` each before deleting).

- [ ] **Step 3: Verify**

Run `pnpm --filter @universe/uni-hub typecheck && pnpm --filter @universe/uni-hub test && pnpm lint`. Then: `grep -rn "@uni-hub/types" packages --include='*.ts' --include='*.tsx' --exclude-dir=node_modules --exclude-dir=.next` Expected: no output (or only non-API UI types that genuinely remain).

- [ ] **Step 4: Commit** (after diff approval): `refactor(uni-hub): import Moodle and auth contracts from @universe/core`.

---

### Task 6: Full verification and handoff

- [ ] **Step 1: Run the pipeline**

`pnpm lint`, `pnpm lint:style`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and prettier on changed files. Expected: zero errors and zero warnings.

- [ ] **Step 2: Report**

List every drift decision (notifications, events, courses, assignments, grades, auth) for the PR description, mention that the unread notification count and the event time were broken before this PR, and ask before pushing and adding the branch with `gh stack add refactor/moodle-shared-contracts`.
