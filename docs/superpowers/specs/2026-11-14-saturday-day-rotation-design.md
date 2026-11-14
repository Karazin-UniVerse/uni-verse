# Saturday compensation by source teaching day

## Agreed intent

For a semester shorter than 16 teaching weeks, preserve every assignment's academic
hours by moving missing teaching days to Saturdays inside the actual semester.
Saturdays follow the missing Monday, Tuesday, Wednesday, Thursday and Friday
templates in order. Each template uses the numerator/denominator of its source
teaching week, never that of the target Saturday.

This replaces automatic compensation that packs unrelated missing lessons into
the same Saturday. It does not require a proven minimum number of Saturday dates.

## Approach

Keep the existing regular-slot search and replace its automatic completion stage
with ordered source-day placement. This reuses teacher, participant, calendar and
workload checks without introducing a second solver.

An alternative is to let administrators enter every replacement Saturday manually.
That reuses `makeupSaturdays`, but its current target-week parity cannot represent
the agreed source-week rule, and manual entry does not meet automatic generation.

## Source timetable and missing occurrences

- Use a 16-teaching-week nominal calendar for short-semester generation. Keep the
  current seven-day teaching-week definition starting at `startDate`.
- Expand the regular candidate's weekday and pair slots against that nominal
  calendar. Retain source dates and source teaching-week indexes for occurrences.
- Keep ordinary occurrences inside the actual semester unless their dates are
  excluded. Collect occurrences beyond the actual end or on excluded dates as
  missing. Do not turn a missing occurrence into a demand without its source date.
- Preserve the existing workload patterns and fallback distribution. This change
  does not authorize extra ordinary weekday occurrences or reduce hours.
- Explicitly configured makeup days must not produce duplicate credit for an
  occurrence. Account for their existing coverage before automatic completion.
- Existing Saturday-only assignments remain Saturday-only. Never invent a weekday
  source template for them; if their required hours cannot be placed under their
  existing rules, reject the candidate.

## Ordered replacement Saturdays

- Group missing weekday occurrences by source date across all assignments in the
  candidate. One replacement Saturday represents one source teaching day.
- Sort source days by source teaching week, then Monday through Friday. Preserve
  each source week's parity. Source days with no missing lessons need no Saturday.
- Assign groups to distinct target Saturdays in increasing date order. A target
  is inside the actual semester, not excluded, and not already configured as an
  explicit makeup day. A different source day cannot share that target.
- Preserve each lesson's pair and pair span from its source template. Place the
  complete day together; never move independent lessons to unrelated Saturdays.
- If a Saturday is unavailable, try a later eligible Saturday while preserving
  source-day order. Backtrack over Saturday choices and regular candidates.
- Respect fixed published events, confirmed teacher unavailability, teacher and
  participant intersections, late-slot permissions, lecture ordering and the
  existing five-pair Saturday capacity per teacher/group.
- If a complete source day cannot fit, do not split it or truncate its lessons.
  Return infeasibility only after the permitted search is exhausted; otherwise
  return `TIMEOUT`. Never save a partial candidate.

## Shared contract and persistence

- Add a shared mapping type containing `date` and `sourceDate`. Weekday and source
  week parity are derived from the source date and calendar rather than stored
  redundantly.
- Return the mappings with generated candidates and persist them on each
  `TimetableVersion` in an additive field with an empty default. Do not mutate
  shared `SemesterCalendar.makeupSaturdays` during generation.
- Existing `automaticMakeupDates` remains the authorization set for saved events;
  the new mappings record provenance. New generation writes both atomically and
  requires the mapping dates and authorization dates to agree.
- Old versions retain their events and date authorizations. Do not fabricate
  source dates for historical compensation generated without this information.
- Add a documented additive SQL script and regenerate Prisma locally. Do not run
  SQL against the user's database or rewrite existing published events.

## Downstream behavior

- Publication reloads mappings and date authorizations, rechecks calendar bounds,
  excluded dates, complete workload and conflicts, and publishes atomically.
- Draft weekday/pair edits must update mapped occurrences consistently with the
  changed source template, or reject the edit with an actionable explanation.
- Explicit published rescheduling keeps its existing validation and audit rules;
  the source-day mapping remains historical provenance, not a promise that a
  manually rescheduled occurrence still has its original pair.
- Calendar edits cannot invalidate any published event on a compensation date.
- Display replacement Saturdays in the draft results with the replaced weekday
  and source-week parity, using Ukrainian and English translation keys.

## Acceptance checks

1. A 14-week fixture with weekday lessons spanning 16 nominal weeks preserves
   exactly every assignment's required hours inside the actual semester.
2. Missing Monday through Friday templates map to ordered, distinct Saturdays.
3. An alternating-week lesson follows source parity even when target parity is
   opposite; weekly lessons still appear in the corresponding source-day group.
4. Different source days never mix on one automatic Saturday; pairs are preserved.
5. Excluded Saturdays and occupied slots cause ordered alternative-date search.
6. Too few Saturdays, a source-day capacity overflow or unavailable teachers never
   produce a truncated successful timetable.
7. Explicit makeups and Saturday-only assignments do not duplicate hours.
8. A non-Monday semester start uses the existing teaching-week convention without
   losing hours or taking parity from the target week.
9. Save/reload, draft adjustment, publication, calendar edits and rescheduling
   preserve authorization and provenance without changing unrelated versions.
10. A timeout remains distinguishable from exhausted infeasibility. Sixteen-week
    and longer-semester generation retains its current behavior.

## Documentation alignment

Update the API reference and the previous minimum-Saturday design to identify this
policy as its replacement. Remove claims that the active automatic algorithm
mixes source weekdays or proves the minimum Saturday count.
