# Requirements Documents

A PRD, its test cases and the code it describes are kept in step. The skills `prd`, `test-cases` and `docs-code-sync` create and compare them; this file is the single place for their conventions.

## Layout

```
docs/prd/<project>/<feature>.md
docs/test-cases/<project>/<feature>.md
docs/discrepancies/<project>/<feature>.md   # temporary
docs/tasks/<project>/<feature>.md           # task drafts, kept until the tasks are done
```

`<project>` is the kebab-case name of a UniVerse service or module (`uni-hub`, `opportunities`), not a repository package: one project can span `core`, `backend` and `uni-hub`. Reuse an existing folder; ask before creating a new project folder. `<feature>` is the kebab-case feature name (`board`, `opportunity-alerts`). Documents are written in English. Expected results quote UI text by translation key, not by a literal string.

## Identifiers

- Feature code: a short upper-case code, unique across the repository (`OPP`). Search `docs/` before choosing one, and propose it to the user together with the file name.
- Requirement `REQ-OPP-03`, acceptance criterion `REQ-OPP-03.2`, test case `TC-OPP-07`.
- IDs are stable: never renumber or reuse them. Tests and code refer to them.

## PRD

Front matter: `feature`, `project`, `status` (`draft` or `approved`; only the team sets `approved`; extending an `approved` PRD sets it back to `draft`), `origin` (`idea` or `code`; `code` means reconstructed from code and not yet confirmed by the team), `notion` (link to the project page, taken from the user; ask when missing; tasks stay in Notion and are not copied here).

Sections, in this order. Omit a section that has nothing to say.

1. **Goal**: one to three sentences, the problem and the outcome.
2. **Scope**: what is in and what is out.
3. **Requirements**: each `REQ-…` has a role-based statement, a priority (`must`, `should`, `could`) and numbered acceptance criteria that can be checked. Separate requirements with a horizontal rule (`---`).
4. **Non-functional**: i18n (uk and en), accessibility, performance, security; only when relevant.
5. **Intersections**: neighbouring features, shared types and APIs, related documents.
6. **Open questions**: ambiguities, risks, suspected defects.

With `origin: code`, priorities are proposals and anything that looks like a defect goes to Open questions.

```markdown
---
feature: Opportunities board
project: opportunities
status: draft
origin: code
notion: https://www.notion.so/...
---

# Opportunities board

## Goal

Students find and apply to internal opportunities in one place.

## Scope

In: browsing, filtering, applying. Out: moderation.

## Requirements

### REQ-OPP-01 (must) Browse the catalog

As a student, I see published opportunities.

- REQ-OPP-01.1 Only opportunities in the published state are listed.
- REQ-OPP-01.2 An empty result shows the empty-state message, not a blank page.

## Open questions

- What happens to an application when its opportunity is archived?
```

## Test cases

One file per feature. It starts with `# Test cases: <feature name>` and a line `PRD: <path to the PRD, or none>`. Each case:

```markdown
### TC-OPP-01 Published opportunities are listed

- covers: REQ-OPP-01.1
- type: functional
- priority: high
- preconditions: one published and one draft opportunity exist
- steps:
  1. Request the opportunity list as a student.
- expected: only the published opportunity is returned.
- verification: unit
- automated-at: packages/backend/opportunities/opportunities.service.spec.ts
```

- `type`: `functional`, `edge`, `error` or `state`. `priority`: `high`, `medium` or `low`.
- `covers` lists acceptance-criterion IDs, or `none (no PRD)` for a case written without a PRD. Every criterion has at least one case.
- `verification`: `unit` for logic and contracts (a Jest, Vitest or node:test test in the package's own runner, including `tests/e2e`), `playwright` for browser user flows, `manual` for visual or subjective checks.
- `automated-at` is a test path, filled only when a test containing the `TC-` ID exists; otherwise a dash. Omit `preconditions` when there are none.
- A case added by the skill on its own initiative carries `- proposed: yes` until the team confirms it.
- A final section `Intersections` lists cases that exercise neighbouring features; omit it when there are none.
- Separate cases with a horizontal rule (`---`), including before the `Intersections` section.
- There is no coverage matrix in the file; `docs-code-sync` computes it.

## Discrepancy register

`docs/discrepancies/<project>/<feature>.md`, temporary, committed while the team discusses it and deleted when every row is closed and the user confirms.

```markdown
# Discrepancies: Opportunities board

| ID   | Document says                     | Code or test does            | Evidence                                                     | Proposed resolution | Decision |
| ---- | --------------------------------- | ---------------------------- | ------------------------------------------------------------ | ------------------- | -------- |
| D-01 | REQ-OPP-01.1 lists only published | the list also shows archived | `packages/backend/opportunities/opportunities.service.ts:88` | implementation-task |          |
```

`Proposed resolution` and `Decision` are one of `update-doc`, `implementation-task`, `leave`; for `leave`, write the reason after it in `Decision` (`leave: archived items are intended`). Task text drafted for `implementation-task` rows goes in `docs/tasks/<project>/<feature>.md`, not in the register, because the register is deleted. Each task has a heading (`Task N: <title>`), then `Closes` (the rows), `What`, `Where` and `Satisfies` (criterion and case IDs) lines, and an optional `After` line for a dependency. Rows that belong together are one task. It is written for the Notion Project Dashboard and is not created there unless the user asks.

## Shared procedure

The three skills follow these steps.

1. Identify the project and feature. If missing, ask.
2. Read what the user provided: files, pasted text, links.
3. When the agent can read Notion, read the given page (if one was given), then search the workspace broadly (project page, wiki, related pages, tasks on the dashboard), because relevant information may live elsewhere. List what was found with links and ask which of it applies. If Notion cannot be read, or a read fails, say so and ask the user to paste the content.
4. Search the repository: `docs/prd`, `docs/test-cases`, `docs/superpowers`, code, and PR history for neighbouring features and shared modules.
5. When context is thin, ask for the missing pieces (name, documents or links, code paths). Do not invent requirements.
6. Review critically: point out ambiguous or contradictory requirements and security or privacy risks, and propose edge cases.
7. Independent review before the human sees the result. When the agent can start a subagent, start one with no access to your reasoning; give it the written file, the sources, the code paths and the skill's review checklist, and ask for findings only. Fix them, then present the result. One round; list anything unresolved for the user. When the agent cannot start a subagent, re-read the file once against the same checklist and say that you did.

## Working with the documents

- When a PRD and test cases exist for a feature, read them before implementing, write tests from the cases, and put the `TC-` ID in the test title.
- When implementation must deviate from the documents, do not deviate silently: record the mismatch in the discrepancy register and ask the user.
- When a document and the code disagree, no side wins automatically. The register records it and the team decides whether to change the document or the code.
