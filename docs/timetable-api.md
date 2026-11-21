# Timetable API

## Automatic compensation dates (deployment prerequisite)

Short-semester candidates carry version-specific `automaticMakeupDates`. These
authorize mixed-origin compensating Saturday classes without modifying shared
`SemesterCalendar.makeupSaturdays` or authorizing dates for unrelated candidates.
Draft adjustment, publication, calendar validation and rescheduling use the saved
version dates. All candidate versions of one generation are persisted atomically.

Before deploying code that reads this field, apply the additive SQL and regenerate
the client against the explicitly selected database:

```bash
pnpm --filter @universe/backend exec prisma db execute --file prisma/scripts/add-automatic-makeup-dates.sql
pnpm --filter @universe/backend db:generate
```

This script adds an empty-default array to existing versions; it does not modify
their events or the shared semester calendar. It is not run automatically by the
development server.

## Study semester, elective slot and compact Saturdays (deployment prerequisite)

`CurriculumPlan.studySemester` is a nullable integer (1–8, counted from the first
year). It is optional on `POST /timetable/curriculum-plans`; its parity must match
`semester` (`1` for odd study semesters, `2` for even ones), otherwise the request
is rejected with HTTP 400. Existing plans keep `NULL` until the value is set.

Apply the additive script and regenerate the client against the explicitly
selected database before deploying code that reads the column (the script also adds
a `CHECK` that keeps the value between 1 and 8). Deploying the code first makes every
curriculum plan endpoint fail with "column does not exist":

```bash
pnpm --filter @universe/backend exec prisma db execute --file prisma/scripts/add-study-semester.sql
pnpm --filter @universe/backend db:generate
```

Rules driven by the study semester:

- **Reserved elective slot.** In study semesters 4–6 Wednesday pair 3 is kept free.
  The generator never places a class there, and the shared conflict validator
  reports the hard conflict `RESERVED_SLOT_OCCUPIED`, so draft adjustment,
  publication and rescheduling reject it too. The rule uses
  `curriculumPlan.studySemester` of the event's assignment.

`POST /timetable/plans/:id/generate` accepts an optional `compactSaturdays`
boolean. It matters only for semesters shorter than 16 weeks: after normal
generation the Saturdays with the fewest makeup classes are emptied by moving each
class to another Saturday of the same candidate when teacher, participant,
unavailability, late-pair, reserved-slot and lecture-before-practice rules and the
five-pair Saturday limit still hold. A compact candidate keeps
`automaticMakeupDates` but has an empty `automaticMakeupDays`.

Teacher slot preferences cover Monday to Friday only (`weekday` 1–5, at most 35
slots); Saturday rows are not accepted and are hidden from reads.

## Source-day compensation for 14 and 15 weeks

Generation uses a 16-week nominal weekday timetable and moves missing source days
onto distinct Saturdays inside the actual semester. Days are ordered by source
teaching week and then Monday through Friday; empty source days need no Saturday.
Pairs and source-week numerator/denominator are preserved. A Saturday never mixes
two different source days. Excluded dates, explicit makeup dates, occupancy and
five-pair teacher/participant limits remain enforced. If a whole day cannot fit,
the solver tries later Saturdays and other regular slots; it never drops hours.
There is no promise that every input has a feasible solution or that quality is
globally optimal. Other semester lengths retain the previous compensation policy.

Dense plans first try a guided target calendar inside half the remaining search
budget. Missing source occurrences enter the conflict table as Saturday events,
so ordinary slots are checked against Saturday-only lessons during selection.
Conservative lecture precedence is also propagated through that table. If the
guided calendar fails, flexible ordered Saturday placement runs with the remaining
overall budget. A failed guided calendar alone never proves infeasibility.
Saturday capacity counts distinct pairs independently per participant resource;
parallel classes of different groups are not added into one stream-wide load.

Each candidate includes `automaticMakeupDays: Array<{ date; sourceDate }>`.
`automaticMakeupDates` authorizes the target dates; mappings record their source
teaching days. Both are saved on the version in the same transaction. Existing
versions without mappings keep their saved events and date authorizations.

Before deploying code that reads the mappings, apply the additive script and
regenerate the client against the explicitly selected database:

```bash
pnpm --filter @universe/backend exec prisma db execute --file prisma/scripts/add-automatic-makeup-days.sql
pnpm --filter @universe/backend db:generate
```

The script adds an empty-default JSON array; it never rewrites existing events.
Publication checks mapping/date consistency and the current calendar. Draft edits
of assignments with mapped compensation are rejected with
`SOURCE_DAY_REGENERATION_REQUIRED`; regenerate the draft to change those slots.
Explicit published rescheduling retains its normal conflict checks and audit;
the source mapping remains historical provenance.

## Overview

The Timetable module manages academic groups, curriculum plans, teaching assignments, semester calendars, constraint-based timetable generation, atomic publication, and RFC 5545 `.ics` subscription feeds.

## Database Schema Synchronization

After updating `packages/backend/prisma/schema.prisma`, regenerate the Prisma client and push schema changes to PostgreSQL:

```bash
pnpm --filter @universe/backend db:generate
pnpm --filter @universe/backend db:push
```

## Endpoints & Authorization

All endpoints except the public `.ics` feed require a valid Bearer JWT (`AtGuard`). Administrative endpoints require the `ADMIN` role (Dean's office / Administrator).

| Method   | Path                                                   | Access                     | Description                                                                                                                    |
| -------- | ------------------------------------------------------ | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `POST`   | `/timetable/groups`                                    | `ADMIN`                    | Create an academic group with optional subgroups.                                                                              |
| `GET`    | `/timetable/streams`                                   | Authenticated              | List all lecture streams by name.                                                                                              |
| `GET`    | `/timetable/groups`                                    | Authenticated              | List all academic groups with subgroups.                                                                                       |
| `POST`   | `/timetable/curriculum-plans`                          | `ADMIN`                    | Create a curriculum plan (optional `studySemester` 1–8, parity must match `semester`).                                         |
| `GET`    | `/timetable/curriculum-plans/:id`                      | `ADMIN`                    | Get a curriculum plan with its teaching assignments.                                                                           |
| `POST`   | `/timetable/assignments`                               | `ADMIN`                    | Create a teaching assignment (`academicHours` even integer `2..400`, requires `groupId`, `subgroupId`, or `streamId`).         |
| `GET`    | `/timetable/assignments?curriculumPlanId=...`          | `ADMIN`                    | List teaching assignments for a curriculum plan.                                                                               |
| `GET`    | `/timetable/my/assignments`                            | Authenticated              | List teaching assignments assigned to the current teacher.                                                                     |
| `GET`    | `/timetable/my/slot-preferences/semesters`             | Instructor                 | List available semester calendars for recurring slot preferences.                                                              |
| `GET`    | `/timetable/my/slot-preferences/:semesterCalendarId`   | Instructor                 | Get current teacher's slot preferences for a specific semester.                                                                |
| `PUT`    | `/timetable/my/slot-preferences/:semesterCalendarId`   | Instructor                 | Replace current teacher's slot preferences for a semester atomically (Monday–Friday, max 35 slots).                            |
| `PUT`    | `/timetable/assignments/:id/meeting-url`               | Assigned Teacher / `ADMIN` | Update online meeting URL (`http`/`https`, max `2048` chars).                                                                  |
| `POST`   | `/timetable/calendar` (`/timetable/semester-calendar`) | `ADMIN`                    | Configure or upsert a semester calendar.                                                                                       |
| `GET`    | `/timetable/calendar` (`/timetable/semester-calendar`) | `ADMIN`                    | Get a semester calendar by `academicYear` and `semester`.                                                                      |
| `POST`   | `/timetable/teachers/:teacherId/unavailability`        | Self / `ADMIN`             | Submit a teacher unavailability slot request.                                                                                  |
| `PUT`    | `/timetable/unavailability/:id/confirm`                | `ADMIN`                    | Confirm or reject a teacher unavailability request.                                                                            |
| `POST`   | `/timetable/plans/:id/generate`                        | `ADMIN`                    | Generate up to `maxCandidates` (`1..5`, timeout `1..10000` ms, max `200` demands) draft versions; optional `compactSaturdays`. |
| `POST`   | `/timetable/versions/:id/publish`                      | `ADMIN`                    | Atomically validate and publish a draft timetable version.                                                                     |
| `POST`   | `/timetable/reschedule-preview`                        | Instructor / `ADMIN`       | Preview single (`ONCE`) or series (`SERIES`) rescheduling changes and validate conflicts without mutating events.              |
| `POST`   | `/timetable/my/reschedule-requests`                    | Instructor                 | Submit a rescheduling request for own future published occurrences (`reason` max `1000` chars).                                |
| `GET`    | `/timetable/my/reschedule-requests`                    | Instructor                 | List current instructor's rescheduling requests (`page` default `1`, `pageSize` default `20`, max `100`).                      |
| `GET`    | `/timetable/reschedule-requests`                       | `ADMIN`                    | List all rescheduling requests for dean's office review (`page`, `pageSize`, optional `status` filter).                        |
| `POST`   | `/timetable/reschedule-requests/:id/approve`           | `ADMIN`                    | Atomically re-validate snapshot/conflicts, update affected occurrences, record audit rows, and mark request `APPROVED`.        |
| `POST`   | `/timetable/reschedule-requests/:id/reject`            | `ADMIN`                    | Reject a pending request with a required nonblank `explanation` (max `1000` chars).                                            |
| `PATCH`  | `/timetable/events/:id/reschedule`                     | `ADMIN`                    | Directly reschedule single or series published occurrences with conflict checks and audit logging.                             |
| `POST`   | `/timetable/calendar/tokens`                           | Authenticated              | Get existing active subscription token or create a new one.                                                                    |
| `POST`   | `/timetable/calendar/tokens/rotate`                    | Authenticated              | Deactivate existing tokens and issue a new token.                                                                              |
| `DELETE` | `/timetable/calendar/tokens`                           | Authenticated              | Revoke all active subscription tokens for the current user.                                                                    |
| `GET`    | `/timetable/calendar/feed/:token`                      | Public (Token)             | Fetch personal `.ics` calendar feed (`text/calendar; charset=utf-8`).                                                          |

### Assigning student schedules

Administrators can provision new and existing students with
`PUT /user/:id/academic-membership`. Use a user ID from `GET /user` and
group and subgroup IDs from `GET /timetable/groups`. The body replaces the
entire membership atomically:

```json
{
  "academicGroupId": "8b9c6391-9d10-430b-bd3a-257d3d211299",
  "academicSubgroupId": "8840ee36-5762-466c-8656-06a98f7d37a2"
}
```

Omit the optional subgroup to receive only group-wide and stream classes.
Sending `{"academicGroupId": null}` removes the membership. Success returns
HTTP 204. A missing user, group or subgroup belonging to the specified group
returns HTTP 404. Invalid IDs and a subgroup supplied without a group return
HTTP 400. The next personal schedule request or ICS refresh reflects the change.

## Draft Generation & Publication Rules

### Editing workload after publication

`PUT /timetable/assignments/:id` returns HTTP 409 when the assignment already has
non-cancelled classes in a `PUBLISHED` version and the request changes its plan,
teaching type, hours, group, subgroup, stream, `isSaturdayOnly` or
`hasLateSlotAuthorization`. The teacher, title and meeting link may still change.
Published classes read their participants from the assignment, so changing them
would move the classes between calendars without a new publication.

Changing the teacher is allowed and atomic: in one `Serializable` transaction with the
shared write lock, the teacher snapshot of the assignment's future classes (published and
draft versions) is replaced after the conflict check, and HTTP 409 is returned if the new
teacher would collide with another class. Past classes keep their teacher. `teacherId`,
`groupId`, `subgroupId` and `streamId` accept `null` to clear the value; an omitted field
keeps the stored one.

Assignment updates take the same calendar write locks as publication inside a
Serializable transaction. Replacing or clearing a teacher rechecks all future
occurrences against published occupancy, other lessons in each affected draft and
confirmed unavailability before updating their teacher snapshots atomically.
Started and past occurrences retain their saved teacher. Personal event queries,
subscription ownership and rescheduling use the saved snapshot; a null snapshot
means that the occurrence has no assigned teacher. Optional assignment fields
accept an explicit `null` to clear them; omitted fields keep their saved values.

### Removing workload

`DELETE /timetable/assignments/:id` requires `ADMIN` and a UUID. It sets the nullable
`TeachingAssignment.deletedAt` timestamp and returns `{ "count": 1 }`, or
`{ "count": 0 }` when already archived or missing. Retries are safe. Archived
assignments are excluded from workload lists, plan assignments and new generation.
Existing timetable events and their assignment relations remain unchanged, including
published calendars and historical participant lookups; foreign keys retain `Restrict`.

The management screen queues saved-row removals until Save or Generate. A failed
archive remains pending and blocks generation. Temporary rows need no request.
Plan switching is disabled until pending changes are saved, including archive retries.

Deploy the additive nullable column before starting the updated backend, regenerate
the Prisma client, and restart the backend. Do not reset or reseed existing databases.

To apply only this additive change, run from `packages/backend`:

```bash
pnpm exec prisma db execute --file prisma/scripts/archive-teaching-assignments.sql
pnpm db:generate
```

1. **Multi-Candidate Persistence**:
   - `POST /timetable/plans/:id/generate` validates solver limits (`maxCandidates` in `1..5`, `timeoutMs` in `1..10000`, demands `<= 200`).
   - Fetches events from already-`PUBLISHED` versions of other curriculum plans in the same semester calendar and passes them as `fixedEvents` to avoid cross-plan teacher and student collisions.
   - Generates a shared `generationId` and persists every candidate as an independent `DRAFT` `TimetableVersion` with its `candidateIndex` (`0..N-1`). In the same transaction it deletes the earlier `DRAFT` versions of this plan and semester; `PUBLISHED` and `ARCHIVED` versions are never touched.
   - Before searching, a practice that always precedes the first lecture of its discipline (for example a weekly practice with a lecture that starts in week 2) is reported at once as `NO_FEASIBLE_SOLUTION`, not as `TIMEOUT`.
   - Each `TimetableEvent` stores a deterministic `stableKey` (`${teachingAssignmentId}:${date}:${pair}`).
2. **Atomic Publication**:
   - `POST /timetable/versions/:id/publish` executes inside `prisma.$transaction`.
   - Rejects empty versions (`ConflictException`).
   - Verifies that every assignment in the curriculum plan has non-cancelled events equal to `academicHours / 2` pairs (`getPairsFromAcademicHours`), throwing `ConflictException` with deficits if incomplete.
   - Runs `checkTimetableConflicts` against the version's events combined with other `PUBLISHED` versions in the same semester calendar and confirmed teacher unavailability, restoring `isMakeupSaturday`, `isSaturdayOnly`, `hasLateSlotAuthorization`, and full participant `groupIds`.
   - Archives any previous `PUBLISHED` version for the same semester calendar (`status = ARCHIVED`) and transitions the target version from `DRAFT` to `PUBLISHED` using optimistic status locking.

## ICS Feed & Subgroup Filtering Rules

- Only the latest `PUBLISHED` version per semester calendar is included in the feed.
- Each event uses `event.stableKey` as its RFC 5545 `UID` base (`${stableKey}@timetable.universe.karazin.ua`) so calendar clients update events in place across revisions, and honours `pairSpan` and `isCancelled`.
- **Teacher filtering**: includes events where `teachingAssignment.teacherId === user.id`.
- **Student filtering**:
  - Group-wide classes: `assignment.groupId === user.academicGroupId && assignment.subgroupId === null`.
  - Subgroup classes: `user.academicSubgroupId !== null && assignment.subgroupId === user.academicSubgroupId` (events for other subgroups of the same group are excluded).
  - Stream classes: `assignment.stream.groups.some(g => g.id === user.academicGroupId)`.

## Subscription Token Lifecycle

- Tokens are generated using `crypto.randomBytes(32).toString('base64url')`.
- `POST /timetable/calendar/tokens` is idempotent: it returns the user's active token if one exists, or creates a new one.
- `POST /timetable/calendar/tokens/rotate` atomically deactivates all active tokens for the user and creates a fresh token.
- `DELETE /timetable/calendar/tokens` deactivates all active tokens for the user.
- Every successful `GET /timetable/calendar/feed/:token` updates `lastAccessedAt`.

## Rescheduling Requests, Direct Moves & Semester Duration

- Additive schema deployment (preserving existing events and preferences):

```bash
pnpm --filter @universe/backend exec prisma db execute --file prisma/scripts/create-reschedule-requests.sql
pnpm --filter @universe/backend db:generate
```

- **Rescheduling constraints**:
  - `ONCE` affects only the selected occurrence; `SERIES` moves the selected and subsequent occurrences sharing assignment, teacher, teaching type, participants, weekday, and pair/pairSpan, preserving intervals and occurrence count.
  - Past or started classes (`Europe/Kyiv` bell schedule) and out-of-semester targets (including makeup Saturdays past `teachingWeeks`) are rejected.
  - Teacher, group, subgroup, stream, confirmed unavailability, and lecture-before-practice conflicts abort the whole operation.
  - Rescheduling preserves database event IDs and `stableKey` so calendar subscription UIDs remain stable.
  - Approval, direct rescheduling, publication, and semester calendar updates share `lockTimetableWrites` inside `Serializable` transactions; `P2034` conflicts return HTTP `409`.
- **Semester duration**: `POST /timetable/calendar` accepts any positive integer `teachingWeeks`, validates makeup Saturdays within the semester span, and rejects shortening or exclusions that would cut off already-published occurrences.
- **Isolated PostgreSQL concurrency checks**:

```bash
pnpm --filter @universe/backend exec node --experimental-vm-modules node_modules/jest/bin/jest.js --config test/jest-timetable-postgres.json --runInBand
```

Requires `TIMETABLE_TEST_DATABASE_URL` pointing to a dedicated disposable PostgreSQL database (never `test`).
