# Opportunity tags

Tags come from a fixed list. Users pick them; they cannot create or rename tags.
The list lives in `@universe/core/constants/tags` (`OPPORTUNITY_TAG_GROUPS`) and is
mirrored by the Prisma enum `OpportunityTag`. Adding a tag means changing both,
plus the `opportunities.tags.value.*` translation keys in `uk.ts` and `en.ts`.

| Category (`OpportunityTagCategory`) | Tags                                                                                                 |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `FORMAT`                            | `RESEARCH`, `STUDY_PROJECT`, `INTERNSHIP`, `STARTUP`, `CHALLENGE`, `VOLUNTEERING`, `MENTORING`       |
| `FIELD`                             | `IT`, `ENGINEERING`, `NATURAL_SCIENCES`, `BUSINESS`, `HUMANITIES`, `LAW`, `MEDIA_DESIGN`, `MEDICINE` |
| `EXPERIENCE`                        | `NO_EXPERIENCE`, `BASIC_KNOWLEDGE`, `ADVANCED`                                                       |
| `LOCATION`                          | `REMOTE`, `KHARKIV`, `UKRAINE`, `ABROAD`                                                             |

An opportunity can have any number of tags, including none. The API stores and
returns enum keys; the frontend shows localized labels.

## Moderation

Tags are not part of the moderated content. Changing the tags of a published
opportunity keeps it `PUBLISHED`.

## Catalog filter

`GET /opportunities` accepts one tag key per repeated `tags` query parameter and
returns opportunities that have at least one of them:

```text
/opportunities?tags=IT&tags=REMOTE
```

Unknown keys return HTTP 400. Create and update requests accept a JSON `tags`
array of the same keys.

## Deployment

Take a database backup and stop old backend revisions before deploying this
schema change. Old revisions cannot use the new storage; rollback requires
restoring the backup, not just switching the application revision.

`db:push` and `db:push:force` run `db:drop-free-form-tags` before schema push.
This transactional, repeatable script permanently deletes the legacy `Tag` and
`_OpportunityToTag` tables and the `Opportunity.proposedTags` column. Product
approved discarding these tags; they are not mapped to the predefined list.
Existing opportunities start with an empty tag array. Do not enable
`PRISMA_ACCEPT_DATA_LOSS`: unrelated destructive schema changes must still fail.

Verify the cleanup against a disposable PostgreSQL database with
`TEST_DATABASE_URL` set, from `packages/backend`:

```sh
node --test prisma/scripts/drop-free-form-tags.test.mjs
```
