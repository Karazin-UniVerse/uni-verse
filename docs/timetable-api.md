# Timetable API Documentation

This document describes the endpoints, authorization roles, data contracts, and deployment procedures for the UniVerse Timetable subsystem.

## Overview

The Timetable module enables dean office administrators to:

- Define academic groups, subgroups, and streams.
- Create curriculum plans and configure semester teaching assignments.
- Set up semester calendars with excluded dates (holidays) and makeup Saturdays.
- Collect teacher unavailability preferences and confirm hard restrictions.
- Deterministically generate conflict-free timetable candidate versions.
- Re-validate and atomically publish a draft timetable.
- Expose RFC 5545 `.ics` personal calendar feeds for students and instructors.

---

## Authorization & Roles

- **Dean / Administrator (`Role.ADMIN`)**: Full read/write access to curriculum plans, teaching assignments, semester calendars, draft generation, and timetable publication.
- **Teacher (`Role.INSTRUCTOR` / authenticated user)**: Can submit unavailability requests for themselves, update online meeting URLs for their assigned classes (`PUT /timetable/assignments/:id/meeting-url`), and retrieve their own teaching assignments (`GET /timetable/my/assignments`).
- **Student / Authenticated User**: Can obtain a personal calendar subscription token (`POST /timetable/calendar/tokens`), rotate tokens, or revoke them.
- **Public**: The calendar ICS feed (`GET /timetable/calendar/feed/:token`) is public without bearer auth, authenticated solely via the secret token in the URL.

---

## Endpoints

### 1. Academic Groups & Curriculum Plans

- `POST /timetable/groups` [Admin only]: Create an academic group.
- `GET /timetable/groups` [Authenticated]: List all academic groups with subgroups.
- `POST /timetable/curriculum-plans` [Admin only]: Create a curriculum plan.
- `GET /timetable/curriculum-plans/:id` [Admin only]: Get curriculum plan details with assignments.

### 2. Teaching Workload Assignments

- `POST /timetable/assignments` [Admin only]: Create an assignment (validates `academicHours` as even integer 2..400; requires `groupId`, `subgroupId`, or `streamId`).
- `GET /timetable/assignments?curriculumPlanId=UUID` [Admin only]: List assignments for a plan.
- `GET /timetable/my/assignments` [Teacher / Authenticated]: List assignments where the current user is the assigned instructor.
- `PUT /timetable/assignments/:id/meeting-url` [Teacher or Admin]: Update meeting link (max 2048 chars, strictly HTTP/HTTPS).

### 3. Semester Calendar & Unavailability

- `POST /timetable/calendar` [Admin only]: Configure semester calendar (`startDate`, `teachingWeeks`, `excludedDates`, `makeupSaturdays`).
- `GET /timetable/calendar?academicYear=2026/2027&semester=1` [Admin only]: Fetch semester calendar.
- `POST /timetable/teachers/:teacherId/unavailability` [Teacher / Admin]: Request unavailable slot.
- `PUT /timetable/unavailability/:id/confirm` [Admin only]: Confirm hard unavailability.

### 4. Generation & Publication

- `POST /timetable/plans/:id/generate` [Admin only]:
  - Accepts `maxCandidates` (1..5), `timeoutMs` (100..10000).
  - Enforces max 200 demands per plan.
  - Generates drafts and persists each candidate as a separate `TimetableVersion` with `DRAFT` status and stable keys.
- `POST /timetable/versions/:id/publish` [Admin only]:
  - Executes atomically in a transaction.
  - Enforces exact workload hours fulfillment (no deficits).
  - Runs cross-plan conflict verification against any already published versions.
  - Atomically archives any previously published version for the semester calendar.

### 5. Calendar Subscriptions

- `POST /timetable/calendar/tokens` [Authenticated]: Get or create active personal subscription token.
- `POST /timetable/calendar/tokens/rotate` [Authenticated]: Invalidate previous tokens and issue a fresh 256-bit base64url token.
- `DELETE /timetable/calendar/tokens` [Authenticated]: Revoke all subscription tokens for user.
- `GET /timetable/calendar/feed/:token` [Public]: Download RFC 5545 compliant `.ics` calendar feed with `Europe/Kyiv` timezone support.

---

## Schema Migration & Deployment

UniVerse data models use Prisma with `db:push` for deployment:

1. Validate and format the Prisma schema:

   ```bash
   pnpm --filter @universe/backend prisma format
   ```

2. Generate Prisma Client:

   ```bash
   pnpm --filter @universe/backend db:generate
   ```

3. Push schema changes to the database:
   ```bash
   pnpm --filter @universe/backend prisma db push
   ```
