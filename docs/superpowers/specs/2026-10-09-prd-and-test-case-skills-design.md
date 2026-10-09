# PRD and Test-Case Skills — Design

Date: 2026-10-09
Status: draft, awaiting review

## Goal

Give people and AI agents one shared, traceable way to work with three artifacts: a Product Requirements Document (PRD), test cases, and code. Work goes in every direction:

- docs first: PRD and test cases exist, code does not yet, and agents implement from them;
- PRD to test cases;
- code to PRD and code to test cases, for features that were built without documents.

Test cases serve three readers: human testers, the repository, and AI agents that implement or verify a feature.

## Context

- The repository has no PRDs and no test-case documents. `docs/superpowers/specs/` holds design specs from brainstorming; `tests/e2e` numbers tests `F2-1`, `F2-2` but the requirements behind those IDs are written nowhere.
- A "project" is a service or module of the UniVerse ecosystem (UniHub, UniAuth, UniSchedule, Opportunities, Talent Profile, Moodle integration, e-Dean, Una, and so on), not a repository package. One project such as Opportunities spans `core`, `backend` and `uni-hub`.
- Raw input in Notion is informal: a concept page, an architecture draft with a decision table, a ten-line list of improvements in Russian, a one-paragraph idea. There is no PRD or test-case template.
- Tasks live in the Notion Project Dashboard. Notion tags use `Draft` and `Approved`. Testers file reports in Notion and read test cases from the repository.
- The team connects Notion MCP to its agents, but Gemini may not have it.

## Decisions

1. Three skills plus one rule file (approach C): `prd`, `test-cases`, `docs-code-sync`, and `docs/ai/requirements-docs.md`. No skill for the docs-to-code direction: the rule file tells agents to read the documents before implementing, and `test-driven-development`, `writing-plans` and `playwright-cli` already cover the rest.
2. No fixed source of truth. When a document and the code disagree, the agent never picks a side. It records the mismatch in a register and asks the user. The team resolves each row in either direction.
3. Documents are written in English ([workflow](../../ai/workflow.md#documentation)). Expected results quote UI text by translation key, not by literal string.
4. Keep documents small. Only content that a reader acts on is required; sections without content are omitted.
5. The PRD header carries one link to the project page in Notion. Tasks stay in Notion and are not mirrored in the document, because tasks are created dynamically and a copy would drift.

## Layout

```
docs/prd/<project>/<feature>.md
docs/test-cases/<project>/<feature>.md
docs/discrepancies/<project>/<feature>.md     # temporary, committed while under discussion
docs/ai/requirements-docs.md                  # conventions and the implementation rule
.agents/skills/{prd,test-cases,docs-code-sync}/SKILL.md
```

`<project>` is a kebab-case slug of the Notion service name (`uni-hub`, `opportunities`). A skill lists existing folders under `docs/prd/` and proposes a slug; for a new project it asks the user.

## Identifiers

- Feature code: short upper-case code, unique across the repository (`OPP`). A skill checks existing documents before choosing one.
- Requirement: `REQ-<FEATURE>-NN` (`REQ-OPP-03`).
- Acceptance criterion: `<requirement>.N` (`REQ-OPP-03.2`).
- Test case: `TC-<FEATURE>-NN` (`TC-OPP-07`).
- IDs are stable: never renumbered, never reused. Tests and code reference them.

## PRD format

Header: `feature`, `project`, `status` (`draft` or `approved`, same words as the Notion tags), `origin` (`idea` or `code`; `code` means reconstructed from code and not yet confirmed by the team), `notion` (link to the project page).

Body, in this order:

| Section        | Content                                                                                                                         |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Goal           | One to three sentences: the problem and the outcome. Metrics only if they exist.                                                |
| Scope          | In scope and out of scope.                                                                                                      |
| Requirements   | Each `REQ-…` has a role-based statement, a priority (must, should, could) and numbered acceptance criteria that can be checked. |
| Non-functional | Only when relevant: i18n (uk and en), accessibility, performance, security.                                                     |
| Intersections  | Neighbouring features, shared types and APIs, other documents.                                                                  |
| Open questions | Ambiguities, risks, suspected defects.                                                                                          |

For `origin: code`, priorities are proposals and anything that looks like a defect goes to Open questions.

## Test-case format

One file per feature. Each case has: `id`, `title`, `covers` (acceptance criteria IDs), `type` (functional, edge, error, state), `priority`, `preconditions` (omitted when none), `steps`, `expected`, `verification` (`manual`, `unit` or `playwright`), `automated-at` (path of the test, or a dash).

- Every acceptance criterion has at least one case.
- A section "Intersections" lists cases that exercise neighbouring features.
- Cases the skill proposes on its own initiative (extra edge, error and state cases) are marked `proposed` until the team confirms them.
- `verification` guidance: logic and contracts use `unit` (a Jest, Vitest or node:test test in the package's own runner, including `tests/e2e`); browser user flows use `playwright`; visual or subjective checks stay `manual`.
- `automated-at` is filled only when a test containing the `TC-` ID exists.
- No coverage matrix in the file: `docs-code-sync` computes it.

## Discrepancy register

`docs/discrepancies/<project>/<feature>.md`. A table, one row per mismatch: ID, what the document says, what the code or test does, evidence (`file:line`), proposed resolution. The resolution is one of:

- update the document;
- create an implementation task (the skill drafts the task text for the Notion Project Dashboard and does not create it unless the user asks; the team lead assigns tasks);
- leave as is.

The file is temporary. It is deleted when every row is closed and the user confirms.

## Skills

All three share the contract below: context gathering (steps 1–6) and an independent review (step 7).

### Shared contract

1. Identify the project and feature. If missing, ask.
2. Read what the user provided: files, pasted text, links.
3. When Notion can be read by the agent, read the given page and then search the workspace broadly (project page, wiki, related pages, tasks on the dashboard), because relevant information may live elsewhere. List what was found with links and ask the user which of it applies. When Notion cannot be read, ask the user to paste the content.
4. Search the repository: `docs/prd`, `docs/test-cases`, `docs/superpowers`, code, and PR history for neighbouring features and shared modules.
5. When context is thin, ask for the missing pieces (name, documents or links, code paths) and do not invent requirements.
6. Review critically: point out ambiguous or contradictory requirements and security or privacy risks, and propose edge cases.
7. Independent review before the human sees the result. When the agent can start a subagent, a reviewer with no access to the author's reasoning checks the written file against the sources and the code and reports findings; the author fixes them and then presents the result. One review round; anything left unresolved is listed for the user. When the agent cannot start a subagent, it re-reads the file once against the same checklist and says so. What the reviewer checks:
   - `prd`: criteria are specific and checkable, no contradictions, scope is clear, intersections match the code, security and privacy risks and edge cases are raised, IDs are valid.
   - `test-cases`: every criterion is covered, steps can be executed without guessing, expected results are measurable, `verification` fits the case, `automated-at` points to a real test.
   - `docs-code-sync`: every register row has evidence that exists at the cited `file:line`, and no mismatch was missed in the compared area.

### `prd`

- From an idea or links: draft the PRD, ask only about gaps in goal, scope and criteria, save with `status: draft`.
- From code: read the given paths and describe observed behaviour as requirements with `origin: code`.
- Existing PRD: extend it and keep IDs.
- A short informal list (for example ten one-line improvements) becomes candidate requirements; the skill asks about missing criteria instead of guessing.

### `test-cases`

- Input: a PRD (preferred) or code. With only code, it proposes running `prd` first.
- Produces the cases described above, including intersections and proposed edge cases.

### `docs-code-sync`

- Compares PRD criteria and test cases with code and tests: criterion without a case; case with a non-manual `verification` and no test; test that cites a missing case; behaviour in code that no document describes; document and code that contradict each other.
- Writes the register, asks the user about each row, and applies the answers. It edits documents itself, and drafts task text for implementation changes.

## Rule file: `docs/ai/requirements-docs.md`

Read on demand; one row is added to the routing table in `AGENTS.md`. It holds the layout, ID scheme, PRD and test-case fields, the register format, and the implementation rule:

- When a PRD and test cases exist for a feature, read them before implementing, write tests from the cases, and put the `TC-` ID in the test title.
- When implementation must deviate from the documents, do not deviate silently: record the mismatch in the register and ask.

Skills link to this file instead of repeating its content, so each convention lives in one place.

## Gemini compatibility

- Skills use only `name` and `description` in the frontmatter, and the description lists trigger phrases in English, Ukrainian and Russian.
- No tool names from one agent (write "ask the user", "read the page with an available tool"). Subagents are used for review when available and are never required: the skill falls back to a single self-review pass.
- The rule file is read on demand and is not imported by `CLAUDE.md`, so it does not enter `GEMINI.md` (21,713 of 24,000 bytes). Gemini reads `AGENTS.md` directly (`.gemini/settings.json`), and that file carries the routing row. `pnpm gemini:check` confirms the budget.
- An independent reviewer checks skill wording for Claude-specific assumptions. Gemini CLI itself is not run, so this check is static.

## Verification

- `pnpm skills:sync`, `pnpm skills:check`, `pnpm gemini:check`, and prettier on every changed file.
- Pilot on Opportunities (code exists: PRs #180–#182). Run `prd` from code, `test-cases` from the PRD, then `docs-code-sync`, and fix the skills where they misbehave. Whether the pilot documents stay in the repository is decided after the pilot.
- A second, shorter check in the docs-first direction on a UniHub item (for example the clickable cards on the student overview), to confirm `prd` handles short informal input.

## Out of scope

- Creating tasks in Notion automatically.
- Mirroring tasks or statuses inside documents.
- CI checks for the documents.
- Test-report workflow in Notion for QA.

## References

Structure ideas, not text, were taken from `stellarlinkco/myclaude` (`product-requirements`, `test-cases`) and `rgtlai/ai-assistant-commands-development` (requirement IDs and traceability). Their licenses are unclear (the myclaude repository is AGPL-3.0 while one skill declares MIT; rgtlai declares none), so nothing is copied.
