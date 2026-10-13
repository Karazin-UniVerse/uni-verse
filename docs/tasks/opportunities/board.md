# Tasks: Opportunities board

Drafts of the implementation tasks that close the mismatches found between `docs/prd/opportunities/board.md`, `docs/test-cases/opportunities/board.md` and the code. `D-NN` in `Closes` are rows of the discrepancy register (`docs/discrepancies/opportunities/board.md`), which is deleted when every row is closed; each task below is complete without it.

Written for the Notion Project Dashboard; not created there. Each task gets its own design, plan and implementation. Tests are written together with the code and carry the `TC-` ID of the case they implement (Task 7).

### Task 1: Access and privacy

- Closes: D-16, D-36, D-12, D-38
- What: make the catalog, the opportunity details and the opportunity lists available only to signed-in users (no public access, no owner email or contact information for visitors). Read the role from the database, not from the sign-in token, wherever the role decides access (unpublished items, the moderation queue, moderation). Let a moderator read the applications of any opportunity, read-only. Show the owner, for each applicant, the contact the applicant typed and the corporate email.
- Where: `packages/backend/opportunities/opportunities.controller.ts` (the `@Public()` routes), `opportunities.service.ts` (`findAll`, `findOne`, `getOpportunityApplications`), `packages/uni-hub/views/dashboard/tabs/opportunities/modals/ApplicantsModal.tsx`.
- Satisfies: REQ-OPP-05.5, 03.5, 15.2, 12.2, 12.3; TC-OPP-52, 59, 43, 37, 35, 36.

### Task 2: Visibility from status and phase, and take-down

- Closes: D-04, D-42, D-43
- What: nothing is stored for visibility; work it out from the moderation status and the phase. The catalog, the opportunity details and the apply button (server and interface) use one rule: published and in the start or active phase (a shared helper in `@universe/core`). The details of an opportunity outside the catalog stay open to its owner, to moderators and, read-only without the apply button, to its applicants. An owner takes an opportunity out of the catalog and brings it back by changing the phase. Let a moderator return a published opportunity for changes or reject it from the moderation tab, with a required comment; the phase and the applications are kept and new applications are refused. The owner's notification about it is part of Task 5.
- Where: `packages/backend/opportunities/opportunities.service.ts` (`findAll`, `findOne`, `moderate`, `apply`), `packages/core` (the rule), `packages/uni-hub/views/dashboard/tabs/opportunities` (catalog, details modal, my opportunities, moderation tab), translation files uk and en. No database change.
- Satisfies: REQ-OPP-05.1, 07.3, 07.4, 09.3, 10.1, 18.1, 18.2, 18.3, 03.1; TC-OPP-15, 27, 46, 48, 60, 61, 65.

### Task 3: Edit and moderation flow

- Closes: D-01, D-25, D-02, D-35, D-05
- What: refuse content changes in ready for review and rejected on the server; add editing to the interface for a draft, a returned and a published opportunity (a published one goes back to ready for review). Require a comment when a moderator returns or rejects, and clear the old comment on approval. The moderation tab lists all opportunities with a filter by moderation status, and the decision actions apply to those in ready for review. A moderator may moderate their own opportunity (keep it allowed and cover it with a test).
- Where: `packages/backend/opportunities/opportunities.service.ts` (`update`, `moderate`), `dto/moderate-opportunity.dto.ts`, `packages/uni-hub/services/api.opportunities.ts` (`updateOpportunity`), `views/dashboard/tabs/opportunities` (`useOpportunitiesData.ts`, `ModerationQueueTab.tsx`, `modals/ModerationRejectModal.tsx`, `useOpportunityDetail.ts`, a new edit form).
- Satisfies: REQ-OPP-02.2, 02.3, 02.4, 02.5, 03.2, 03.3, 03.4, 03.7, 03.8, 05.4, 08.3; TC-OPP-05, 06, 07, 08, 09, 10, 18, 29, 51, 58, 62.
- After: Task 2 (both change the details modal and the moderation tab) and Task 8 (the moderator's comment moves to the `Comment` model).

### Task 4: Applications

- Closes: D-33, D-17, D-11, D-27, D-30, D-39
- What: add the short description of the candidate to the application form and show it, with the motivation, in the applicant's details for the owner (the backend already accepts `briefDescription`); refuse an application to one's own opportunity on the server; accept applications in the start and active phases (server and the apply button); notify the applicant after sending (the owner is still notified); return the owner with each application so that my applications shows it; let the owner add a comment to a decision in the interface. A decision without a comment clears the earlier comment. Keep allowing the owner to decide on the existing applications of an opportunity in the paused, cancelled or completed phase, or one taken down by a moderator (cover it with a test).
- Where: `packages/backend/opportunities/opportunities.service.ts` (`apply`, `getMyApplications`), `views/dashboard/tabs/opportunities/modals/OpportunityDetailModal.tsx` (`canApply`), `modals/ApplyOpportunityModal.tsx`, `useApplicantActions.ts`, `OpportunitiesTab.tsx`, `modals/ApplicantsModal.tsx`, `useApplicants.ts`, `MyApplicationsTab.tsx`, translation files uk and en.
- Satisfies: REQ-OPP-10.1, 10.3, 10.5, 11.1, 12.2, 12.4, 12.5; TC-OPP-32, 54, 33, 35, 46, 56, 63.
- After: Task 2 (an opportunity outside the catalog refuses applications) and Task 8 (the owner's comment moves to the `Comment` model).

### Task 5: Notifications

- Closes: D-14, D-23, D-13, D-15
- What: show the portal's notifications in the header list together with the Moodle ones, with read and unread state and a working link. Build the text of a notification from its stored type and values, with Ukrainian and English translations for every type (Task 8 changes the stored form). Make the stored links point to real pages. Mark a notification read when the user follows it and add a "mark all as read" action. Keep notifying the owner of each new application and the applicant of each status change with the owner's comment, and notify the owner when a moderator takes their opportunity down (return or rejection). Notify the owner when an opportunity is submitted for review, and notify moderators when an opportunity is created or submitted, or submitted again (an edit of a published opportunity counts as a new submission).
- Where: `packages/uni-hub/views/dashboard/layout/DashboardHeader.tsx`, `views/dashboard/hooks/useDashboardData.ts`, `services/api.moodle.ts` and a new client for the backend notifications, `packages/backend/opportunities/opportunities.service.ts` (`changeStatus` and the other `createNotification` calls), `packages/backend/notifications`, `packages/uni-hub/i18n/locales/{uk,en}.ts`.
- Satisfies: REQ-OPP-13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 14.1, 10.3; TC-OPP-38, 39, 40, 41, 57, 64.
- After: Tasks 2, 3 and 8 (the take-down and edit events, the stored form of a notification).

### Task 6: Catalog and screens

- Closes: D-06, D-07, D-26, D-28, D-44
- What: add the filter by phase to the catalog, to "My opportunities" and to the moderation tab; show a "nothing matched" message that differs from the empty-catalog message; show the creation date and the phase on the catalog card; show the last-changed date on the details page, in my opportunities and in my applications.
- Where: `packages/uni-hub/views/dashboard/tabs/opportunities/CatalogTab.tsx`, `tabs/OpportunityCard.tsx`, `modals/OpportunityDetailModal.tsx`, `MyApplicationsTab.tsx`, translation files uk and en.
- Satisfies: REQ-OPP-06.4, 06.5, 06.6, 05.2, 07.1, 08.1, 11.1; TC-OPP-22, 23, 66, 16, 25, 28, 33.

### Task 7: Tests carry the case IDs

- Closes: D-22
- What: every automated case (`unit` or `playwright`) gets a test whose title contains its `TC-` ID, written together with the code of Tasks 1 to 6 and 8; existing specs that already cover a case get the ID too. After each task, fill `automated-at` in the test cases. Decide where Playwright tests live, as the repository has no Playwright configuration yet.
- Where: `packages/backend/opportunities/*.spec.ts`, `packages/uni-hub/**/*.test.ts`, `tests/e2e`, `docs/test-cases/opportunities/board.md`.
- Satisfies: all cases TC-OPP-01 to TC-OPP-66 whose `verification` is not `manual`.

### Task 8: Data model follows the ERD

- Closes: D-03, D-40, D-41, D-45
- What: store the moderator's comment and the owner's comment as `Comment` rows (author, text, date), linked to the opportunity or to the application, and keep only the latest one for each; remove the string fields `moderationComment` and `ownerComment` and move the existing values into `Comment` rows (the author of an old moderator comment is unknown; decide whether to keep it). Keep the notification `type` but make it required, and store its values (the opportunity, the comment) in a structured field instead of the JSON string in `message`; `title` (a translation key) goes away, the interface builds the text from the type and the values. Drop the ERD relation "Moderates" from the diagram (no stored assignment).
- Where: `packages/backend/prisma/schema.prisma` (`Opportunity`, `OpportunityApplication`, `Comment`, `Notification`), `packages/backend/opportunities/opportunities.service.ts`, `packages/backend/notifications`, `packages/core` types and DTO fields. The database is updated with the project's `db:push` flow; a data step for old comments and notifications is needed before running it on each environment.
- Satisfies: REQ-OPP-03.9, 12.5, 13.7; TC-OPP-62, 63, 64.
