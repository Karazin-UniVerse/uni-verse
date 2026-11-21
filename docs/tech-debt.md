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

### Credential rate limit is per instance and counts every attempt

`CredentialsThrottlerGuard` limits `POST /auth/register`, `/auth/login` and `/auth/moodle/link` to 10 attempts a minute per Moodle login, shared across the three routes. It keys on the login, not the IP, because browsers call the Cloud Run URL directly and the client IP cannot be trusted there.

- **Per instance:** the throttler uses in-memory storage, so the real limit is 10 × the number of Cloud Run instances.
- **Lockout trade-off:** successful attempts count too. Anyone who knows a student's login can send 10 junk attempts a minute and keep that student out until they stop.
- **No IP limit:** credential stuffing (one guess against many logins) is not limited by the backend.
- **Why deferred:** fixing these needs shared storage and a trusted client IP, which the current Cloud Run setup does not give.
- **Fix:** move throttler storage to Redis, count only failed attempts, and put the backend behind Cloudflare (or a Google load balancer) with an IP rate-limit rule on `/auth/*`.

## Frontend (uni-hub)

### Opportunity types are duplicated outside `@universe/core`

`packages/uni-hub/types.ts` declares `OpportunityStatus`, `OpportunityLifecycle`, `OpportunityPaymentType`, `OpportunityAppStatus`, `Opportunity` and `OpportunityApplication` by hand. The backend uses the Prisma enums. Shared contracts belong in `@universe/core/types` (see [architecture](ai/architecture.md#packages-and-dependency-rules)).

- **Fix:** move the contracts to `@universe/core/types`, make the backend DTOs and the frontend import the same types.

### Status values are string literals in the views

Components and hooks compare against `'PAID'`, `'READY_FOR_REVIEW'`, `'ACCEPTED'`, `'WITHDRAWN'`, `'APPROVE'` and similar literals (`CatalogTab`, `MyApplicationsTab`, `ModerationQueueTab`, `ApplicationStatusBadge`, `useModeration`). Sub-tabs and nav keys already use const objects (`OPPORTUNITY_SUB_TAB`, `NAV_KEY`).

- **Fix:** add const objects next to the shared types above (`OPPORTUNITY_STATUS`, `APPLICATION_STATUS`, `MODERATION_ACTION`) and replace the literals.

### Other places that read the access token

`useCurrentUser` (`packages/uni-hub/hooks/useCurrentUser.ts`) is the single place to read the user from the token, but `AssignmentDetail` still reads `localStorage.accessToken` directly.

- **Fix:** use `useCurrentUser` or a small token helper there.

### Token is read in a `useState` initializer

`useCurrentUser` reads `safeStorage` during the first render. There is no hydration mismatch today because the opportunities tab mounts only after client-side navigation, but it breaks if the tab ever renders on the server. A reviewer asked for `useSyncExternalStore` or an effect (PR #182).

- **Fix:** read the token with `useSyncExternalStore` on `safeStorage`, or move the user into a provider.
