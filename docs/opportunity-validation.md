# Opportunity resubmission and phone ownership

## Resubmitting after moderation feedback (BOP-62)

When a moderator requests changes, the backend stores a SHA-256 fingerprint of
the opportunity's title, description, organizer contact, payment type and payment
details. The owner must change at least one of these fields before resubmitting.
Outer whitespace is ignored; payment details do not count for unpaid opportunities.
Changing only lifecycle or application acceptance does not satisfy the requirement.
Reverting an edit to the original content blocks resubmission again.

The detail response exposes `canResubmit` for opportunities requiring changes.
The frontend disables submission and shows an explanation until it is true.
The backend enforces the same rule independently of the UI. It also rejects a
resubmission if the record changes between the eligibility read and the write;
reload the detail page before retrying.

Existing `REQUIRES_CHANGES` records have no historical fingerprint. They require
an edit after deployment: the first update captures their current content as the
baseline, even if that update changes no content. No timestamps are used as proof
that a user made a meaningful revision.

## One phone per account (BOP-41)

The first successful phone-based application registers a normalized phone in
`UserPhone`. Its primary key permits one phone per account; a separate unique
constraint permits one account per phone. An account can reuse its registered
phone on multiple opportunities and when reapplying after withdrawal. It cannot
register a different phone through another application. Telegram applications
remain available and do not create or change phone ownership.

National Ukrainian `0671234567`, `380671234567`, `+380671234567` and formatted
`+380 (67) 123-45-67` all register as `+380671234567`. International numbers retain
their country code. The existing contact-format validator remains unchanged.

Phone registration and the application write share one database transaction.
Failed application writes must not retain a new phone registration. Notifications
are sent after that transaction, using the existing application-notification flow.
Database uniqueness constraints are the concurrency guard, not a preflight lookup.

This is an ownership restriction, **not phone verification**. There is no SMS
proof or self-service phone-change endpoint. A legitimate change or correction
needs coordinator-assisted review of the `UserPhone` record; do not simply claim
another number through a new account. Phone ownership is not included in existing
user responses. A rejected claim does not identify the other account.

## Deployment and existing data

The schema adds the nullable `Opportunity.moderationContentHash` column and the
`UserPhone` table. Generate the client with `pnpm --filter @universe/backend db:generate`.
The existing backend deployment runs `pnpm db:push` before starting; no destructive
schema change or forced data-loss flag is required. Deploy schema changes before
serving the new backend code.

Existing application contacts are preserved and are **not automatically backfilled**
into phone ownership. They may contain conflicting numbers for several accounts
or several numbers for one account. Audit and resolve those records before a
separate historical backfill. Until then, ownership starts with the first
successful phone-based application after deployment, not with historical usage.

Tests cover the service policy with isolated Prisma doubles, canonicalization,
UI gating and localized errors. Real PostgreSQL smoke tests also passed using
the generated Prisma schema and actual service methods in an isolated temporary
schema containing synthetic data only. They covered equivalent phone formats,
concurrent claims by different accounts, concurrent different numbers for one
account, rollback after an application-write failure, withdrawal/reapplication,
Telegram contacts, moderation baselines and both stale-edit/resubmission orderings.
The temporary schema was dropped after testing and its absence was verified.
The shared application schema and its data were not changed by these tests.

These checks do not perform a historical backfill, verify phone possession, or
certify production browser authentication/cookie behavior. Unit transaction
doubles alone are not proof of database isolation behavior; repeat the database
smoke tests if the phone-claim or transaction implementation changes.
