# Tech debt

Known gaps that were consciously left out of a PR. Each item says where it lives, why it was deferred and what the fix looks like. When you close one, delete it from this file in the same PR.

## Backend

### Application status races (opportunities)

`OpportunitiesService.updateApplicationStatus` and `withdrawApplication` read the application, check its status and then update it without a guard. If the applicant withdraws while the owner changes the status (or the other way round), the later write overwrites the earlier one: an owner's `ACCEPTED` can become `WITHDRAWN`, or a `WITHDRAWN` application can become `ACCEPTED`.

- **Why deferred:** the window is a few milliseconds between two manual actions, and the damage is one wrong status on one application. Raised in PR #181 and skipped.
- **Fix:** make the transition conditional. For withdrawal, add `status: { in: [SUBMITTED, UNDER_REVIEW] }` to the `where` of `update` and map `P2025` to a 409. For the owner update, use `updateMany` with `status: { not: WITHDRAWN }` (or a transaction) and throw when `count` is 0. Add tests for both losing orders.

### Roles backfill runs on every `db push`

`db:push` and `db:push:force` first run `prisma/scripts/backfill-roles.sql` (`pnpm db:backfill-roles`), which copies `User.role` into `User.roles` and drops `role`. The repo has no Prisma migrations, so this keeps the `role` → `roles` change from resetting everyone to `[STUDENT]` (PR #217). The script is idempotent and does nothing once `role` is gone.

- **Why deferred:** removing it is only safe after every environment (dev, staging, prod) has started once with the new schema.
- **Fix:** when that is true, delete `prisma/scripts/backfill-roles.sql`, the `db:backfill-roles` script and its calls in `db:push` and `db:push:force`.

### Role is trusted from the token on read paths

`GET /opportunities` and `GET /opportunities/:id` use the `roles` claim from the access token. A demoted moderator keeps access to unpublished opportunities until the token expires (about 15 minutes). `moderate` already re-checks the role in the database.

- **Why deferred:** an extra user lookup on every read for a short window. Accepted trade-off, listed here so it is a decision and not a surprise.
- **Fix, if it matters:** resolve the moderator role from the database in `findOne` and `findAll`, or shorten the token lifetime.

## Frontend (uni-hub)

### Opportunity types are duplicated outside `@universe/core`

`packages/uni-hub/types.ts` declares `OpportunityStatus`, `OpportunityLifecycle`, `OpportunityPaymentType`, `OpportunityAppStatus`, `Opportunity` and `OpportunityApplication` by hand. The backend uses the Prisma enums. Shared contracts belong in `@universe/core/types` (see [architecture](ai/architecture.md#packages-and-dependency-rules)).

- **Fix:** move the contracts to `@universe/core/types`, make the backend DTOs and the frontend import the same types.

### Status values are string literals in the views

Components and hooks compare against `'PAID'`, `'READY_FOR_REVIEW'`, `'ACCEPTED'`, `'WITHDRAWN'`, `'APPROVE'` and similar literals (`CatalogTab`, `MyApplicationsTab`, `ModerationQueueTab`, `ApplicationStatusBadge`, `useModeration`). Sub-tabs and nav keys already use const objects (`OPPORTUNITY_SUB_TAB`, `NAV_KEY`).

- **Fix:** add const objects next to the shared types above (`OPPORTUNITY_STATUS`, `APPLICATION_STATUS`, `MODERATION_ACTION`) and replace the literals.

### Other places that read the access token

`useCurrentUser` (`packages/uni-hub/hooks/useCurrentUser.ts`) is the single place to read the user from the token, but `AssignmentModal` still reads `localStorage.accessToken` directly.

- **Fix:** use `useCurrentUser` or a small token helper there.

### Token is read in a `useState` initializer

`useCurrentUser` reads `safeStorage` during the first render. There is no hydration mismatch today because the opportunities tab mounts only after client-side navigation, but it breaks if the tab ever renders on the server. A reviewer asked for `useSyncExternalStore` or an effect (PR #182).

- **Fix:** read the token with `useSyncExternalStore` on `safeStorage`, or move the user into a provider.

### `OpportunitiesTab.module.scss` uses raw values

About a thousand lines use values outside the design tokens (`padding: 5px 12px`, `gap: 26px`, `font-size: 11px`, `border-radius: 14px`, hex fallbacks). Raised by CodeRabbit in PR #182. The unused classes were already removed.

- **Why deferred:** converting them moves the layout by a pixel or two in many places and needs a visual check of every sub-tab and theme.
- **Fix:** a separate PR with before/after screenshots, using the tokens from [design-system](ai/design-system.md).

### `ApplicantsModal` is still an application component

`views/dashboard/tabs/opportunities/modals/ApplicantsModal.tsx` (about 160 lines) holds the markup and styling for the applicants list. The other four opportunities modals were moved to `packages/ui/components/complex` with stories.

- **Fix:** move the presentation to `ui/complex/ApplicantsModal` with a story and keep a thin translating wrapper in uni-hub.

### `useAsyncList` is private to one file

`useAsyncList` in `useOpportunitiesData.ts` (per-list loading, stale-response protection) is generic, but it has one consumer, so it stays private by the [reuse rule](ai/code-style.md#reuse-before-writing-dry).

- **Fix:** when a second consumer appears, move it to `packages/uni-hub/hooks/useAsyncList.ts` with a unit test for the stale-request case.

### `asList` is not used everywhere

`asList` (`packages/uni-hub/utils/arrays.ts`) replaces the `Array.isArray(x) ? x : []` fallback. The backend (`moodle-*.service.ts`) still has similar checks, but it cannot import from uni-hub.

- **Fix:** if the backend needs the same helper, promote it to `@universe/core/utils/arrays.ts`.
