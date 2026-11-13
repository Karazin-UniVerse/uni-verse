# Timetable rescheduling requests and mobile adaptation

## Approved intent

Instructors request changes to their own published classes; the dean's office approves or rejects requests. Administrators can also reschedule directly. Both flows support a single occurrence or the selected and subsequent occurrences of the same series until the semester ends. Past classes remain unchanged. Every affected date must remain conflict-free. Adapt the existing timetable interfaces for mobile use without redesigning unrelated portal features.

The user approved this scope in conversation. This written specification requires a separate review before implementation planning.

## Existing behavior

- `TimetableService.rescheduleEvent` updates one active published event in a Serializable transaction and checks published occupancy and confirmed teacher unavailability on the target date.
- The existing controller limits direct rescheduling to administrators.
- `ScheduleView` contains the current rescheduling form.
- There is no persisted instructor rescheduling request workflow.

## Roles and workflow

- An authenticated INSTRUCTOR may request rescheduling only for events assigned to that user. Identity comes from the verified session, never the request body.
- The dean's office uses the existing ADMIN authorization. No new role or approval permission is introduced.
- An instructor selects an occurrence, target date, target pair, scope (`ONCE` or `SERIES`) and a required nonblank reason.
- Submission validates the entire proposed change but does not mutate scheduled events.
- Requests have `PENDING`, `APPROVED` or `REJECTED` status. Instructors see their own requests; administrators see requests for review.
- Administrators approve the submitted proposal without editing it, or reject it with a required nonblank explanation. A different proposal requires a new request.
- Approval rechecks permissions, source snapshots, semester constraints and conflicts. Updating all affected events and recording the decision is atomic.
- A stale or conflicting approval returns a conflict and leaves both the timetable and pending request unchanged. The UI explains that the request cannot be applied and allows rejection.
- Already decided requests cannot be decided again. Concurrent decisions must produce at most one successful decision.
- Direct administrator rescheduling uses the same validation and application path and records the actor, reason and before/after values.

## Series semantics

- A series consists of occurrences of the same teaching assignment in the same published timetable version, with the same teacher, teaching type and group/subgroup/stream membership, and the same source weekday and pair. This avoids moving an unrelated weekly slot of the same assignment.
- The selected occurrence and later matching occurrences are affected; earlier occurrences are untouched. Cancelled events are excluded.
- The target date defines a calendar-day offset from the selected occurrence. Apply that same offset and target pair to each selected occurrence, preserving existing weekly or alternating-week intervals and occurrence count.
- Only future, not-yet-started classes may be moved. Use `Europe/Kyiv` and the existing pair schedule to determine start times. Source and target classes must not have started when submitting or applying a change.
- Every target must remain within the original semester's teaching calendar. Respect teaching days, makeup days, Saturday-only restrictions, pair bounds and multi-pair duration where applicable. Reject the whole change rather than dropping occurrences or moving them outside the semester.
- A proposal that changes no occurrence is invalid. No hours, assignment membership or teaching type are changed.

## Conflict and concurrency guarantees

- Reuse the existing shared conflict checker and membership expansion. Check teachers, groups, subgroups, stream participants and confirmed teacher unavailability against all relevant active published events, including other plans occupying the same dates.
- Check the complete proposed set against itself and external occupancy, excluding its original occurrences. A group or teacher must not conflict with another occurrence in the same move.
- Preserve the first-lecture-before-practice/laboratory/seminar requirement for every participating group across the affected original and target dates, not merely within the target day.
- Teacher slot preferences remain soft preferences, not a new hard prohibition on manual moves. Existing mandatory constraints remain mandatory.
- Store source snapshots at submission: event identity, source time and the assignment/membership/version context used to validate the request. If that context or the series occurrence set changes before approval, require a new proposal.
- Serialize application and publication through a common database locking protocol for overlapping semester occupancy, inside the transaction, so concurrent publication or rescheduling cannot each validate against obsolete occupancy. Establish deterministic lock ordering for affected semesters; serializable conflicts return a retryable conflict rather than partially applying changes.
- Recheck all source and target state inside the application transaction. Return structured conflicts suitable for localized UI messages without exposing unrelated personal details.

## Persistence and API boundaries

- Add additive Prisma models for requests, affected occurrence snapshots and rescheduling audit entries. Preserve existing events, versions, preferences and workload. No reseeding or destructive schema reset.
- Audit both approved requests and direct administrator moves. Persist actor, decision maker, reason, decision explanation, timestamps and per-occurrence before/after dates and pairs. Do not overwrite the submitted proposal or erase rejected history.
- Keep event database IDs and calendar subscription identity stable through a move. Resolve the existing mutable `stableKey` usage in personal-event responses and iCal export so rescheduling updates an occurrence rather than creating an unrelated calendar identity. Check publication matching before changing `stableKey` behavior.
- Put shared scope, status, request, review and response contracts in `packages/core`; DTOs validate dates, pair bounds, enum values, UUID event/request identifiers and bounded reason lengths. User IDs may be non-UUID strings.
- Extend the existing admin rescheduling endpoint with explicit scope and reason, updating all callers. Add authenticated instructor submission/own-list and administrator review-list/decision endpoints. Do not add compatibility aliases or a second independent rescheduling implementation.
- Lists must be paginated and return only the fields needed by the role-specific UI. Do not expose unrelated user records or credentials.
- Use the existing API client and TanStack Query patterns. Invalidate affected schedule and request queries only after successful writes; errors preserve form input. No dummy events or optimistic success for these flows.

## UI and mobile scope

- User-requested scope addition: the dean's office can explicitly set the number of teaching weeks for the selected academic year and semester through the existing semester calendar API. Load the persisted value, validate a positive integer, and save before generation. Existing semesters are not silently reset to 16. Generation and rescheduling use the saved calendar; changing duration never changes assigned academic hours or historical published occurrences. If shortening would exclude published occurrences, reject the calendar update rather than silently truncating them. Display insufficient-capacity errors instead of changing workload hours.

- Instructors get a request action on their own eligible event and a list of their requests with scope, original/proposed times, reason, status and rejection explanation.
- Administrators get pending-request review showing all affected occurrences and approve/reject controls, plus direct single/series rescheduling on eligible events.
- Preview the full affected set before submission or a direct move. Disable duplicate submits; expose pending, empty, loading, error and successful states.
- Adapt schedule week/month views, event details, rescheduling forms, request review, workload management and the teacher preference grid. Do not change unrelated portal pages.
- At 320, 375, 390 and 768 CSS pixels, prevent page-level horizontal overflow and overlapping labels/actions. Dense tables may scroll inside labeled containers. Keep mobile calendar information reachable rather than hiding essential fields.
- Stack form controls and actions when needed; contain dialog scrolling; keep close/submit controls reachable with a mobile keyboard. Use existing design tokens and breakpoints, accessible labels, keyboard interaction, focus management and adequately sized touch targets.
- All new strings and conflict/status labels have Ukrainian and English translation keys. Preserve the existing desktop flow and six-day calendar.

## Acceptance and verification

1. An instructor cannot request or read another instructor's requests, impersonate a requester or approve requests. Non-admins cannot directly move events or review the dean's queue.
2. Submitting a valid request leaves published events unchanged. Approval moves exactly the previewed occurrences; rejection moves none and preserves its explanation.
3. Single moves affect one occurrence. Series moves preserve intervals, event identity and hours, leave earlier occurrences untouched and reject out-of-semester targets.
4. Teacher, group, subgroup, stream, unavailability, multi-pair and lecture-order conflicts reject the complete operation, including conflicts introduced after submission.
5. Changed source membership, publication/version, times or series composition prevents stale approval. Repeated and concurrent decisions never apply a request twice.
6. Concurrent publication/direct moves/approvals cannot create overlapping occupancy. Verify transaction rollback and serialization-conflict handling using PostgreSQL integration checks, not mocks alone.
7. Audit records contain the submitted reason, actor, decision and before/after values. A moved event retains its calendar UID and usable personal-event identifier.
8. Component tests cover submission, review, rejection, server conflicts and retained input. Real browser checks cover instructor/admin flows and the specified mobile widths, with screenshots and console checks; disclose unavailable browser tooling rather than claiming visual verification.
9. Run repository lint, stylelint, typecheck, tests, build and changed-file Prettier checks. Do not weaken constraints, skip tests or hide warnings. Report existing unrelated warnings separately.

## Deliberate exclusions

No email/push notification subsystem, delegated approvers, request editing/cancellation, automatic alternative-slot search, arbitrary subset selection, room-management subsystem or unrelated mobile portal redesign. Add those only under a separate requirement.
