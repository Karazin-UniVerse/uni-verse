# Parallelization: Opportunities board (two developers)

How to split the tasks in `docs/tasks/opportunities/board.md` between two developers so that they rarely edit the same file. Task numbers are the ones in that file.

## Why the tasks cannot simply be shared out

The declared order is T3, T4 and T5 after T2 and T8, and T5 also after T3. Several files are also shared:

| File                                                      | Tasks            |
| --------------------------------------------------------- | ---------------- |
| `packages/backend/opportunities/opportunities.service.ts` | 1, 2, 3, 4, 5, 8 |
| `OpportunityDetailModal.tsx`                              | 2, 3, 4, 6       |
| `ApplicantsModal.tsx`                                     | 1, 4             |
| `ModerationQueueTab.tsx`                                  | 2, 3             |
| `MyApplicationsTab.tsx`                                   | 4, 6             |
| `packages/uni-hub/i18n/locales/{uk,en}.ts`                | all              |

Most of the "after" links are about the UI (the same modal and tab), not about the logic. So the server part of T3 and T4 can move in parallel with T2, and the part of T5 that only shows notifications does not wait for anything. T8 (data model) and T2 are the critical path: the UI of T3 and T4 waits for them, so their server parts go first and as small pull requests.

## Split by layer

One developer owns the backend, the other owns the Next.js UI. Each file then has one owner, and the only contact points are the API contracts.

- **Dev 1, backend** (`packages/backend`, `packages/database`, `packages/core`): the server part of T1, T2, T3, T4, T8 and the notification events of T5.
- **Dev 2, UI** (`packages/uni-hub`, `packages/ui`): T5 display in the header, T6, and the UI part of T1, T2, T3 and T4.

## Step 0: agree on contracts (before the first pull request)

- The rule "listed in the catalog" in `@universe/core` and the DTO field names in `@universe/core/types` (T2), the new fields of an application (`briefDescription`, owner, contact, corporate email), the comment of an opportunity and of an application as `Comment` (T8), and the stored form of a notification (type and values).
- The list of notification types, their values and link formats (T5): Dev 1 creates notifications with these types, Dev 2 translates them in `uk.ts` and `en.ts`.
- Translation key prefix per task or screen (for example `opportunities.takedown.*`), so the two locale files change in different places.
- Where Playwright tests live (T7). Dev 2 owns the decision and the setup; it does not block anyone, because unit tests are enough until it is done.

## Order of work

| Step | Dev 1 (backend)                                                                                                                                                                                                         | Dev 2 (UI)                                                                                                                                                                                                        |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | **T8 and T2 server part:** `Comment` rows, notification type and values in `schema.prisma`, the catalog rule, take-down in the service, DTOs. Small pull requests, merge first.                                         | **T5 display:** portal notifications in the header list with Moodle ones, read and unread state, working links, "mark all as read", translations of notification types.                                           |
| 2    | **T1 server part:** public routes closed, role read from the database, moderator reads applications, owner sees contact and corporate email.                                                                            | **T6 catalog part:** `CatalogTab` (phase filter, "nothing matched" message), `OpportunityCard` (creation date, phase).                                                                                            |
| 3    | **T3 server part:** refuse edits in ready for review and rejected, comment required on return or rejection, old comment cleared on approval.                                                                            | **T2 UI** (after Dev 1's step 1 is merged): the catalog rule in the interface, take-down actions in the moderation tab, the phase actions in the owner's views.                                                   |
| 4    | **T4 server part:** refuse an application to one's own opportunity, accept applications in start and active phases, refuse them outside the catalog rule, notify the applicant, return the owner with each application. | **T3 UI** (after step 3): edit form, moderation tab with the status filter, reject modal with a required comment.                                                                                                 |
| 5    | **T5 events:** notifications for take-down, edits of a published opportunity, submit and resubmit, moderator alerts. Needs T2, T3 and T8 on the server.                                                                 | **T4 UI** (after step 4) together with the UI part of **T1** in `ApplicantsModal.tsx`: candidate description in the form and in applicant details, owner comment on a decision, contact and email.                |
| 6    | Backend tests for its tasks. Records `automated-at` only for cases with `verification: unit`.                                                                                                                           | **T6 rest:** last-changed date in details, my opportunities and my applications (after T3 and T4 UI, same files). UI tests and Playwright. Records `automated-at` only for cases with `verification: playwright`. |

The `ApplicantsModal.tsx` part of T1 goes to Dev 2 together with T4, so that one person edits that file once.

## Hand-off points

| When                   | What Dev 2 gets                                                   |
| ---------------------- | ----------------------------------------------------------------- |
| Step 1 of Dev 1 merged | The catalog rule and `Comment` in the API and types: start T2 UI. |
| Step 3 of Dev 1 merged | Edit and moderation rules on the server: start T3 UI.             |
| Step 4 of Dev 1 merged | Application rules and the owner in the response: start T4 UI.     |

Dev 1 never waits for Dev 2. If Dev 2 is blocked, Dev 2 takes the next row that has no dependency (T5 display or T6 catalog part).

## Working rules

- One pull request per task and layer, merged into `develop` in small steps; the other developer rebases on it.
- Only the owner determined by the case's `verification` value changes its `automated-at` field in `docs/test-cases/opportunities/board.md`: Dev 1 for `unit`, Dev 2 for `playwright`. The other pull request must not edit that field even when its test carries the same `TC-` ID.
- The `db:push` for T8 is run once per environment after Dev 1's step 1 is merged; run its data step first (see T8).
- T7 is not a separate piece of work: every test carries the `TC-` ID of its case and is written with the code of its task.
