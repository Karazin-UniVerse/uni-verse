# Tasks: Opportunities board

Drafts of the implementation tasks that close the mismatches found between `docs/prd/opportunities/board.md`, `docs/test-cases/opportunities/board.md` and the code. `D-NN` in `Closes` are rows of the discrepancy register (`docs/discrepancies/opportunities/board.md`), which is deleted when every row is closed; each task below is complete without it.

Written for the Notion Project Dashboard; not created there. Each task gets its own design, plan and implementation. Tests are written together with the code and carry the `TC-` ID of the case they implement (Task 7).

### Task 1: Access and privacy

- Closes: D-16, D-36, D-12, D-38
- What: make the catalog, the opportunity details and the opportunity lists available only to signed-in users (no public access, no owner email or contact information for visitors). Read the role from the database, not from the sign-in token, wherever the role decides access (unpublished items, the moderation queue, moderation). Let a moderator read the applications of any opportunity, read-only. Show the owner, for each applicant, the contact the applicant typed and the corporate email.
- Where: `packages/backend/opportunities/opportunities.controller.ts` (the `@Public()` routes), `opportunities.service.ts` (`findAll`, `findOne`, `getOpportunityApplications`), `packages/uni-hub/views/dashboard/tabs/opportunities/modals/ApplicantsModal.tsx`.
- Satisfies: REQ-OPP-05.5, 03.5, 15.2, 12.2, 12.3; TC-OPP-52, 43, 37, 35, 36.

### Task 2: Hide and show an opportunity (visibility)

- Closes: D-04
- What: add a `visibility` value to an opportunity: visible (default), hidden by owner, hidden by moderator. An owner hides and shows their own published opportunity; a moderator hides and shows any published one; an owner cannot lift a moderator's hiding. Hidden opportunities leave the catalog for ordinary users and refuse new applications; moderation status, phase and applications do not change. Add the actions to the owner's views and to the moderation tab, and show the value.
- Where: `packages/database/client/schema.prisma` (`model Opportunity`), `packages/backend/opportunities` (service, controller, DTOs), `packages/uni-hub/views/dashboard/tabs/opportunities` (details modal, my opportunities, moderation tab), `packages/uni-hub/types`, translation files uk and en. The database is updated with the project's `db:push` flow; check whether a data step is needed before running it on each environment.
- Satisfies: REQ-OPP-04.1, 04.2, 04.3, 09.4, 17.1, 17.2, 17.3, 05.1; TC-OPP-13, 14, 15, 53.

### Task 3: Edit and moderation flow

- Closes: D-01, D-25, D-02, D-35, D-05
- What: refuse content changes in ready for review and rejected on the server; add editing to the interface for a draft, a returned and a published opportunity (a published one goes back to ready for review). Require a comment when a moderator returns or rejects, and clear the old comment on approval. The moderation tab lists all opportunities with a filter by moderation status, and the decision actions apply to those in ready for review.
- Where: `packages/backend/opportunities/opportunities.service.ts` (`update`, `moderate`), `dto/moderate-opportunity.dto.ts`, `packages/uni-hub/services/api.opportunities.ts` (`updateOpportunity`), `views/dashboard/tabs/opportunities` (`useOpportunitiesData.ts`, `ModerationQueueTab.tsx`, `modals/ModerationRejectModal.tsx`, `useOpportunityDetail.ts`, a new edit form).
- Satisfies: REQ-OPP-02.2, 02.3, 02.4, 02.5, 03.2, 03.3, 03.4, 05.4, 08.3; TC-OPP-05, 06, 07, 08, 09, 10, 18, 29, 51.
- After: Task 2 (both change the details modal and the moderation tab).

### Task 4: Applications

- Closes: D-33, D-17, D-11, D-27, D-30
- What: refuse an application to one's own opportunity on the server; accept applications in the start and active phases (server and the apply button); notify the applicant after sending (the owner is still notified); return the owner with each application so that my applications shows it; let the owner add a comment to a decision in the interface.
- Where: `packages/backend/opportunities/opportunities.service.ts` (`apply`, `getMyApplications`), `views/dashboard/tabs/opportunities/modals/OpportunityDetailModal.tsx` (`canApply`), `modals/ApplicantsModal.tsx`, `useApplicants.ts`, `MyApplicationsTab.tsx`.
- Satisfies: REQ-OPP-10.1, 10.3, 10.5, 11.1, 12.2; TC-OPP-32, 54, 33, 35, 46.
- After: Task 2 (a hidden opportunity refuses applications).

### Task 5: Notifications

- Closes: D-14, D-23, D-13, D-15
- What: show the portal's notifications in the header list together with the Moodle ones, with read and unread state and a working link. Add Ukrainian and English translations for every stored notification title. Make the stored links point to real pages. Notify the owner when an opportunity is submitted for review, and notify moderators when an opportunity is created or submitted, submitted again, changed while published, or hidden.
- Where: `packages/uni-hub/views/dashboard/layout/DashboardHeader.tsx`, `views/dashboard/hooks/useDashboardData.ts`, `services/api.moodle.ts` and a new client for the backend notifications, `packages/backend/opportunities/opportunities.service.ts` (`changeStatus` and the other `createNotification` calls), `packages/backend/notifications`, `packages/uni-hub/i18n/locales/{uk,en}.ts`.
- Satisfies: REQ-OPP-13.1, 13.2, 13.3, 13.4, 14.1, 10.3; TC-OPP-38, 39, 40, 41.
- After: Tasks 2 and 3 (the hide and edit events).

### Task 6: Catalog and screens

- Closes: D-06, D-07, D-26, D-28
- What: add the filter by phase to the catalog; show a "nothing matched" message that differs from the empty-catalog message; show the creation date on the catalog card; show the last-changed date on the details page, in my opportunities and in my applications.
- Where: `packages/uni-hub/views/dashboard/tabs/opportunities/CatalogTab.tsx`, `tabs/OpportunityCard.tsx`, `modals/OpportunityDetailModal.tsx`, `MyApplicationsTab.tsx`, translation files uk and en.
- Satisfies: REQ-OPP-06.4, 06.5, 05.2, 07.1, 08.1, 11.1; TC-OPP-22, 23, 16, 25, 28, 33.

### Task 7: Tests carry the case IDs

- Closes: D-22
- What: every automated case (`unit` or `playwright`) gets a test whose title contains its `TC-` ID, written together with the code of Tasks 1 to 6; existing specs that already cover a case get the ID too. After each task, fill `automated-at` in the test cases. Decide where Playwright tests live, as the repository has no Playwright configuration yet.
- Where: `packages/backend/opportunities/*.spec.ts`, `packages/uni-hub/**/*.test.ts`, `tests/e2e`, `docs/test-cases/opportunities/board.md`.
- Satisfies: all cases TC-OPP-01 to TC-OPP-55 whose `verification` is not `manual`.
