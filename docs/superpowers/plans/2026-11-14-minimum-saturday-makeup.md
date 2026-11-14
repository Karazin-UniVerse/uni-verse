# Minimum Saturday Makeup Implementation Plan

**Goal:** Preserve short-semester teaching hours using the proven minimum number of additional Saturday dates.

**Architecture:** Extend the existing core solver rather than add a second scheduler. Track compensation at version level so reload, publication, adjustment and rescheduling use the same authorization without changing the shared semester calendar.

**Tech Stack:** TypeScript, Node test runner, NestJS, Prisma/PostgreSQL, Jest.

**Spec:** `docs/superpowers/specs/2026-11-14-minimum-saturday-makeup-design.md`

## Global constraints

- Automatic compensation applies only below `DEFAULT_NOMINAL_WEEKS` (16).
- No changed academic hours, relaxed hard constraints, Sunday lessons or semester extension.
- Minimize additional Saturday dates globally; never claim optimality after an incomplete search.
- Preserve manual makeup-day semantics and existing request payloads.
- Additive schema changes only; no seed, local database cleanup or unapproved migration execution.
- Preserve existing user changes; do not commit or push implementation without authorization.

## Review focus

- Midweek starts and excluded dates must not lose required occurrences.
- Manual makeup Saturdays must not double-compensate an assignment.
- A Saturday-only assignment must not distort the additional-date objective.
- A solver timeout must not masquerade as proven infeasibility or optimality.
- Compensation must survive save/reload and all downstream timetable operations.

## Task 1: Version-specific authorization and shared contracts

**Files:** `packages/core/types/timetable.ts`, `packages/backend/prisma/schema.prisma`, new additive SQL under `packages/backend/prisma/scripts/`, `packages/backend/timetable/timetable.helpers.ts`.

**Interface:** Add `automaticMakeupDates: string[]` to candidate metadata, defaulting to an empty list for existing versions. Persist the same list on `TimetableVersion` with an additive default. Keep these dates separate from `SemesterCalendar.makeupSaturdays`.

- [ ] Add failing contract/helper tests: existing versions authorize no automatic dates; a mixed-origin automatic Saturday is authorized without inventing `followsWeekday`.
- [ ] Implement the additive field, shared metadata and context-to-event conversion. Reuse existing date parsing and conflict interfaces.
- [ ] Generate Prisma client without applying SQL to the user's database; run helper/contract tests and backend typecheck.

## Task 2: Short-semester occurrence accounting and minimum-date search

**Files:** `packages/core/utils/timetable.ts`, new focused compensation helper if needed, `packages/core/utils/tests/timetable-generator.test.ts`.

**Interfaces:** Keep `generateTimetableCandidates(params: GenerateTimetableParams): GenerateTimetableResult`. Successful candidates carry `automaticMakeupDates`. Use the existing search-limit error when available; otherwise add one explicit shared error for an exhausted timeout.

- [ ] Write failing fixtures for 14 weeks/16 required occurrences, a midweek start, multiple assignments sharing a mixed-origin Saturday, manual makeup overlap, excluded Saturdays, Saturday-only demands and unchanged 16/18-week calendars.
- [ ] Compute required nominal occurrences and the actual regular/manual occurrences; compensate only the difference. Preserve original demand identity and pair spans.
- [ ] Integrate regular slot decisions and compensation placement into one search: do not freeze a single weekday solution before minimizing Saturdays. Iterate the globally allowed additional-date count from zero upward, exploring date choices and eligible pairs under the existing hard constraints.
- [ ] Use one deadline across all passes and preference modes. Exhaust smaller-date-count searches before accepting a candidate at the next count; report timeout if minimum proof is incomplete.
- [ ] Add independent assertions: exact hours/counts, unique compensating occurrence IDs, actual dates within bounds, globally minimum date count on small exhaustively checkable fixtures, and valid conflict reports including fixed published occupancy.
- [ ] Run `pnpm --filter @universe/core test` and core typecheck; verify new regressions fail before implementation and pass afterward.

## Task 3: Persistence and downstream operations

**Files:** `packages/backend/timetable/timetable.service.ts`, `timetable-rescheduling.service.ts`, `timetable-reschedule-requests.service.ts`, matching specs, `packages/core/utils/timetable-rescheduling.ts` and its tests.

**Interface:** Persist candidate-specific `automaticMakeupDates` with each draft. Load that version's authorization alongside calendar context for publication, draft adjustment and rescheduling. Do not authorize a date merely because another candidate selected it.

- [ ] Add failing tests for generate/save/reload/publish, mixed-origin Saturday adjustment, instructor rescheduling requests, unrelated-version isolation and rejected conflicts.
- [ ] Persist metadata and propagate it through existing conversion and validation paths. Include authorization in stale-request context where changes affect applicability.
- [ ] Make persistence of a generation atomic: failures must not leave some candidate versions behind. Map proven infeasibility and search timeout distinctly without leaking database errors.
- [ ] Extend the dedicated PostgreSQL suite to verify persistence and atomic rollback with version metadata; execute only against its isolated database after explicitly approved schema setup.
- [ ] Verify schedules and ICS contain the saved compensating occurrences with stable identities and correct dates.

## Task 4: Verification and documentation

**Files:** `docs/timetable-api.md`; UI files only if error-contract integration requires it, with uk/en keys.

- [ ] Document automatic date metadata, opt-in by short-semester setting, timeout semantics and additive deployment SQL.
- [ ] Run prettier on changed files, `pnpm lint`, `pnpm lint:style`, `pnpm typecheck`, `pnpm test`, `pnpm build` and the approved isolated PostgreSQL checks.
- [ ] Review the complete diff independently using GPT 6.1 Sol CX. Fix confirmed findings and rerun affected checks.
- [ ] Report successful checks, warnings, unrun checks and database deployment requirements. Leave implementation uncommitted until requested.

## Execution

Recommended: native execution in this session, followed by an independent GPT 6.1 Sol CX review. Tasks depend tightly on the solver's occurrence model and version authorization; retaining that context avoids conflicting implementations. Use test-driven changes for every task.
