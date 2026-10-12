# Parallelization: Opportunities board (two developers)

How to split the tasks in `docs/tasks/opportunities/board.md` between two developers so that they rarely edit the same file. Task numbers are the ones in that file.

## Why the tasks cannot simply be shared out

The declared order is T3, T4 and T5 after T2, and T5 also after T3. Several files are also shared:

| File                                                      | Tasks         |
| --------------------------------------------------------- | ------------- |
| `packages/backend/opportunities/opportunities.service.ts` | 1, 2, 3, 4, 5 |
| `OpportunityDetailModal.tsx`                              | 2, 3, 4, 6    |
| `ApplicantsModal.tsx`                                     | 1, 4          |
| `ModerationQueueTab.tsx`                                  | 2, 3          |
| `MyApplicationsTab.tsx`                                   | 4, 6          |
| `packages/uni-hub/i18n/locales/{uk,en}.ts`                | all           |

Most of the "after" links are about the UI (the same modal and tab), not about the logic. So the server part of T3 and T4 can move in parallel with T2, and the part of T5 that only shows notifications does not wait for anything. T2 is the critical path: the UI of T3 and T4 waits for it, so its server part goes first and as a small pull request.

## Split by layer

One developer owns the backend, the other owns the Next.js UI. Each file then has one owner, and the only contact points are the API contracts.

- **Dev 1, backend** (`packages/backend`, `packages/database`, `packages/core`): the server part of T1, T2, T3, T4 and the notification events of T5.
- **Dev 2, UI** (`packages/uni-hub`, `packages/ui`): T5 display in the header, T6, and the UI part of T1, T2, T3 and T4.

## Step 0: agree on contracts (before the first pull request)

- The `visibility` values and the DTO field names in `@universe/core/types` (T2), the new fields of an application (`briefDescription`, owner, contact, corporate email), and the moderation comment field.
- The list of stored notification titles and link formats (T5): Dev 1 creates notifications with these titles, Dev 2 translates them in `uk.ts` and `en.ts`.
- Translation key prefix per task or screen (for example `opportunities.visibility.*`), so the two locale files change in different places.
- Where Playwright tests live (T7). Dev 2 owns the decision and the setup; it does not block anyone, because unit tests are enough until it is done.

## Order of work

| Step | Dev 1 (backend)                                                                                                                                                                                                | Dev 2 (UI)                                                                                                                                                                                         |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | **T2 server part:** `visibility` in `schema.prisma`, types, service, controller, DTOs. Small pull request, merge first.                                                                                        | **T5 display:** portal notifications in the header list with Moodle ones, read and unread state, working links, "mark all as read", translations of stored titles.                                 |
| 2    | **T1 server part:** public routes closed, role read from the database, moderator reads applications, owner sees contact and corporate email.                                                                   | **T6 catalog part:** `CatalogTab` (phase filter, "nothing matched" message), `OpportunityCard` (creation date, phase).                                                                             |
| 3    | **T3 server part:** refuse edits in ready for review and rejected, comment required on return or rejection, old comment cleared on approval.                                                                   | **T2 UI** (after Dev 1's step 1 is merged): hide and show actions in the owner's views and the moderation tab, the `visibility` value on screen.                                                   |
| 4    | **T4 server part:** refuse an application to one's own opportunity, accept applications in start and active phases, refuse them for hidden ones, notify the applicant, return the owner with each application. | **T3 UI** (after step 3): edit form, moderation tab with the status filter, reject modal with a required comment.                                                                                  |
| 5    | **T5 events:** notifications for hiding, edits of a published opportunity, submit and resubmit, moderator alerts. Needs T2 and T3 on the server.                                                               | **T4 UI** (after step 4) together with the UI part of **T1** in `ApplicantsModal.tsx`: candidate description in the form and in applicant details, owner comment on a decision, contact and email. |
| 6    | Backend tests and `automated-at` for its tasks.                                                                                                                                                                | **T6 rest:** last-changed date in details, my opportunities and my applications (after T3 and T4 UI, same files). UI tests, Playwright, `automated-at` for its tasks.                              |

The `ApplicantsModal.tsx` part of T1 goes to Dev 2 together with T4, so that one person edits that file once.

## Hand-off points

| When                   | What Dev 2 gets                                               |
| ---------------------- | ------------------------------------------------------------- |
| Step 1 of Dev 1 merged | `visibility` in the API and types: start T2 UI.               |
| Step 3 of Dev 1 merged | Edit and moderation rules on the server: start T3 UI.         |
| Step 4 of Dev 1 merged | Application rules and the owner in the response: start T4 UI. |

Dev 1 never waits for Dev 2. If Dev 2 is blocked, Dev 2 takes the next row that has no dependency (T5 display or T6 catalog part).

## Working rules

- One pull request per task and layer, merged into `develop` in small steps; the other developer rebases on it.
- Each pull request changes only the `automated-at` of its own `TC-` cases in `docs/test-cases/opportunities/board.md`.
- The `db:push` for T2 is run once per environment after Dev 1's step 1 is merged; check first whether a data step is needed (see T2).
- T7 is not a separate piece of work: every test carries the `TC-` ID of its case and is written with the code of its task.
