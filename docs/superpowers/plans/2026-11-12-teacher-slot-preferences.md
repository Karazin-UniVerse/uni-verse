# Teacher Slot Preferences Implementation Plan

> **For agentic workers:** Implement task-by-task with test-driven development and verification before completion. Preserve existing uncommitted fixes. Use the execution method selected by the user.

**Goal:** Let teachers save semester-specific slot preferences that influence strict-first timetable generation.

**Architecture:** PostgreSQL stores non-neutral recurring preferences for each teacher and semester. Session-scoped endpoints save a complete grid atomically. The existing solver searches strict candidates first, then relaxed candidates within the same deadline; the UI exposes the teacher grid and candidate warnings.

**Tech Stack:** Prisma/PostgreSQL, NestJS, shared TypeScript contracts, existing CSP solver, React/Una/SCSS Modules.

**Spec:** `docs/superpowers/specs/2026-11-12-teacher-slot-preferences-design.md`

## Global Constraints

- Monday–Saturday grid using the existing bell schedule; semester selection is explicit.
- Neutral cells are absent from storage; each teacher/semester/weekday/pair combination is unique.
- Teacher identity comes from the authenticated session, never a client-supplied teacher ID.
- Mandatory scheduling constraints and workload hours remain unchanged in both passes.
- Test identity is local data, not production authorization logic.
- No new dependencies; translated UI, keyboard-accessible controls, existing design tokens.
- Preserve pending metadata and calendar UI fixes separately; do not reset or seed local data.

## Review Focus

- Saving an empty grid clears only that teacher's selected semester.
- Concurrent grid saves never expose a partially replaced grid.
- Timeout during strict search is not reported as proof of infeasibility.
- Relaxed generation does not duplicate strict candidates or relax confirmed unavailability.
- A preferred Saturday or late pair never overrides calendar/authorization restrictions.

### Task 1: Preference persistence and authenticated API

**Files:** `packages/backend/prisma/schema.prisma`, a matching additive SQL script under `packages/backend/prisma/scripts/`, `packages/core/types/timetable.ts`, `packages/core/constants/timetable.ts`, new DTO files under `packages/backend/timetable/dto/`, `packages/backend/timetable/timetable.controller.ts`, `packages/backend/timetable/timetable.service.ts`, their existing tests, `docs/timetable-api.md`.

**Interfaces:** Shared `TeacherSlotPreference` contains `teacherId`, `semesterCalendarId`, `weekday`, `pair`, and `preference` (`PREFERRED` or `UNDESIRABLE`). `SaveTeacherSlotPreferencesRequest` contains a `slots` array without teacher/semester identifiers. `GET` and `PUT /timetable/my/slot-preferences/:semesterCalendarId` return `TeacherSlotPreference[]`; PUT replaces the complete selected grid.

- [ ] Add failing tests for round-trip storage, empty-grid clearing, semester/user isolation, non-teacher access, invalid UUID/weekday/pair/state, duplicate cells, oversized grids, and transactional replacement rollback.
- [ ] Run backend tests and confirm failures reflect the missing feature.
- [ ] Add a preference model with compound uniqueness and restrictive teacher/semester relations. Derive valid weekdays/pairs and maximum grid size from existing constants. Implement validated DTOs, session-derived identity, current teacher-role authorization, semester existence checks, and atomic replacement with serializable transaction handling following repository patterns.
- [ ] Run backend tests, Prisma validation/generation, and typecheck. Document additive migration and API. Back up before applying schema updates locally; never reset the database.

### Task 2: Strict-first solver and candidate diagnostics

**Files:** `packages/core/types/timetable.ts`, `packages/core/constants/timetable.ts`, `packages/core/utils/timetable.ts`, `packages/core/utils/tests/timetable-generator.test.ts`, `packages/backend/timetable/timetable.service.ts`, `packages/backend/timetable/timetable.service.spec.ts`.

**Interfaces:** Add optional `preferences: TeacherSlotPreference[]` to `GenerateTimetableParams`. Extend `TimetableCandidate` with `preferenceViolations`, containing teacher ID, date, pair, and event ID for each undesirable occurrence. Existing calls without preferences retain their behavior.

- [ ] Write failing tests for preferred placement, strict exclusion, relaxed fallback, strict-before-relaxed ranking, duplicate suppression, no preferences, multi-teacher isolation, shared overall timeout, confirmed unavailability, and forbidden Saturday/late slots.
- [ ] Confirm failures before implementation.
- [ ] Load saved preferences scoped to the semester and active demand teachers. Retain the existing solver as the search engine, adding strict/relaxed slot filtering and preference-aware ordering. Reserve half the overall deadline for the initial strict pass, retaining unused time for fallback. Search relaxed only when fewer than `maxCandidates` strict candidates exist; exclude duplicate schedules and sort strict candidates ahead of relaxed ones. All mandatory checks remain active. Return accurate diagnostics without claiming global optimality or infeasibility from timeout.
- [ ] Run the core and backend suites, including pending lecture-precedence regressions. Ensure saved draft responses retain preference violations needed by the preview.

### Task 3: Teacher grid and candidate warnings

**Files:** new application components/tests under `packages/uni-hub/components/timetable/`, `packages/uni-hub/components/schedule/ScheduleView.tsx`, `packages/uni-hub/services/api.timetable.ts` and its tests, `packages/uni-hub/components/timetable/TimetableManagement.tsx` and tests, both locale files.

**Interfaces:** Client methods `getMySlotPreferences(semesterCalendarId)` and `saveMySlotPreferences(semesterCalendarId, request)` use Task 1 contracts. A focused `TeacherSlotPreferences` application component handles explicit semester selection, load/save/error state, and the grid; schedule view only composes it for teachers.

- [ ] Add failing RTL tests for cycling neutral/preferred/undesirable, keyboard operation and state labels, saving/reloading, clearing, failed-save retention, semester changes without silently losing edits, and unauthorized visibility. Add candidate preview tests showing undesirable violations only for relaxed results.
- [ ] Confirm failures, then implement using existing semester API and bell schedule. If a semester listing API is missing, expose a minimal teacher-authorized list rather than hardcoding semester IDs. Keep preference state out of the existing large schedule component. Use translated labels and design tokens; pending edits must be saved or explicitly discarded before changing semester.
- [ ] Run frontend tests, typecheck, formatting and style checks. Verify a long teacher name and narrow viewport without overflowing the grid.

### Task 4: Local test teacher and end-to-end verification

**Files:** No production identity special cases. Update documentation only if local setup needs repeatable commands.

- [ ] Inspect `csai_test1@karazin.ua`, current teacher roles, and assignments attributed to Даас Т.І.; back up affected records. Preserve IDs and existing roles. Add teacher role and display name only to the verified test account, linking only workload confirmed to belong to that teacher. Stop for clarification if matching is ambiguous.
- [ ] Verify through authenticated APIs that this teacher can save/reload preferences and another user cannot edit them. Generate from saved workload and inspect strict/relaxed results without publishing or altering historical events.
- [ ] Run `pnpm lint`, `pnpm lint:style`, `pnpm typecheck`, `pnpm test`, `pnpm build`, changed-file Prettier and `git diff --check`. Report failures and unavailable browser checks without suppressing them.
- [ ] Review scoped changes independently, resolve valid findings, and report migration/runtime restart requirements. Commit only intended files; do not push without user authorization.
