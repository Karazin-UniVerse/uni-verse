# Timetable Rescheduling Requests Implementation Plan

> **For agentic workers:** Implement task-by-task using the harness-native workflow or approved subagent-driven execution. The referenced `superpowers:executing-plans` and `superpowers:subagent-driven-development` skills are not installed; do not invent them. Each task requires a failing test, minimal implementation and verification. Execution starts after user review and execution-method selection.

**Goal:** Deliver approved instructor rescheduling requests, safe administrator single/series moves and mobile-friendly timetable interfaces.

**Architecture:** Extend the existing timetable module with one rescheduling service shared by direct administrator moves and request approval. Persist proposals, occurrence snapshots and audit records additively; reuse core conflict checking and serialize competing timetable writes. Keep timetable-specific UI in uni-hub and shared contracts in core.

**Tech Stack:** Existing NestJS, Prisma/PostgreSQL, Next.js, React, TanStack Query, SCSS Modules, Jest and Vitest/RTL; no new product dependency.

**Spec:** `docs/superpowers/specs/2026-11-13-timetable-reschedule-requests-design.md`

## Global Constraints

- “Past classes remain unchanged.” Use `Europe/Kyiv` and pair start times, not the server's local date.
- “Every affected date must remain conflict-free.” Reject the whole operation on any conflict.
- “No hours, assignment membership or teaching type are changed.” Preserve recurrence intervals and occurrence count.
- “No reseeding or destructive schema reset.” Back up the local database before applying additive SQL.
- All shared contracts live in core; all UI strings have Ukrainian and English keys. Use existing design tokens and breakpoints.
- Verify mobile widths at 320, 375, 390 and 768 CSS pixels. Only internal dense-table scrolling is allowed.
- Preserve `CONSTRAINTS.md`; never skip tests, lower thresholds or suppress checks to pass.
- Read applicable repository instructions and skills before each implementation task; fetch current framework/API documentation through Context7 before using those APIs. Stay in the existing `feature/timetable` worktree.

## Review Focus

1. A DST transition must preserve local teaching dates and recurrence spacing, not shift the target day (Task 2).
2. Another weekly slot of the same assignment must not be accidentally included in a series move (Task 2).
3. A duplicate click or concurrent decision must not create duplicate application/audit records (Tasks 3 and 5).
4. A published replacement or stream-membership change must invalidate a pending proposal (Tasks 2 and 3).
5. A long reason, screen keyboard or narrow viewport must not hide decision controls or expand the page (Tasks 5 and 6).

---

## Task 1: Contracts, additive persistence and stable event identity

**Files:** Modify `packages/core/constants/timetable.ts`, `packages/core/types/timetable.ts`, `packages/backend/prisma/schema.prisma`, `packages/backend/timetable/timetable.service.ts`, `packages/backend/timetable/timetable.service.spec.ts`, `docs/timetable-api.md`. Create `packages/backend/prisma/scripts/create-reschedule-requests.sql`.

**Interfaces:** Define `RESCHEDULE_SCOPE` (`ONCE`, `SERIES`), `RESCHEDULE_REQUEST_STATUS` (`PENDING`, `APPROVED`, `REJECTED`), `RescheduleProposalInput` (`eventId`, `newDate`, `newPair`, `scope`, `reason`), `RescheduleOccurrenceChange` (`eventId`, `oldDate`, `oldPair`, `newDate`, `newPair`), `ReschedulePreviewResponse` (`changes`), `RescheduleRequestResponse` and `RescheduleRequestPage` (`items`, `total`, `page`, `pageSize`). Extend the existing direct move contract rather than adding aliases. Event IDs remain UUIDs; actor IDs are strings.

- [ ] Add contract tests for scope/status parity with Prisma and calendar tests asserting personal event `id === databaseEvent.id` and an unchanged iCal UID before/after moving an occurrence.
- [ ] Run `pnpm --filter @universe/backend test -- --runInBand timetable.contracts timetable.service`; confirm the added assertions fail for missing contracts or unstable identity.
- [ ] Add `TimetableRescheduleRequest`, `TimetableRescheduleOccurrence` and `TimetableRescheduleAudit` models. Requests store actor, event, target, scope, reason, status, reviewer, decision explanation and timestamps. Occurrences store source/target times and JSON source context, unique per request/event. Audit rows store actor, optional request, event, reason, before/after values and timestamp; prevent duplicate request/event audits with a unique constraint. Use existing user/event relation conventions.
- [ ] Separate personal-event database ID from subscription UID. Preserve an existing occurrence's `stableKey` through rescheduling; retain its current UID derivation/fallback for existing subscriptions. Inspect publication replacement behavior and add a regression test before changing matching logic. Update schedule clients/tests to use the database event ID, not the UID.
- [ ] Document additive SQL application, reason limit 1000 characters, decision explanation limit 1000 characters, default page size 20 and maximum 100. Back up the local database to the approved temp directory; apply only the reviewed SQL and run `pnpm --filter @universe/backend db:generate`. Do not run broad `db:push` scripts.
- [ ] Rerun targeted tests and `pnpm typecheck`; verify previously published event counts and stored preferences are unchanged. Commit the scoped deliverable.

## Task 2: Shared preview, validation and atomic application

**Files:** Create `packages/backend/timetable/timetable-rescheduling.service.ts` and `.spec.ts`; modify `timetable.module.ts`, `timetable.service.ts` and `.spec.ts` in that directory. Add `packages/backend/timetable/timetable-write-lock.ts` and `packages/backend/test/timetable-rescheduling-postgres.spec.ts` with a dedicated `packages/backend/test/jest-timetable-postgres.json` configuration.

**Interfaces:** `TimetableReschedulingService.preview(input: RescheduleProposalInput, actorId: string, mode: 'INSTRUCTOR' | 'ADMIN'): Promise<ReschedulePreviewResponse>`; internal `buildProposal(tx, input, actorId, mode)` returns changes and complete source context; `apply(tx, proposal, actorId, requestId?): Promise<ReschedulePreviewResponse>`. Use the generated Prisma transaction-client type. `lockTimetableWrites(tx, semesterCalendarIds: string[]): Promise<void>` locks sorted unique semester rows with parameterized `SELECT ... FOR UPDATE` before occupancy reads.

- [ ] Write failing tests for single moves, same-assignment/different-weekday exclusion, alternating-week series, DST-crossing offsets, cancelled occurrences, started source/target, semester overflow, Saturday-only and multi-pair boundaries. Assert unchanged hours and IDs.
- [ ] Add failing conflict tests for teachers, groups, subgroups, shared streams, confirmed unavailability, self-conflicts among moved events and broken first-lecture ordering. Include occupancy from another plan/calendar on the same target dates.
- [ ] Run `pnpm --filter @universe/backend test -- --runInBand timetable-rescheduling`; confirm missing implementation failures.
- [ ] Implement calendar-day offsets using existing date helpers and authoritative Kyiv pair instants. Build the source series by version, assignment, weekday, pair and membership context. Validate source/target eligibility, all changed dates and complete lecture-order context using existing core helpers; do not convert soft preferences into hard constraints.
- [ ] Route direct administrator rescheduling through the new service. Acquire the lock in both rescheduling and publication before occupancy reads. Lock all overlapping calendars in deterministic order; re-read state after locking. Audit and update events in one Serializable transaction, preserving stable keys; translate serialization/deadlock failures to conflict responses.
- [ ] Add runnable PostgreSQL concurrency tests using an explicitly configured isolated test database: two moves into the same teacher slot, publication versus move, and rollback after an audit/write failure. Assert at most one conflicting write commits and no partial mutations. Refuse to run against the user's local `test` database; own and clean up only test fixtures.
- [ ] Run the unit tests and `pnpm --filter @universe/backend exec node --experimental-vm-modules node_modules/jest/bin/jest.js --config test/jest-timetable-postgres.json --runInBand`; require actual PostgreSQL evidence. Commit the scoped deliverable.

## Task 3: Request submission, ownership and decisions

**Files:** Create `packages/backend/timetable/timetable-reschedule-requests.service.ts` and `.spec.ts`, `dto/reschedule-request.dto.ts`; modify `timetable.controller.ts`, `.spec.ts`, `timetable.module.ts`, `dto/index.ts`, `dto/reschedule-event.dto.ts`, `dto/timetable-dto.spec.ts` and the Task 2 PostgreSQL tests.

**Interfaces:** Request service exposes `create(userId, input)`, `listMine(userId, query)`, `listForReview(query)`, `approve(requestId, reviewerId)`, `reject(requestId, reviewerId, explanation)`. Responses use Task 1 contracts. Endpoints under `/timetable`: `POST /my/reschedule-requests`, `GET /my/reschedule-requests`, `GET /reschedule-requests`, `POST /reschedule-requests/:id/approve`, `POST /reschedule-requests/:id/reject`, and `POST /reschedule-preview`. Keep `PATCH /events/:id/reschedule` admin-only, with explicit scope/reason and the shared result contract.

- [ ] Write failing DTO/controller tests for blank/oversized reasons, invalid dates/pairs/scopes/pages, forged actors, instructor ownership and admin-only review/direct moves. Trim reasons before validation. Assert submit changes no published event.
- [ ] Write failing service tests for pending-only transitions, rejection explanation persistence, changed source times, changed stream membership, changed series set and replaced publication. Assert stale/conflicting approval leaves the request pending and events unchanged.
- [ ] Run `pnpm --filter @universe/backend test -- --runInBand timetable-reschedule-requests timetable.controller timetable-dto`; confirm failures.
- [ ] Implement role and ownership checks from session identity. Submission stores the previewed occurrence set and source context. Approval locks the request and relevant semester state, rebuilds the proposal and compares stored context before applying Task 2's shared mechanism. Rejection locks the request and updates only decision fields. Paginate lists with bounded page size and deterministic timestamp/ID ordering.
- [ ] Extend PostgreSQL checks for approve/approve and approve/reject races; assert one decision and one audit set at most. Run targeted tests and integration checks, then commit the scoped deliverable.

## Task 4: API client and query state

**Files:** Modify `packages/uni-hub/services/api.timetable.ts` and `.test.ts`; create `packages/uni-hub/components/timetable/rescheduleQueries.ts` and `.test.ts`.

**Interfaces:** Client methods `previewReschedule`, `createRescheduleRequest`, `listMyRescheduleRequests`, `listRescheduleRequests`, `approveRescheduleRequest`, `rejectRescheduleRequest`; update `rescheduleEvent` to Task 3's contract. Query keys include current user ID, role-specific list type, pagination and filters. Share schedule invalidation keys with the actual schedule loader rather than inventing an unused key.

- [ ] Add failing client tests asserting exact methods, routes, payloads and error propagation. Add query tests that different users cannot reuse another user's cached request list.
- [ ] Run `pnpm --filter @universe/uni-hub test -- services/api.timetable.test.ts components/timetable/rescheduleQueries.test.ts`; confirm failures.
- [ ] Implement typed client methods and query options. Invalidate schedule and request data after successful application, request lists after submission/rejection, and keep failures visible. Update all existing direct-move callers atomically with the signature change.
- [ ] Rerun the tests and frontend typecheck, then commit the scoped deliverable.

## Task 5: Request and review interface

**Files:** Create `packages/uni-hub/components/timetable/RescheduleDialog.tsx`, `.module.scss`, `.test.tsx`, `RescheduleRequests.tsx`, `.module.scss`, `.test.tsx`; modify `components/schedule/ScheduleView.tsx`, `.test.tsx`, `ScheduleView.types.ts`, `hooks/useMySchedule.ts` and its tests, plus `i18n/locales/uk.ts` and `en.ts`.

**Interfaces:** `RescheduleDialog` takes the selected event, instructor/admin mode, close and successful-write callbacks; it loads and displays the complete preview before submission. `RescheduleRequests` takes instructor/admin mode and uses the authenticated user's scoped queries. These remain portal-specific components, not Una primitives.

- [ ] Write failing RTL tests: instructor-owned event action, no action for another teacher, scope selection, previewed occurrence list, required reason, pending/failed/successful submit, retained fields on conflict and double-click suppression.
- [ ] Write failing review tests for paginated pending/empty/error lists, approve, rejection with explanation, stale request conflict and instructor status history. Verify keyboard focus and accessible names for all controls.
- [ ] Run `pnpm --filter @universe/uni-hub test -- components/timetable/RescheduleDialog.test.tsx components/timetable/RescheduleRequests.test.tsx components/schedule/ScheduleView.test.tsx`; confirm failures.
- [ ] Implement the shared dialog and role-specific request list with existing Una controls, Ukrainian/English strings and TanStack Query. Remove the old inline form rather than retaining parallel flows. Use real event IDs; preserve input after failure and invalidate/refetch published schedule after successful application.
- [ ] Rerun tests, lint and typecheck. Commit the scoped deliverable.

## Task 6: Mobile layout and end-to-end verification

**Files:** Modify `packages/uni-hub/components/schedule/ScheduleView.module.scss`, `ScheduleWeekView.tsx`, `ScheduleWeekDayCard.tsx`, `ScheduleToolbar.tsx`, `ScheduleMonthDayCell.tsx` and corresponding tests only as needed; modify `components/timetable/TimetableManagement.module.scss`, `TeacherSlotPreferences.module.scss` and the new Task 5 components. Update `docs/timetable-api.md` with the finished workflow and verification evidence.

**Interfaces:** Preserve desktop component props and six-day calendar. Use existing `BREAKPOINTS` and SCSS design tokens; no new responsive JavaScript framework or duplicated mobile business logic.

- [ ] User-requested addition: expose a localized positive-integer teaching-weeks field in dean timetable settings using existing `getSemesterCalendar` / `configureSemesterCalendar` methods. Add failing backend tests preventing duration changes that exclude already published occurrences and frontend tests loading/saving non-16 values and blocking generation after failed save. Preserve workload hours; exercise generation and series boundaries for a 14-week and an 18-week calendar. Reuse persisted calendar dates and exceptions rather than resetting them when only changing duration. Save valid settings before generation; do not silently rewrite historical events.

- [ ] Add failing component tests for reachable event/request actions, full accessible labels despite truncation, loading/error/empty states and long reason text. Do not claim DOM-only tests prove layout.
- [ ] Run the relevant frontend tests and confirm new assertions fail before implementation.
- [ ] Apply minimal responsive styles: stacked controls, wrapping actions, bounded dialogs with internal scrolling, `min-width: 0` where required and labeled internal table scrolling. Preserve all essential event and decision information.
- [ ] Start the real local backend/frontend without duplicating listeners. Run browser checks at 320, 375, 390, 768 and desktop widths: submit as instructor, approve/reject/direct-move as admin, simulate server conflict, use keyboard and long text. Assert `document.documentElement.scrollWidth <= window.innerWidth`, capture screenshots and inspect console/network failures. Test the dialog with a reduced visual viewport representing an open keyboard; record any physical-device limitation.
- [ ] Run `pnpm lint`, `pnpm lint:style`, `pnpm typecheck`, `pnpm test`, `pnpm build`, changed-file `pnpm exec prettier --check` and `git diff --check`. Run backend coverage and the isolated PostgreSQL checks. Disclose pre-existing warnings, unavailable tools or failed checks precisely; never report unrun flows as passed.
- [ ] Request independent whole-diff review using the user-approved execution method/model. Fix verified findings, rerun affected checks and commit. Do not push; provide the normal push command to the user when requested.

## Self-review and handoff

Spec coverage: Task 1 owns persistence/audit/identity; Task 2 owns series/calendar/conflicts/concurrent writes; Task 3 owns roles/requests/decisions; Task 4 owns client/cache boundaries; Task 5 owns user flows; Task 6 owns responsive/browser and full verification. The five review-focus risks each have explicit tests above. No application code has been changed by this plan.

Recommended execution: native implementation in this session, sequentially, with one independent final review using the already permitted model. Tasks share transaction and contract boundaries, so parallel implementation offers little benefit. The user must review this plan and select native or subagent-driven execution before coding starts.
