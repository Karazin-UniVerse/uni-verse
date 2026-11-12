# Timetable API

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

| Method   | Path                                                   | Access                     | Description                                                                                                            |
| -------- | ------------------------------------------------------ | -------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `POST`   | `/timetable/groups`                                    | `ADMIN`                    | Create an academic group with optional subgroups.                                                                      |
| `GET`    | `/timetable/groups`                                    | Authenticated              | List all academic groups with subgroups.                                                                               |
| `POST`   | `/timetable/curriculum-plans`                          | `ADMIN`                    | Create a curriculum plan.                                                                                              |
| `GET`    | `/timetable/curriculum-plans/:id`                      | `ADMIN`                    | Get a curriculum plan with its teaching assignments.                                                                   |
| `POST`   | `/timetable/assignments`                               | `ADMIN`                    | Create a teaching assignment (`academicHours` even integer `2..400`, requires `groupId`, `subgroupId`, or `streamId`). |
| `GET`    | `/timetable/assignments?curriculumPlanId=...`          | `ADMIN`                    | List teaching assignments for a curriculum plan.                                                                       |
| `GET`    | `/timetable/my/assignments`                            | Authenticated              | List teaching assignments assigned to the current teacher.                                                             |
| `PUT`    | `/timetable/assignments/:id/meeting-url`               | Assigned Teacher / `ADMIN` | Update online meeting URL (`http`/`https`, max `2048` chars).                                                          |
| `POST`   | `/timetable/calendar` (`/timetable/semester-calendar`) | `ADMIN`                    | Configure or upsert a semester calendar.                                                                               |
| `GET`    | `/timetable/calendar` (`/timetable/semester-calendar`) | `ADMIN`                    | Get a semester calendar by `academicYear` and `semester`.                                                              |
| `POST`   | `/timetable/teachers/:teacherId/unavailability`        | Self / `ADMIN`             | Submit a teacher unavailability slot request.                                                                          |
| `PUT`    | `/timetable/unavailability/:id/confirm`                | `ADMIN`                    | Confirm or reject a teacher unavailability request.                                                                    |
| `POST`   | `/timetable/plans/:id/generate`                        | `ADMIN`                    | Generate up to `maxCandidates` (`1..5`, timeout `1..10000` ms, max `200` demands) draft timetable versions.            |
| `POST`   | `/timetable/versions/:id/publish`                      | `ADMIN`                    | Atomically validate and publish a draft timetable version.                                                             |
| `POST`   | `/timetable/calendar/tokens`                           | Authenticated              | Get existing active subscription token or create a new one.                                                            |
| `POST`   | `/timetable/calendar/tokens/rotate`                    | Authenticated              | Deactivate existing tokens and issue a new token.                                                                      |
| `DELETE` | `/timetable/calendar/tokens`                           | Authenticated              | Revoke all active subscription tokens for the current user.                                                            |
| `GET`    | `/timetable/calendar/feed/:token`                      | Public (Token)             | Fetch personal `.ics` calendar feed (`text/calendar; charset=utf-8`).                                                  |

## Draft Generation & Publication Rules

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
   - Generates a shared `generationId` and persists every candidate as an independent `DRAFT` `TimetableVersion` with its `candidateIndex` (`0..N-1`).
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
