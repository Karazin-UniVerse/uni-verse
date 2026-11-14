# Automatic minimum-Saturday compensation

## Goal

Generate complete timetables for semesters shorter than 16 teaching weeks by automatically scheduling otherwise missing occurrences on the minimum number of additional Saturday dates. Preserve all academic hours and existing hard constraints. The semester UI already displays a conditional reminder; a reminder alone does not enable compensation.

## Scope and ordering

- Apply automatic compensation only when `teachingWeeks < DEFAULT_NOMINAL_WEEKS`.
- Search without additional Saturdays first. Only compensate occurrences missing from the nominal weekly distribution, including occurrences lost before a midweek semester start; do not duplicate occurrences already covered by explicitly configured makeup dates.
- Minimize distinct additional Saturday dates used across the complete candidate, not Saturday lessons or independent counts per assignment.
- Within an equal Saturday-date count, preserve existing preference and soft-penalty ordering. Hard constraints always take precedence over preferences.
- Preserve total occurrences, pair spans, assignment identities, and academic hours. Existing Saturday-only assignments remain supported and do not count as additional compensation dates unless a compensating occurrence also uses that date.

## Saturday semantics

- Only actual Saturdays within the configured teaching-week span and on or after the semester start are eligible. Excluded dates remain prohibited. No extension of the semester and no Sunday classes.
- One automatically chosen Saturday can contain compensating classes originating from different weekdays. Existing `makeupSaturdays` entries retain their original `followsWeekday` semantics; do not fabricate a single follows-weekday value for a mixed Saturday.
- Schedule only the missing occurrences, not whole replacement weekdays. Respect allowed pairs, teacher and participant occupancy, confirmed unavailability, lecture-before-practice ordering, and existing published classes.
- Validation, draft adjustment, publication, personal schedules, and rescheduling must recognize persisted automatic compensation consistently. A generated candidate must not depend on temporary in-memory flags that disappear after saving.
- Keep candidate-specific automatic dates separate from shared semester configuration: generating an unselected draft must not silently authorize Saturdays for every other version.

## Search limits and errors

- Share one overall configured search timeout across regular scheduling and compensation attempts.
- Prove the minimum additional date count before reporting a successful minimum-Saturday result. A timeout without that proof must return a search-limit result, not `NO_FEASIBLE_SOLUTION` or a falsely optimal candidate.
- Return infeasibility only after exhausting the relevant search space. Failed attempts must not persist partial events or change the semester calendar.

## Compatibility and data safety

- Keep existing request payloads working; the short-semester setting activates the behavior automatically.
- Add any new shared response metadata in `packages/core`, with backend validation and frontend translations where needed.
- Any persistence change must be additive and documented. Do not reseed, clear schedules, or modify local data without separate authorization.

## Acceptance checks

1. A 14-week fixture requiring 16 weekly occurrences retains all 16 and uses the proven minimum additional Saturday dates.
2. Multiple assignments can share one compensating Saturday in different pairs, including assignments originating on different weekdays.
3. Teacher, group, subgroup, stream, unavailability, and lecture-order conflicts remain blocking; a lower-date-count infeasible candidate is rejected.
4. Excluded Saturdays, outside-semester dates, and already compensated occurrences are handled without lost or duplicate hours.
5. A midweek semester start does not silently lose first-week occurrences.
6. Sixteen-week and longer-semester behavior remains unchanged.
7. Persist, reload, adjust, publish, and reschedule a compensating occurrence without losing its authorization or bypassing conflicts.
8. Timeouts are distinguishable from proven infeasibility and never claim an unproven minimum.
9. Failed generation leaves no partial version or semester-calendar mutation.
