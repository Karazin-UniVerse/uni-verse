# Teacher slot preferences

## Approved intent

Teachers maintain recurring preferred, neutral, and undesirable weekday/pair slots for a selected semester. The test account `csai_test1@karazin.ua` represents teacher Даас Т.І. Preferences affect only assignments linked to that user's existing ID.

## Interface and persistence

A teacher-only preferences section in the schedule profile context exposes a Monday–Saturday grid using the existing bell schedule. Each cell has three states: neutral, preferred, undesirable. The semester is explicit. Saving persists the grid to PostgreSQL; reloading restores it. All labels are translated and controls support keyboard operation and accessible state labels.

Store non-neutral preferences with teacher ID, semester calendar ID, weekday, and pair; enforce uniqueness for that combination. Clearing a cell removes its preference. Save the semester grid atomically. Validate weekday, pair, preference values, duplicate cells, semester existence, and payload size at the API boundary. Authenticated teacher endpoints derive teacher identity from the session, never from a client-supplied teacher ID. Teachers cannot edit another user's grid.

## Generation

Load saved preferences for the selected semester and teachers referenced by active teaching assignments. First search with undesirable slots excluded. If fewer than the requested candidate count are found within a bounded share of the existing overall time budget, search again allowing undesirable slots with a penalty. Deduplicate candidates across passes. Keep strict candidates ahead of relaxed candidates; prefer preferred slots within each tier. A timeout or incomplete search must not be described as proof that strict solutions do not exist.

Existing confirmed unavailability, student and teacher occupancy, lecture precedence, calendar restrictions, and workload completeness remain mandatory in both passes. Preferences never change hours or invent teachers. No preference means existing behavior. Already published events are not moved.

Return and display undesirable-slot violations for each relaxed candidate, including teacher, date, and pair. Strict candidates have no such violations. Preferred-slot scoring must affect the search order as well as final ranking; do not claim global optimality from the bounded solver.

## Test account

Inspect the existing account and teacher assignments before changing local data. Retain the account ID and existing roles, add the teacher role if absent, and set its teacher display name to Даас Т.І. Link only workload verified to belong to Даас Т.І.; do not relabel another teacher's assignments or create duplicate identities. Preserve local data and back up affected records before updates. Do not introduce a hardcoded test identity into production authorization or generation.

## Acceptance and verification

- Teacher can save all three states, reload them, and isolate preferences by semester.
- Unauthorized users and attempts to edit another teacher are rejected.
- Preferred slots influence generated placement; strict candidates never use undesirable slots.
- Relaxed candidates may use undesirable slots, are clearly marked, and follow strict candidates without duplicates.
- Both passes preserve every mandatory scheduling constraint and share one overall time budget.
- Test account preferences affect its linked assignments only.
- Existing published schedules and historical records remain unchanged.

Use regression tests for persistence, authorization, validation, solver pass ordering, fallback, deduplication, and visible warnings. Run repository checks and a browser scenario when available; disclose unavailable checks. Preserve pending metadata and calendar UI fixes separately.
