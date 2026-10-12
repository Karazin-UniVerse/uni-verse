---
name: prisma-patterns
description: Use when writing or reviewing Prisma schema changes, queries, transactions or bulk writes in the UniVerse backend, or when debugging a Prisma error such as P2002 or P2025. Covers the non-obvious Prisma traps (updateMany, @updatedAt, transaction timeouts, soft delete) and the project conventions for PrismaService and error handling. Triggers on "prisma query", "add a model", "transaction", "unique constraint error", "запит prisma", "додай модель", "запрос prisma", "добавь модель".
---

# Prisma patterns for `packages/backend`

Prisma 7 on PostgreSQL. The schema is `packages/backend/prisma/schema.prisma`; the generated client is written to `packages/database/client` and imported as `@universe/database` (models, enums, the `Prisma` namespace).

Adapted from the `prisma-patterns` skill of [everything-claude-code](https://github.com/affaan-m/everything-claude-code) (MIT, Copyright (c) 2026 Affaan Mustafa). Migration and deployment policy is deliberately out of scope: the team has not decided it, so do not infer one from this skill.

## Project conventions

- Inject `PrismaService` (a `PrismaClient` with the `pg` adapter, provided by the global `PrismaModule`) into services, as [architecture](../../../docs/ai/architecture.md#backend-nestjs) requires. Never call `new PrismaClient()`: every instance opens its own connection pool.
- Import types and enums from `@universe/database`, not from `@prisma/client`.
- After editing `schema.prisma`, regenerate the client with `pnpm --filter @universe/backend db:generate`. The schema reaches the database through `prisma db push` (`start:prod` runs it); changes that would lose data, such as a drop, a rename or a new `NOT NULL` column without a default, are refused unless `db:push:force` (`--accept-data-loss`) is used, so call them out in the PR description.
- Read an error code with `getPrismaErrorCode` from `utils/prisma-error.ts`; today only `user/user.service.ts` does. Three other places check for `P2002` by hand: `auth.service.ts`, `opportunities.service.ts` and `isPrismaUniqueConstraintError` in `auth/utils/auth.utils.ts`. When you add or touch such a check, use the shared helper. If you find the copies, consolidate them in the same PR or list a follow-up in the PR description ([DRY](../../../docs/ai/code-style.md#reuse-before-writing-dry)).

## Errors

Catch at the service boundary and translate to a Nest exception. Never forward a raw Prisma message to the client.

| Code    | Meaning                | Typical translation                                   |
| ------- | ---------------------- | ----------------------------------------------------- |
| `P2002` | Unique constraint      | `ConflictException` (or `BadRequestException`)        |
| `P2025` | Record not found       | `NotFoundException`                                   |
| `P2003` | Foreign key violation  | `BadRequestException`                                 |

Rely on the database constraint instead of check-then-insert: `@@unique([applicantId, opportunityId])` plus a `P2002` catch is race-free, a `findFirst` before `create` is not. A pre-check may stay when it gives a friendlier message, but the `P2002` catch is the real guard.

## Schema

- PostgreSQL does not index foreign key columns automatically. Ensure foreign keys have suitable index coverage: add `@@index` only when no existing index (such as `@unique` or a composite constraint whose leading column matches the foreign key) covers it. Also add `@@index` for columns used in frequent `where` or `orderBy` clauses. The current schema declares unique constraints only, so check new models explicitly.
- Add `deletedAt DateTime?` only when a model really needs soft delete; see the soft-delete trap below.

## Queries

- `select` returns only the listed fields; `include` returns every scalar plus the relations. Prefer `select` on hot paths and wide tables, and nest `select` inside `include` (`include: { applicant: { select: { name: true, email: true } } }`) so a relation does not drag its whole row along.
- Never load relations inside a loop (N+1). Use one `findMany` with `include` or `select`, or one `findMany` with `where: { id: { in: ids } }`.
- Cursor pagination for feeds and large lists: take `limit + 1` rows, drop the extra one to learn whether a next page exists, and add a unique field (`id`) as the last `orderBy` key so rows with equal timestamps do not shuffle between pages. Use offset pagination only where users jump to arbitrary pages.
- Prefer the `*OrThrow` methods over manual null checks; a missing row then surfaces as `P2025`, which you translate once.

## Traps

**Returning rows from bulk writes.** For bulk updates that need to return modified records, use `updateManyAndReturn()` (supported on PostgreSQL in Prisma 7); it executes a single `UPDATE ... RETURNING` query, preserving the original filter and avoiding race conditions. Plain `updateMany` and `deleteMany` return only `{ count }`. If you need rows affected by `deleteMany`, wrap the pre-read and `deleteMany` in an interactive transaction with `RepeatableRead` or `Serializable` isolation (or use row-level locking) so concurrent writes cannot alter the set between reading and deleting. `notifications.service.ts` uses `updateMany`, so keep this in mind when changing it.

**`@updatedAt` is applied by Prisma Client, not by the database.** The column has no database default or trigger, so `$executeRaw` / `$queryRaw` updates leave it unchanged; set `"updatedAt" = now()` in the SQL yourself. Prisma sets it for its own write methods when you do not supply a value, and an empty `data` object leaves it unchanged.

**`deleteMany()` without `where` deletes every row.** Always pass a `where`.

**Interactive transactions time out after 5 seconds.** Keep email, HTTP and Moodle calls outside `$transaction`; a slow external call closes the transaction and the next query fails with "Transaction already closed". Use the array form `$transaction([...])` when the operations do not depend on each other, and the callback form only when a later step needs an earlier result. Inside the callback use the `tx` client, never the outer `prisma`, or the work escapes the transaction. Raise `timeout` only for bulk work that truly needs it.

**Soft delete does not hide rows.** A soft-deleted row still exists, so `findUniqueOrThrow({ where: { id } })` returns it. Prisma 5 and later accept extra filters next to a unique field, so `findUniqueOrThrow({ where: { id, deletedAt: null } })` works and throws `P2025` for a deleted row. Filter `deletedAt: null` explicitly in every query and list instead of hiding it behind a client extension, so the behaviour stays visible at the call site.

## Testing

Unit tests mock `PrismaService` and assert the translated exception, for example a rejected `{ code: 'P2002' }` becoming `ConflictException` (see `opportunities.service.spec.ts`). Mock only the methods the service calls, so a renamed query fails the test instead of silently passing.
