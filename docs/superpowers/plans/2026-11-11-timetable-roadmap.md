# UniVerse Timetable Implementation Roadmap

Status: requirements agreed in conversation; roadmap for review, not authorization to implement product code.

## Goal and delivery strategy

Build an online teaching timetable with dean-managed input, conflict-checked manual editing, automatic candidate generation, exam planning, publication, and personal calendar subscriptions.

Work in the existing monorepo on the protected integration branch `feature/timetable`, based on `develop`. Deliver focused working branches and reviewed PRs into the integration branch; ship independent completed slices into `develop` through reviewed PRs behind feature flags. Keep the integration branch current with `develop`. Do not duplicate authentication, the design system, or shared contracts in another repository.

This document records the full agreed scope and delivery sequence. Exact migrations, DTOs, endpoint signatures, solver selection, and per-task executable tests require a reviewed technical design before implementation. The open technical decisions below are not permission to invent business rules.

## Sources and confidence

- Meeting notes and four child pages: https://app.notion.com/p/04-11-2026-409f8cf15c6180cdacfce179f466c25a
- Meeting recording: https://youtu.be/Bk7BfRwITIM. The recording was not independently reviewed in this session; meeting conclusions came from the notes and existing transcript analysis.
- Supplied curriculum: `НП-КСбд-2026-НацСпротив (2).xlsx`.
- Supplied annual working plan: `РНП-КСден-2026-2027-загал (1).xlsx`.
- Supplied first- through fourth-year undergraduate and first-year master's group lists for 2026/2027.
- Supplied bell schedule image.
- Faculty directory: https://csai.karazin.ua/ and its department pages and teaching-material links.

The user's subsequent decisions override exploratory meeting proposals: one teacher per teaching assignment; no split of that assignment's hours between teachers; online-only initial scope; dean-managed input and approval.

Public staff profiles and programme authorship do not prove current teaching assignments. The dean must confirm assignments, streams, subgroup membership, calendar dates, and source-plan applicability. Never infer them from names alone. Keep source documents containing student personal data outside Git; use synthetic test fixtures.

## Existing code and architecture

- `packages/uni-hub/components/schedule/`: existing timetable views and demonstration events; inspect and reuse rather than duplicate. Review the existing ICS export before connecting real data.
- `packages/uni-hub/app/(dashboard)/schedule/page.tsx`: existing timetable route.
- `packages/core/types/index.ts`: existing schedule contract to reconcile with the reviewed design; no compatibility shims.
- `packages/backend`: NestJS domain module, validated DTOs, server-side authorization, imports, calendar feeds, publication, and change requests.
- `packages/backend/prisma/schema.prisma`: current Prisma schema; client belongs to `packages/database`. Confirm paths against the implementation base before editing.
- `packages/core/types`: shared frontend/backend contracts. Place reusable pure domain calculations in core only when genuinely shared.
- `packages/uni-hub`: student and teacher views, availability entry, dean input table and editing workspace. Reuse Una components and translate every UI string.

Start as a modular extension of the existing backend, not a separate service. A generator consumes an immutable, validated input snapshot and returns candidates plus diagnostics. It does not publish or mutate authoritative input. Long-running solving must not block the NestJS request/event loop. Select an installed or justified maintained solver after benchmarking; do not write a general-purpose solver from scratch.

## Roles and approval

| Action                                     | Teacher                   | Dean                                       |
| ------------------------------------------ | ------------------------- | ------------------------------------------ |
| View timetable                             | Own published events      | Authorized organizational scope and drafts |
| Enter discipline hours and assign teachers | No                        | Yes                                        |
| Submit preferred times                     | Own availability campaign | Manage campaign and deadline               |
| Submit hard unavailability                 | Request only              | Confirm or reject                          |
| Change online link                         | Own assigned teaching     | Yes                                        |
| Move or cancel a published event           | Submit request            | Approve or reject and publish              |
| Change participants or assigned teacher    | No direct publication     | Yes, subject to validation                 |
| Generate and publish candidates            | No                        | Yes                                        |

An authorized department employee may also confirm unavailability. Initially the dean handles input and assignments; a complete department administration portal is out of scope. Model permissions and organizational scope explicitly rather than treating every administrative role as university-wide access.

Unconfirmed unavailability does not become a hard solver constraint. Keep it visible as pending. If no preferences were submitted by the deadline, all institutionally permitted slots are available, excluding known occupancy and confirmed restrictions.

## Input table and domain model

The dean enters and edits a table. One workload row represents one semester discipline component, teaching type, and participant set, assigned to one teacher.

Required fields:

- Academic year, semester, plan reference, and official discipline title.
- Group, subgroup, or explicitly configured stream.
- Teaching type: lecture, practical, seminar, laboratory.
- Academic hours; derived pair count; assigned teacher from the directory.
- Allowed-day policy: weekdays or Saturday-only; optional approved late-slot exceptions.
- Discipline assessment: exam or credit/pass assessment, stored at discipline level rather than duplicated inconsistently across rows.

Semester settings contain start date, teaching-week count, teaching calendar, parity anchor, excluded dates, session dates, and approved make-up Saturdays. Provide previews and validation before accepting bulk imports or generation inputs.

Keep distinct entities/concepts for programmes, plans, annual working plans, semester components, groups, subgroup membership, streams, people, user accounts, and teaching assignments. Group codes are display labels, not the source of degree level, programme, or entry year.

A shared stream lecture can satisfy multiple plan components with different official names. Keep these links explicit: one actual teaching event, one teacher occupancy, and appropriate curriculum credit for each participating group. Do not merge disciplines by title or count one shared lecture repeatedly as teacher workload.

Different teaching types and subgroups may have different teachers. A given semester assignment has exactly one teacher; the generator never chooses or alternates teachers. Staff replacement is an audited administrative change, preserving past events.

Each subgroup receives its required hours; never divide the curriculum hours by the number of subgroups automatically. Participant intersections must be checked across groups, subgroups, and streams.

## Time and academic-hour accounting

Timezone: `Europe/Kyiv`. Resolve dated events using timezone rules, not fixed UTC offsets.

| Pair | Start | End   |
| ---- | ----- | ----- |
| 1    | 08:30 | 09:50 |
| 2    | 10:10 | 11:30 |
| 3    | 12:00 | 13:20 |
| 4    | 13:40 | 15:00 |
| 5    | 15:20 | 16:40 |
| 6    | 17:00 | 18:20 |
| 7    | 18:40 | 20:00 |

One teaching pair accounts for two academic hours despite occupying 80 clock minutes in this bell schedule. Calculate each teaching type separately. Do not use calendar duration to derive curriculum hours.

| Academic hours | Pairs | Accepted 16-week pattern                                                                 |
| -------------- | ----- | ---------------------------------------------------------------------------------------- |
| 16             | 8     | Every other week                                                                         |
| 24             | 12    | Weekly for eight weeks, every other week for the other eight; reverse order also allowed |
| 32             | 16    | Weekly                                                                                   |
| 48             | 24    | Weekly plus a second pair every other week                                               |

Recurring teaching keeps a stable weekday and pair number. Extra weekly pairs have their own stable slot. Store exact occurrence weeks/dates to represent phased patterns without accidentally scheduling 8 or 16 instead of 12 events. Validate final occurrence totals. Never silently round odd academic-hour inputs; report unsupported duration for correction until shorter teaching units are explicitly approved.

The dean can choose the teaching-week count at generation. A shorter semester never silently reduces required hours. Exact dates remain necessary for exports, exceptions, parity, and makeup calculations.

## Weekdays, Saturdays, and makeup calendar

- Ordinary teaching: Monday through Friday. No Sunday scheduling.
- Confirmed special disciplines: Saturday only, not merely allowed on Saturday.
- Saturday-only teaching prefers early slots starting with pair 1. Advanced Saturday optimization is not a first-release priority.
- Confirmed source-plan cases: first-year computer science `Основи національного спротиву`; second-year computer science `Основи національного спротиву. Аудиторна підготовка`.
- The exact title and plan applicability of premedical training remain unconfirmed. Do not invent an additional discipline from the conversation.

Source-plan examples:

| Cohort                              | Semester | Lectures            | Practicals          |
| ----------------------------------- | -------- | ------------------- | ------------------- |
| Computer science year 1, entry 2026 | Autumn   | 16 hours / 8 pairs  | 32 hours / 16 pairs |
| Same cohort                         | Spring   | 30 hours / 15 pairs | 32 hours / 16 pairs |
| Computer science year 2, entry 2025 | Autumn   | 36 hours / 18 pairs | 24 hours / 12 pairs |

Configure day policies on confirmed semester components, not keyword matching against titles. Eighteen lecture pairs require more than one weekly occurrence in some weeks of a 16-week semester.

For shortened semesters, compute deficits per teaching assignment, propose additional Saturdays, and let the dean confirm each date and the weekday schedule it represents. A Saturday may explicitly run a Monday, Tuesday, or another weekday template. Do not treat all Saturdays as unrestricted solver capacity. Existing Saturday-only events remain occupied and must be included in conflict checks.

Deficit calculations must preserve parity and all required participant/teacher hours; two missing weeks do not automatically imply exactly two Saturdays. Report insufficient capacity rather than fabricate a feasible calendar. The resulting timetable and feed use actual dates.

## Hard constraints and optimization

Hard constraints:

- No overlapping teacher or participant occupancy, including cross-group streams and subgroups.
- Confirmed unavailability, permitted dates and slots, and Saturday policies.
- Fixed teacher assignment and exact required teaching hours.
- Exam duration and minimum exam-free day.
- No pair 6 or 7 unless the dean explicitly authorizes an exception with defined scope and period. Record the authorization.

Soft criteria:

- Prefer the first three to four pair slots and a daily load not exceeding three to four pairs; do not fill a light day just to reach a target.
- Pair 5 and five-pair days are acceptable compromises, reported to the dean.
- Teacher preferences; fewer gaps and less uneven daily loads.
- Lecture before practical/seminar/laboratory, ideally about two days earlier. The next pair after a lecture is acceptable. Practice before the lecture is a reported compromise, not automatically infeasible.
- Early Saturday-only events.

The late-slot exception does not automatically authorize unlimited daily load. Exact hard daily workload limits, soft weights, and which criteria outrank one another need explicit pilot approval before production generation. Do not silently interpret a preference as a legal or safety limit.

Without topic-level data, precedence means temporal ordering only, not proof that lecture and practical topics match. Test precedence over actual occurrences, including alternating-week patterns.

Return candidate quality metrics and understandable unmet-preference diagnostics. Distinguish feasible, proven infeasible, and search-time-limit-without-result. A timeout is not proof of infeasibility. Do not promise mathematically minimal conflict explanations unless the chosen solver supports them. Candidate count, solve budget, and scoring weights are technical-design decisions benchmarked on the pilot.

## Exams and assessments

- Exams are separate session events for exam-assessed semester disciplines.
- Each exam occupies two consecutive pairs with the intervening break. Pairs 1 and 2 produce one event from 08:30 to 11:30.
- Do not deduct exam duration from lecture/practical/laboratory teaching hours.
- At least one complete exam-free calendar day between exams for a group: Monday and Wednesday are permitted; Monday and Tuesday are not.
- Prefer one to three complete exam-free days; longer intervals remain allowed.
- Check all participating groups and teachers, not only one displayed group label.
- Plan sessions on weekdays unless a separate exam exception is approved in a future requirement.
- Credit/pass assessment occurs during the final practical, seminar, or laboratory; no extra event or hours.
- No separate pre-exam consultation events. The last lecture may serve informally as consultation, but do not enforce or rename it automatically.

## Online links, changes, publication, and history

Store a default meeting URL on the semester teaching assignment and optional per-occurrence overrides. Teachers can update their own links without dean approval. Validate URLs at the trust boundary; do not fetch arbitrary supplied URLs server-side or render unsafe schemes. Audit link changes.

Proposed lifecycle: draft, validated, published. Candidates are drafts; publication is explicit. Incomplete drafts can be saved, but publication requires passed hard checks and exact workload accounting. Preserve history of prior published versions and staffing changes.

Teacher move/cancellation requests do not affect the published timetable until dean approval. Revalidate against current data when approving. Separate requests, their review state, and the published result. Protect against lost updates and stale generator snapshots using version checks; do not publish a solution generated from obsolete assignments without revalidation.

A canceled event must not silently reduce required teaching hours. Resolve the deficit with an approved replacement or an explicit, authorized change to the required input workload before accepting a complete replacement timetable.

## Calendar delivery

Provide `.ics` downloads and personal URL subscriptions for students and teachers. Direct Google OAuth synchronization is out of scope.

- Only published events relevant to that person; no drafts or pending changes.
- Stable event UIDs across moves and link changes, revision timestamps/sequence as required by the reviewed feed design, and cancellation/removal semantics tested with actual calendar clients.
- Exact occurrences for phased teaching, makeup dates, and one-off exceptions.
- Meeting URL, appropriate discipline title, timezone, and exam duration.
- Opaque, unguessable subscription tokens with revocation and rotation; never put student lists or credentials in feeds or logs.
- Treat subscription URLs as bearer secrets. Document that receiving calendar providers can retain imported event data.
- Client-controlled refresh intervals: the portal is authoritative and feeds are not instant notifications.

## Pilot and data handling

Pilot: autumn 2026/2027, computer science groups `КС11`, `КС12`, `КС13`, using the supplied first-year annual working plan after dean confirmation. Teachers, exact calendar dates, streams, and subgroups still require confirmed input.

The supplied lists also show other undergraduate years and master's groups. Preserve explicit degree level and entry year instead of deriving them from codes such as `КС51`. These broader cohorts are reference data, not automatic expansion of the pilot.

Use synthetic fixtures for 12- and 24-pair patterns, split subgroups, shared lectures with different official titles, shortened 14-week terms, Saturday conflicts, and unsatisfiable cases. Do not claim the source files contain a scenario that is only synthetic.

## Delivery work packages

Every package follows failing test, minimal implementation, passing verification, and focused review. Do not lower `CONSTRAINTS.md`, add skipped tests, bypass hooks, or add suppression comments to pass checks. Public contracts belong in core; all incoming backend payloads use validated DTOs. UI work follows Una tiers, accessibility requirements, and translation keys.

### 1. Reviewed technical design and pilot fixture

- [ ] Verify the current code paths, auth conventions, and constraints against the branch base.
- [ ] Confirm pilot dates, assignments, streams, subgroups, and directory ownership with the dean.
- [ ] Define the permission matrix, persistence model, shared contracts, and input validation rules.
- [ ] Decide parity anchor, holiday handling, daily workload ceiling, scoring weights, and solve budget explicitly.
- [ ] Review the written design before migrations or product implementation.

Deliverable: implementable design and a de-identified acceptance dataset. Avoid adding full curriculum authoring or elective-selection workflows.

### 2. Directory, workload table, and import

- [ ] Add migrations and contracts for the minimum agreed domain, preserving existing users and roles.
- [ ] Implement dean-managed group/teacher selection and workload rows with derived pair counts.
- [ ] Support subgroup and stream participation explicitly.
- [ ] Import the supplied plan layouts through preview, row-specific errors, and explicit commit; reject ambiguous or inconsistent input rather than silently repair it.
- [ ] Test permissions, duplicate imports, hour totals, shared lectures, and transaction rollback on failure.

Deliverable: validated pilot inputs editable in the portal. Spreadsheet parser choice must include dependency/security review; no automatic web scraping as a staffing authority.

### 3. Calendar expansion and independent validator

- [ ] Implement timezone-aware dated slots, parity, phased recurrence, excluded dates, and explicit makeup mappings.
- [ ] Implement exact academic-hour accounting and teacher/participant overlap validation.
- [ ] Implement Saturday-only policy and explicit pair 6/7 authorizations.
- [ ] Add synthetic tests for 14/16 weeks, 8/12/16/24 pairs, 18 Saturday lecture pairs, and conflicting makeup dates.

Deliverable: a deterministic validator reusable by manual editing, generation, approval, and publication. A generator candidate must pass this validator independently of solver scoring.

### 4. Manual timetable and publication

- [ ] Replace demonstration events in the existing timetable with authorized API data.
- [ ] Add dean draft editing and visible conflict diagnostics.
- [ ] Publish atomically only after validation; keep published snapshots/history.
- [ ] Add student/teacher filtering on the server and protect parallel edits.
- [ ] Verify real browser interactions, keyboard access, empty/error states, and unauthorized access.

Deliverable: useful end-to-end manual scheduling before solver dependency.

### 5. Teacher availability, links, and change requests

- [ ] Add preference campaign/deadline entry and hard-unavailability review.
- [ ] Add default meeting links and per-occurrence overrides with ownership checks.
- [ ] Add teacher move/cancel requests and dean approval with current-state conflict checks.
- [ ] Test missing preferences, pending/confirmed unavailability, stale approvals, link validation, and canceled-event hour deficits.

Deliverable: auditable teacher/dean workflow without direct teacher timetable publication.

### 6. Solver feasibility experiment

- [ ] Benchmark a maintained constraint-solving approach using synthetic and confirmed pilot snapshots.
- [ ] Measure runtime, feasible quality, memory, and behavior under impossible constraints.
- [ ] Decide worker/process isolation and deployment requirements from results.
- [ ] Record the selected dependency, version, license, cancellation behavior, and reproducibility strategy in the technical design.

Deliverable: evidence-backed solver selection, not a throwaway prototype silently promoted to production.

### 7. Teaching generation and makeup proposals

- [ ] Generate assignments under all hard constraints with stable recurring slots.
- [ ] Add the agreed soft criteria, explicit quality metrics, and candidate comparison.
- [ ] Calculate workload deficits and propose dean-confirmable makeup Saturdays.
- [ ] Report infeasibility versus timeout accurately; preserve validated inputs and existing published data on failure.
- [ ] Test stale snapshots, cancellation of solving, insufficient Saturday capacity, and manual edits after generation.

Deliverable: reviewable teaching candidates; never automatic publication.

### 8. Exam planning

- [ ] Derive required exams from confirmed assessment data.
- [ ] Schedule two-pair events inside the session period with the hard exam-free day and soft spacing target.
- [ ] Test multi-group exams, teacher occupancy, slot-boundary rejection, and insufficient session capacity.
- [ ] Confirm that pass assessments and consultations create no extra scheduled workload.

Deliverable: validated exam candidates handled through the same publication workflow.

### 9. Calendar subscriptions and ICS

- [ ] Review and reuse or replace the existing export helper based on verified capabilities.
- [ ] Add authenticated token issuance, revocation, and a minimal read-only calendar endpoint.
- [ ] Validate stable identities, moves, cancellations, exact dates, URL escaping, timezone transitions, and token rotation.
- [ ] Verify import and subscription behavior in actual Google Calendar and at least one other client; document refresh limitations.

Deliverable: personal published calendars without OAuth token storage.

### 10. Acceptance and staged rollout

- [ ] Have the dean verify pilot workload totals, staffing, streams, subgroups, Saturday handling, exams, and quality compromises.
- [ ] Run security and permission review, browser verification, and whole-branch code review.
- [ ] Run `pnpm lint`, `pnpm lint:style`, `pnpm typecheck`, `pnpm test`, `pnpm build`, changed-file Prettier checks, and the applicable requirement-driven tests. Run Storybook checks if UI package changes require them.
- [ ] Keep CI thresholds and constraints unchanged; distinguish failures, passes, and checks not run.
- [ ] Deploy behind flags, validate migrations and rollback strategy, then enable the pilot before broader rollout.

Deliverable: dean-accepted published pilot, documented operational limits, and a safe rollout path. Do not claim the system guarantees feasible solutions for arbitrary workloads.

## Review focus

1. Student conflicts hidden by overlapping streams or different subgroup partitions: test actual participant intersections, not group-name equality.
2. Hours lost or duplicated by parity, shortening, makeup days, or cancellation: test dated totals and replacement handling.
3. Unapproved restrictions, stale edits, or obsolete solver snapshots changing published data: test authorization and optimistic concurrency.
4. Calendar identity and confidentiality failures: test moves/cancellations without duplicates, revoked tokens, and no draft or roster leakage.
5. Calendar or solver exhaustion: test impossible Saturday capacity, too-short sessions, timeouts, and no silent constraint relaxation.

## Out of scope

- Physical rooms, equipment, travel between campuses, and room-capacity optimization.
- Complete educational-program authoring, elective proposal/selection workflows, gradebooks, and Moodle replacement.
- Mandatory EDEBO synchronization or blocking staff without an external record.
- Multiple teachers splitting one assignment's hours.
- Direct Google Calendar OAuth integration.
- Topic-level lecture/practice dependency modelling.

## Remaining decisions before implementation

No further conversational scope approval is needed to preserve this roadmap. Before implementation, review concrete design choices: exact semester/session dates and parity anchor; non-teaching dates; a hard daily workload ceiling; preference weights; solver limits; approved source-plan mappings and staff assignments; and subscription cancellation compatibility. Do not invent these values or treat unavailable data as confirmed.

The protected integration branch must require PR review, resolved conversations, and the repository's actual applicable CI checks, while forbidding force pushes and deletion. Discover check names and scope before configuring them; never claim protection merely because a branch exists. Do not weaken protection on any existing branch.
