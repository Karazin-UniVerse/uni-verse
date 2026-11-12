# Manual Timetable Adjustments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide the dean's office with manual timetable slot adjustments for draft candidates and date/pair rescheduling for published events, validating student and teacher conflicts in real time.

**Architecture:** Extend `@universe/core` with slot adjustment calculations and DTO contracts. Implement `PATCH /timetable/versions/:versionId/slots` and `PATCH /timetable/events/:id/reschedule` in NestJS with transactional verification via `checkTimetableConflicts`. Integrate modal interfaces into `TimetableManagement` and `ScheduleView` in `@universe/uni-hub`.

**Tech Stack:** Next.js 16, React 19, NestJS 12, PostgreSQL (Prisma 7), `@universe/core`, Vitest, Jest.

**Spec:** `docs/superpowers/specs/2026-11-12-manual-timetable-adjustments-design.md`

## Global Constraints

- Never allow student overlap (`STUDENT_OVERLAP`) across groups, subgroups, or streams.
- Never allow teacher overlap (`TEACHER_OVERLAP`) for assigned instructors.
- Saturday-only disciplines cannot move to weekdays; weekday classes cannot move to Saturday without an approved makeup day.
- Every user-facing UI string must use i18n translation keys in both `uk.ts` and `en.ts`.
- Zero warnings under `oxlint --deny-warnings` and `stylelint`.

## Review Focus

1. **Simultaneous group collision**: Moving a practice to a slot where another group practice or stream lecture is already scheduled must return `409 Conflict`.
2. **Teacher unavailability collision**: Rescheduling a class to a slot where the teacher has confirmed unavailability must return `409 Conflict`.
3. **Draft slot recurrence shift**: Moving a draft slot must update all recurring semester dates for that teaching assignment proportionally without altering unaffected disciplines.
4. **iCal feed synchronization**: Rescheduling a published event must update its timestamp/pair in subsequent `GET /timetable/calendar/feed/:token` outputs with unchanged `UID`.
5. **Role boundary**: Non-admin users cannot call draft slot adjustment or event rescheduling endpoints (`403 Forbidden`).

---

### Task 1: Core contracts & DTOs for manual adjustments

**Files:**

- Modify: `packages/core/types/timetable.ts`
- Modify: `packages/core/constants/timetable.ts`
- Test: `packages/core/utils/tests/timetable.test.ts`

**Interfaces:**

- Produces: `AdjustDraftSlotRequest`, `RescheduleEventRequest` in `@universe/core/types/timetable`.

- [ ] **Step 1: Write the failing tests in `packages/core/utils/tests/timetable.test.ts`**
      Assert that shifting a scheduled event's pair causes `checkTimetableConflicts` to detect conflict if another event occupies that slot for either teacher or student group.

- [ ] **Step 2: Run test to verify it fails**
      Run: `pnpm --filter @universe/core test`

- [ ] **Step 3: Define types in `packages/core/types/timetable.ts`**
      Add `AdjustDraftSlotRequest` and `RescheduleEventRequest` interfaces matching the spec.

- [ ] **Step 4: Run test to verify it passes**
      Run: `pnpm --filter @universe/core test`
      Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add packages/core/
  git commit -m "feat(core): contracts for manual timetable adjustments"
  ```

---

### Task 2: Backend endpoints for draft slot adjustment and event rescheduling

**Files:**

- Create: `packages/backend/timetable/dto/adjust-draft-slot.dto.ts`
- Create: `packages/backend/timetable/dto/reschedule-event.dto.ts`
- Modify: `packages/backend/timetable/dto/index.ts`
- Modify: `packages/backend/timetable/timetable.service.ts`
- Modify: `packages/backend/timetable/timetable.controller.ts`
- Test: `packages/backend/timetable/timetable.service.spec.ts`
- Test: `packages/backend/timetable/timetable.controller.spec.ts`

**Interfaces:**

- Consumes: `AdjustDraftSlotRequest`, `RescheduleEventRequest` from `@universe/core/types/timetable`.
- Produces: `PATCH /timetable/versions/:versionId/slots`, `PATCH /timetable/events/:id/reschedule`.

- [ ] **Step 1: Write failing unit tests in `timetable.service.spec.ts`**
  - Test `adjustDraftSlot` rejects when new slot creates teacher or student conflict (`ConflictException`).
  - Test `adjustDraftSlot` successfully updates all events of the draft slot when conflict-free.
  - Test `rescheduleEvent` rejects conflicting slot and updates single published event when valid.
  - Test `timetable.controller.spec.ts` enforces `assertAdmin` on both endpoints.

- [ ] **Step 2: Run test to verify it fails**
      Run: `pnpm --filter @universe/backend test -- timetable`
      Expected: FAIL with missing methods.

- [ ] **Step 3: Implement DTOs and service methods**
  - Create `AdjustDraftSlotDto` and `RescheduleEventDto` with `class-validator` rules.
  - In `TimetableService`, implement `adjustDraftSlot(versionId, dto)` and `rescheduleEvent(eventId, dto)`.
  - Validate candidate with `checkTimetableConflicts` before writing to database.
  - Expose in `TimetableController` with `@Patch('versions/:versionId/slots')` and `@Patch('events/:id/reschedule')`.

- [ ] **Step 4: Run test to verify it passes**
      Run: `pnpm --filter @universe/backend test -- timetable`
      Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add packages/backend/
  git commit -m "feat(backend): endpoints for draft slot adjustment and event rescheduling"
  ```

---

### Task 3: Frontend API client and draft candidate adjustment UI

**Files:**

- Modify: `packages/uni-hub/services/api.timetable.ts`
- Modify: `packages/uni-hub/services/api.timetable.test.ts`
- Modify: `packages/uni-hub/components/timetable/TimetableManagement.tsx`
- Modify: `packages/uni-hub/components/timetable/TimetableManagement.test.tsx`
- Modify: `packages/uni-hub/i18n/locales/uk.ts`
- Modify: `packages/uni-hub/i18n/locales/en.ts`

**Interfaces:**

- Consumes: `PATCH /timetable/versions/:versionId/slots`.

- [ ] **Step 1: Write failing tests in `api.timetable.test.ts` and `TimetableManagement.test.tsx`**
  - Test `timetableApi.adjustDraftSlot` issues PATCH request.
  - Test clicking "Edit slot" opens modal and selecting new slot updates candidate preview.

- [ ] **Step 2: Run test to verify it fails**
      Run: `pnpm --filter @universe/uni-hub test -- TimetableManagement api.timetable`

- [ ] **Step 3: Implement draft slot adjustment modal and API integration**
  - Add `adjustDraftSlot` to `TimetableApi`.
  - Add action button on candidate grid event cards in `TimetableManagement.tsx`.
  - Open modal to select destination weekday and pair (1..7).
  - Add client-side conflict check before dispatching.
  - Update candidate events on success. Add localization keys in `uk.ts` and `en.ts`.

- [ ] **Step 4: Run test to verify it passes**
      Run: `pnpm --filter @universe/uni-hub test -- TimetableManagement api.timetable`
      Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add packages/uni-hub/
  git commit -m "feat(uni-hub): draft timetable slot adjustment modal and API"
  ```

---

### Task 4: Frontend published event rescheduling in ScheduleView

**Files:**

- Modify: `packages/uni-hub/services/api.timetable.ts`
- Modify: `packages/uni-hub/components/schedule/ScheduleView.tsx`
- Modify: `packages/uni-hub/components/schedule/ScheduleView.test.tsx`
- Modify: `packages/uni-hub/i18n/locales/uk.ts`
- Modify: `packages/uni-hub/i18n/locales/en.ts`

**Interfaces:**

- Consumes: `PATCH /timetable/events/:id/reschedule`.

- [ ] **Step 1: Write failing test in `ScheduleView.test.tsx`**
      Test that for `ADMIN` role, action "Reschedule event" is rendered and triggers `rescheduleEvent`.

- [ ] **Step 2: Run test to verify it fails**
      Run: `pnpm --filter @universe/uni-hub test -- ScheduleView`

- [ ] **Step 3: Implement rescheduling modal in `ScheduleView.tsx`**
  - Add `rescheduleEvent` to `TimetableApi`.
  - Add "Reschedule" action in Day/Week views for admins.
  - Modal with date picker, pair selector, and optional reason.
  - Handle `409 Conflict` response by displaying conflict details in toast/banner.
  - Update event in `useMySchedule` on success. Add localization keys in `uk.ts` and `en.ts`.

- [ ] **Step 4: Run test to verify it passes**
      Run: `pnpm --filter @universe/uni-hub test -- ScheduleView`
      Expected: PASS

- [ ] **Step 5: Run full project verification**
      Run: `pnpm lint:ox && pnpm typecheck && pnpm test`
      Expected: All checks pass with 0 errors.

- [ ] **Step 6: Commit**
  ```bash
  git add packages/uni-hub/
  git commit -m "feat(uni-hub): published timetable event rescheduling modal"
  ```
