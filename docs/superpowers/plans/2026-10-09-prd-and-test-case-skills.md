# PRD and Test-Case Skills Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three agent skills (`prd`, `test-cases`, `docs-code-sync`) and one rule file (`docs/ai/requirements-docs.md`) so people and AI agents create and compare PRDs, test cases and code in every direction.

**Architecture:** Conventions (layout, IDs, formats, shared procedure, implementation rule) live once in `docs/ai/requirements-docs.md`, read on demand through a routing row in `AGENTS.md`. Each skill is a short `SKILL.md` in `.agents/skills/` that points to that file and adds only its own modes and review checklist. `.claude/skills` is a generated mirror. The skills are validated by dry runs, a static Gemini-neutrality review and a pilot on Opportunities.

**Tech Stack:** Markdown, prettier, the repository scripts `pnpm skills:sync`, `pnpm skills:check`, `pnpm gemini:check`.

**Spec:** `docs/superpowers/specs/2026-10-09-prd-and-test-case-skills-design.md`

## Global Constraints

- Documents and skills are written in English; skill `description` lists trigger phrases in English, Ukrainian and Russian.
- Skill frontmatter has only `name` and `description`.
- No tool names from one agent in skill text ("ask the user", "read the page with an available tool"); subagents are used for review when available and never required.
- Each convention lives in one place: `docs/ai/requirements-docs.md`. Skills link to it and do not repeat it.
- Skills are edited only in `.agents/skills/`; never edit `.claude/skills/` or `GEMINI.md` by hand.
- `docs/ai/requirements-docs.md` is not added to the `@docs/ai/*.md` imports in `CLAUDE.md`; `GEMINI.md` must stay at or below 24,000 bytes (it is 21,713 now).
- IDs are stable: `REQ-<FEATURE>-NN`, `REQ-<FEATURE>-NN.N`, `TC-<FEATURE>-NN`; never renumbered or reused.
- Nothing is copied from `stellarlinkco/myclaude` or `rgtlai/ai-assistant-commands-development` (licenses unclear); only structure ideas are used.
- Prettier must pass on every changed file.
- Commit only after the user has seen the diff and approved. Commits use Conventional Commits and end with the attribution trailer the session instructions require. The pre-commit hook rejects commits while `docs/ai` or `.agents/skills` have unstaged or untracked changes, so `git add` them first.
- Work happens on the current branch; the PR targets `develop`.

## Review Focus

Inputs and conditions the spec implies and no task's happy path exercises. Each has a scenario check in the task that owns it.

1. Thin context: the user says only "write a PRD for X" with no sources. Expected: the skill asks for name, documents and code paths and writes nothing invented. (Task 2, Step 3)
2. Notion unreachable or permission error during the broad search. Expected: the skill says what failed and asks the user to paste the content; it does not fabricate or stop silently. (Task 2, Step 3)
3. Extending an existing PRD. Expected: existing IDs are untouched, new IDs continue after the last one, and a feature code that already exists in another project is not reused. (Task 2, Step 3)
4. `prd` run in code mode on a feature that already has a PRD the code contradicts. Expected: the PRD is not rewritten; the mismatch goes to `docs-code-sync`. (Task 2, Step 3)
5. An informal requirement with a security smell (for example separate "account not found" and "wrong password" messages). Expected: raised in Open questions with a safer alternative, not copied as a requirement. (Task 2, Step 3)

## File Structure

| File                                                                            | Responsibility                                                                         |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `docs/ai/requirements-docs.md` (create)                                         | Layout, IDs, PRD / test-case / register formats, shared procedure, implementation rule |
| `AGENTS.md` (modify)                                                            | One routing row to the rule file                                                       |
| `.agents/skills/prd/SKILL.md` (create)                                          | Modes and review checklist for PRDs                                                    |
| `.agents/skills/test-cases/SKILL.md` (create)                                   | Modes and review checklist for test cases                                              |
| `.agents/skills/docs-code-sync/SKILL.md` (create)                               | Comparison, register, decision loop                                                    |
| `.claude/skills/{prd,test-cases,docs-code-sync}/SKILL.md` (generated)           | Mirror made by `pnpm skills:sync`                                                      |
| `docs/superpowers/specs/2026-10-09-prd-and-test-case-skills-design.md` (modify) | One factual correction about `GEMINI.md`                                               |

---

### Task 1: Rule file and routing row

**Files:**

- Create: `docs/ai/requirements-docs.md`
- Modify: `AGENTS.md` (routing table under "Read on demand")
- Modify: `docs/superpowers/specs/2026-10-09-prd-and-test-case-skills-design.md` (the Gemini compatibility bullet about `GEMINI.md`)

**Interfaces:**

- Produces: the section names `Layout`, `Identifiers`, `PRD`, `Test cases`, `Discrepancy register`, `Shared procedure`, `Working with the documents` in `docs/ai/requirements-docs.md`. Tasks 2-4 refer to these by name.

- [ ] **Step 1: Create `docs/ai/requirements-docs.md`**

````markdown
# Requirements Documents

A PRD, its test cases and the code it describes are kept in step. The skills `prd`, `test-cases` and `docs-code-sync` create and compare them; this file is the single place for their conventions.

## Layout

```
docs/prd/<project>/<feature>.md
docs/test-cases/<project>/<feature>.md
docs/discrepancies/<project>/<feature>.md   # temporary
```

`<project>` is the kebab-case name of a UniVerse service or module (`uni-hub`, `opportunities`), not a repository package: one project can span `core`, `backend` and `uni-hub`. Reuse an existing folder; ask before creating a new project folder. Documents are written in English. Expected results quote UI text by translation key, not by a literal string.

## Identifiers

- Feature code: a short upper-case code, unique across the repository (`OPP`). Search `docs/` before choosing one.
- Requirement `REQ-OPP-03`, acceptance criterion `REQ-OPP-03.2`, test case `TC-OPP-07`.
- IDs are stable: never renumber or reuse them. Tests and code refer to them.

## PRD

Front matter: `feature`, `project`, `status` (`draft` or `approved`; only the team sets `approved`), `origin` (`idea` or `code`; `code` means reconstructed from code and not yet confirmed by the team), `notion` (link to the project page; tasks stay in Notion and are not copied here).

Sections, in this order. Omit a section that has nothing to say.

1. **Goal**: one to three sentences, the problem and the outcome.
2. **Scope**: what is in and what is out.
3. **Requirements**: each `REQ-…` has a role-based statement, a priority (`must`, `should`, `could`) and numbered acceptance criteria that can be checked.
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

One file per feature. Each case:

```markdown
### TC-OPP-01 Published opportunities are listed

- covers: REQ-OPP-01.1
- type: functional
- priority: high
- preconditions: one published and one draft opportunity exist
- steps:
  1. Open the opportunities tab as a student.
- expected: only the published opportunity is listed.
- verification: playwright
- automated-at: tests/e2e/opportunities.spec.ts
```

- `type`: `functional`, `edge`, `error` or `state`. `priority`: `high`, `medium` or `low`.
- `covers` lists acceptance-criterion IDs. Every criterion has at least one case.
- `verification`: `vitest` for logic and contracts, `playwright` for browser user flows, `manual` for visual or subjective checks.
- `automated-at` is a test path, filled only when a test containing the `TC-` ID exists; otherwise a dash. Omit `preconditions` when there are none.
- A case added by the skill on its own initiative carries `- proposed: yes` until the team confirms it.
- A final section `Intersections` lists cases that exercise neighbouring features.
- There is no coverage matrix in the file; `docs-code-sync` computes it.

## Discrepancy register

`docs/discrepancies/<project>/<feature>.md`, temporary, committed while the team discusses it and deleted when every row is closed.

```markdown
# Discrepancies: Opportunities board

| ID   | Document says                     | Code or test does            | Evidence                                                     | Proposed resolution | Decision |
| ---- | --------------------------------- | ---------------------------- | ------------------------------------------------------------ | ------------------- | -------- |
| D-01 | REQ-OPP-01.1 lists only published | the list also shows archived | `packages/backend/opportunities/opportunities.service.ts:88` | implementation-task |          |
```

`Proposed resolution` and `Decision` are one of `update-doc`, `implementation-task`, `leave`. Task text drafted for `implementation-task` rows goes in a "Task drafts" section below the table; it is written for the Notion Project Dashboard and is not created there unless the user asks.

## Shared procedure

The three skills follow these steps.

1. Identify the project and feature. If missing, ask.
2. Read what the user provided: files, pasted text, links.
3. When the agent can read Notion, read the given page, then search the workspace broadly (project page, wiki, related pages, tasks on the dashboard), because relevant information may live elsewhere. List what was found with links and ask which of it applies. If Notion cannot be read, or a read fails, say so and ask the user to paste the content.
4. Search the repository: `docs/prd`, `docs/test-cases`, `docs/superpowers`, code, and PR history for neighbouring features and shared modules.
5. When context is thin, ask for the missing pieces (name, documents or links, code paths). Do not invent requirements.
6. Review critically: point out ambiguous or contradictory requirements and security or privacy risks, and propose edge cases.
7. Independent review before the human sees the result. When the agent can start a subagent, start one with no access to your reasoning; give it the written file, the sources, the code paths and the skill's review checklist, and ask for findings only. Fix them, then present the result. One round; list anything unresolved for the user. When the agent cannot start a subagent, re-read the file once against the same checklist and say that you did.

## Working with the documents

- When a PRD and test cases exist for a feature, read them before implementing, write tests from the cases, and put the `TC-` ID in the test title.
- When implementation must deviate from the documents, do not deviate silently: record the mismatch in the discrepancy register and ask the user.
- When a document and the code disagree, no side wins automatically. The register records it and the team decides whether to change the document or the code.
````

- [ ] **Step 2: Add the routing row to `AGENTS.md`**

In the "Read on demand" table, add this row after the `docs/ai/domain-uni-hub.md` row:

```markdown
| implementing, testing or documenting a feature that has (or needs) a PRD or test cases in `docs/prd`, `docs/test-cases`, or checking docs against code | [docs/ai/requirements-docs.md](docs/ai/requirements-docs.md) |
```

Run: `pnpm exec prettier --write AGENTS.md docs/ai/requirements-docs.md`
Expected: both files listed, no errors; the table in `AGENTS.md` is re-aligned.

- [ ] **Step 3: Correct the spec's `GEMINI.md` statement**

In `docs/superpowers/specs/2026-10-09-prd-and-test-case-skills-design.md`, replace the bullet that begins "The rule file is not part of `GEMINI.md`." with:

```markdown
- The rule file is read on demand and is not imported by `CLAUDE.md`, so it does not enter `GEMINI.md` (21,713 of 24,000 bytes). Gemini reads `AGENTS.md` directly (`.gemini/settings.json`), and that file carries the routing row. `pnpm gemini:check` confirms the budget.
```

Run: `pnpm exec prettier --write docs/superpowers/specs/2026-10-09-prd-and-test-case-skills-design.md`

- [ ] **Step 4: Verify**

Run: `pnpm gemini:check && pnpm exec prettier --check AGENTS.md docs/ai/requirements-docs.md docs/superpowers/specs/2026-10-09-prd-and-test-case-skills-design.md docs/superpowers/plans/2026-10-09-prd-and-test-case-skills.md`
Expected: `gemini:check` passes (size unchanged, `GEMINI.md` up to date) and prettier reports all files formatted.

- [ ] **Step 5: Show the diff, wait for approval, commit**

Show `git diff` and `git status` to the user and wait for approval. Then:

```bash
git add docs/ai/requirements-docs.md AGENTS.md docs/superpowers/specs/2026-10-09-prd-and-test-case-skills-design.md docs/superpowers/plans/2026-10-09-prd-and-test-case-skills.md
git commit -m "docs(ai): add requirements-docs rule, spec and plan for PRD and test-case skills"
```

Expected: the pre-commit hook passes. Add the attribution trailer to the message.

---

### Task 2: `prd` skill

**Files:**

- Create: `.agents/skills/prd/SKILL.md`
- Generated: `.claude/skills/prd/SKILL.md`

**Interfaces:**

- Consumes: sections `Layout`, `Identifiers`, `PRD`, `Shared procedure` of `docs/ai/requirements-docs.md` (Task 1).
- Produces: PRD files at `docs/prd/<project>/<feature>.md` with IDs `REQ-<FEATURE>-NN` and `REQ-<FEATURE>-NN.N`, read by `test-cases` and `docs-code-sync`.

- [ ] **Step 1: Create `.agents/skills/prd/SKILL.md`**

```markdown
---
name: prd
description: Use when writing, extending or reconstructing a Product Requirements Document (PRD) for a UniVerse feature, from an idea, Notion pages, links or existing code. Triggers on "write a PRD", "product requirements", "acceptance criteria for this feature", "напиши PRD", "опиши вимоги до фічі", "складіть PRD", "восстанови требования из кода", "опиши требования".
---

# PRD

Write, extend or reconstruct a PRD in `docs/prd/<project>/<feature>.md`.

Read `docs/ai/requirements-docs.md` first. It defines the layout, IDs, the PRD format and the shared procedure (context gathering and independent review) that this skill follows. Do not restate those rules here or in the PRD.

## Modes

Pick the mode from the request. Ask when it is unclear.

### From an idea or sources (`origin: idea`)

1. Run shared procedure steps 1-6.
2. Turn the input into candidate requirements. A short informal list (for example ten one-line improvements) becomes one candidate per line. Do not guess missing criteria; ask about them.
3. Ask only about gaps that block a checkable acceptance criterion: the goal, the scope, who the role is, what "done" looks like. Two or three questions at a time.
4. Write the file with `status: draft`.

### From code (`origin: code`)

1. Run shared procedure steps 1-6. The user names the code paths (packages, folders, routes); if none are given, ask.
2. Read the code, its tests and its translation keys. Describe observed behaviour as requirements with acceptance criteria. Priorities are proposals.
3. Put anything that looks like a defect, a gap or an undocumented decision into Open questions. Do not silently fix it or hide it.
4. Write the file with `status: draft`.

### Existing PRD

Extend it. Keep every existing ID, add new IDs after the last one, never renumber. Before choosing a feature code, search `docs/` and do not reuse a code that exists in another project. If the code contradicts the existing PRD, do not rewrite the PRD to match; hand the mismatch to `docs-code-sync`.

## Review checklist

Before presenting, run the independent review (shared procedure step 7) with this checklist:

- every acceptance criterion is specific and can be checked without interpretation;
- no two requirements contradict each other;
- the scope says what is out;
- Intersections match the code and the other documents (verified by search, not from memory);
- security and privacy risks and edge cases are raised in Requirements or Open questions; for example, messages that reveal whether an account exists are flagged with a safer alternative, not copied as a requirement;
- IDs follow the scheme and are unique;
- the front matter is complete.

## Present

Give the user the file path, the open questions, and what the review changed or left unresolved. Never set `status: approved`; the team does that.
```

- [ ] **Step 2: Sync and check**

Run: `pnpm skills:sync && pnpm skills:check && pnpm exec prettier --write .agents/skills/prd/SKILL.md .claude/skills/prd/SKILL.md`
Expected: `.claude/skills/prd/SKILL.md` exists and equals the source; check passes. If prettier changed the source, run `pnpm skills:sync` again.

- [ ] **Step 3: Scenario checks (Review Focus 1-5)**

For each scenario, start a fresh subagent (or a new session if subagents are unavailable) whose only instructions are the contents of `.agents/skills/prd/SKILL.md` and `docs/ai/requirements-docs.md`, then give it the prompt. Do not let it write files into the repository; ask it to describe what it would write and ask. Record the result in your notes.

| #   | Prompt                                                                                                                                          | Expected behaviour                                                                                                                      |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | "Write a PRD for the schedule feature."                                                                                                         | Asks for project, feature, sources, code paths. Writes nothing and invents no requirements.                                             |
| 2   | "Write a PRD for Meetings scheduler from Notion." Notion tool returns an error.                                                                 | States that Notion could not be read, asks the user to paste the content.                                                               |
| 3   | An existing `docs/prd/opportunities/board.md` with REQ-OPP-01..03; "add a requirement for saved filters".                                       | Adds REQ-OPP-04 after 03, leaves 01-03 untouched, does not reuse `OPP` for another feature.                                             |
| 4   | Same PRD says "only published are listed"; "reconstruct the PRD from `packages/backend/opportunities`" where the service also returns archived. | Does not rewrite the PRD; reports the mismatch and points to `docs-code-sync`.                                                          |
| 5   | "Make a PRD from: 1. Show 'account not found' if the email is wrong, 'wrong password' if the password is wrong."                                | Flags the account-enumeration risk in Open questions and proposes one neutral message; does not copy the two messages as a requirement. |

Expected: all five behave as stated. If one does not, edit the skill text (not the rule file unless the rule itself is wrong), run `pnpm skills:sync`, and repeat that scenario.

- [ ] **Step 4: Show the diff, wait for approval, commit**

```bash
git add .agents/skills/prd .claude/skills/prd
git commit -m "feat(skills): add prd skill"
```

Expected: the pre-commit hook passes. Add the attribution trailer.

---

### Task 3: `test-cases` skill

**Files:**

- Create: `.agents/skills/test-cases/SKILL.md`
- Generated: `.claude/skills/test-cases/SKILL.md`

**Interfaces:**

- Consumes: PRD files from Task 2 (`REQ-…N.N` criteria); sections `Test cases`, `Shared procedure` of the rule file.
- Produces: `docs/test-cases/<project>/<feature>.md` with `TC-<FEATURE>-NN` cases, read by `docs-code-sync`.

- [ ] **Step 1: Create `.agents/skills/test-cases/SKILL.md`**

```markdown
---
name: test-cases
description: Use when creating or extending test cases for a UniVerse feature from a PRD or from existing code, including edge, error and state cases and cases for neighbouring features. Triggers on "write test cases", "test scenarios", "QA plan", "тест-кейси", "напиши тест-кейси", "тест-кейсы по PRD", "сценарії тестування", "сценарии тестирования".
---

# Test cases

Write test cases in `docs/test-cases/<project>/<feature>.md`.

Read `docs/ai/requirements-docs.md` first. It defines the layout, IDs, the test-case format and the shared procedure (context gathering and independent review). Do not restate those rules here or in the file.

## Source

- **A PRD exists** at `docs/prd/<project>/<feature>.md`: use it. Every acceptance criterion needs at least one case.
- **Only code exists**: propose running the `prd` skill first, so the cases can reference acceptance criteria. If the user declines, write the cases from the observed behaviour and tests, set `covers: none (no PRD)` on each, and say so when presenting.
- **Neither exists**: ask for the feature name, documents or links and code paths (shared procedure step 5).

## Steps

1. Run shared procedure steps 1-6.
2. For each acceptance criterion write at least one case. Then add cases the criteria imply but do not state, and mark each `- proposed: yes`. Prompts for them:
   - boundaries and empty or maximum inputs;
   - each role (student, lecturer, dean) and what each must not do;
   - Ukrainian and English interface;
   - repeated or concurrent actions, such as a double submit;
   - an expired session, a lost network, Moodle unavailable;
   - leaving the page and coming back.
3. Add an `Intersections` section with cases that exercise neighbouring features found in the PRD's Intersections and in the repository search.
4. Choose `verification` per case: `vitest` for logic and contracts, `playwright` for browser user flows, `manual` for visual or subjective checks. For browser automation, use the `playwright-cli` skill when it is available.
5. Fill `automated-at` only when a test whose title contains the `TC-` ID exists (search the repository for the ID); otherwise write a dash.
6. Quote UI text by translation key in `expected`.
7. Write the file.

## Review checklist

Before presenting, run the independent review (shared procedure step 7) with this checklist:

- every acceptance criterion in the PRD is covered by at least one case;
- steps can be executed by a tester without guessing;
- expected results are measurable;
- `verification` fits the case;
- every `automated-at` path exists and the test contains the `TC-` ID;
- proposed cases are marked and none duplicates another;
- IDs follow the scheme and are unique.

## Present

Give the user the file path, a count of cases by `type` and `verification`, the proposed cases that need confirmation, and what the review changed or left unresolved.
```

- [ ] **Step 2: Sync and check**

Run: `pnpm skills:sync && pnpm skills:check && pnpm exec prettier --write .agents/skills/test-cases/SKILL.md .claude/skills/test-cases/SKILL.md`
Expected: mirror exists and equals the source; check passes.

- [ ] **Step 3: Scenario checks**

Use the same fresh-subagent method as Task 2, Step 3, giving the subagent `.agents/skills/test-cases/SKILL.md` and the rule file.

| #   | Prompt                                                                                | Expected behaviour                                                                                                                                                  |
| --- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | "Write test cases for the opportunities board" with no PRD and no code paths.         | Asks for sources and code paths; writes no cases.                                                                                                                   |
| 2   | A two-criterion PRD (REQ-OPP-01.1, 01.2); "write test cases".                         | At least one `TC-` per criterion, extra edge/error cases marked `proposed: yes`, an `Intersections` section, `automated-at` is a dash when no test mentions the ID. |
| 3   | "Write test cases for packages/backend/opportunities", no PRD, user declines the PRD. | Writes cases with `covers: none (no PRD)` and says so.                                                                                                              |

Expected: all three behave as stated; otherwise fix the skill text, sync and repeat.

- [ ] **Step 4: Show the diff, wait for approval, commit**

```bash
git add .agents/skills/test-cases .claude/skills/test-cases
git commit -m "feat(skills): add test-cases skill"
```

---

### Task 4: `docs-code-sync` skill

**Files:**

- Create: `.agents/skills/docs-code-sync/SKILL.md`
- Generated: `.claude/skills/docs-code-sync/SKILL.md`

**Interfaces:**

- Consumes: PRD files (Task 2), test-case files (Task 3), sections `Discrepancy register`, `Shared procedure`, `Working with the documents` of the rule file.
- Produces: `docs/discrepancies/<project>/<feature>.md` with rows `D-NN` and `Decision` values `update-doc`, `implementation-task`, `leave`.

- [ ] **Step 1: Create `.agents/skills/docs-code-sync/SKILL.md`**

```markdown
---
name: docs-code-sync
description: Use when comparing a UniVerse feature's PRD and test cases with its code and tests, finding mismatches, and resolving them with the team in either direction. Triggers on "check docs against code", "find discrepancies", "sync PRD with code", "documentation drift", "звір документацію з кодом", "розбіжності між доками і кодом", "сверь доку с кодом", "расхождения".
---

# Docs and code sync

Compare a feature's PRD and test cases with its code and tests, record every mismatch in a register, and resolve each one with the user. No side wins automatically.

Read `docs/ai/requirements-docs.md` first. It defines the register format and the shared procedure (context gathering and independent review). Do not restate those rules here or in the register.

## Steps

1. Identify the project and feature. Find `docs/prd/<project>/<feature>.md` and `docs/test-cases/<project>/<feature>.md`. If one is missing, say so and offer the `prd` or `test-cases` skill; compare what exists.
2. Run shared procedure steps 2-5 to learn the code paths and tests that belong to the feature. If the code paths are not clear, ask.
3. Compare. Record a row for each mismatch of these kinds:
   - an acceptance criterion with no test case;
   - a case with `verification` other than `manual` and no test (empty `automated-at`, or the path does not exist);
   - a test that cites a `TC-` ID that is in no document;
   - behaviour in the code that no document describes;
   - a document and the code that say different things.
4. Write `docs/discrepancies/<project>/<feature>.md` in the register format. Each row has an ID `D-NN`, what the document says, what the code or test does, evidence as `file:line`, and a proposed resolution (`update-doc`, `implementation-task` or `leave`).
5. Run the independent review (shared procedure step 7) with the checklist below, then fix its findings.
6. Ask the user about the rows, one by one or grouped, and record each answer in `Decision`. Never decide for the user.
7. Apply the decisions:
   - `update-doc`: edit the PRD or test cases. Keep IDs; never renumber.
   - `implementation-task`: write task text in a "Task drafts" section of the register: what to change, where, which criterion or case it satisfies. Do not create it in Notion unless the user asks.
   - `leave`: note the reason in the row.
8. When every row is closed, show the user the task drafts, ask them to copy them where needed, and ask to confirm deleting the register. Delete it only after they confirm.

## Review checklist

- every row's evidence exists at the cited `file:line` and supports the row;
- no mismatch of the five kinds above was missed in the area compared (search again, independently);
- proposed resolutions are one of the three allowed values;
- no row mixes two different mismatches.

## Present

Give the user the register path, the number of rows by kind, the rows that need a decision, and what the review changed or left unresolved.
```

- [ ] **Step 2: Sync and check**

Run: `pnpm skills:sync && pnpm skills:check && pnpm exec prettier --write .agents/skills/docs-code-sync/SKILL.md .claude/skills/docs-code-sync/SKILL.md`
Expected: mirror exists and equals the source; check passes.

- [ ] **Step 3: Scenario checks**

Use the fresh-subagent method with `.agents/skills/docs-code-sync/SKILL.md` and the rule file, on a prepared mini-feature created only in the subagent's description (do not write to the repository):

| #   | Setup                                                                   | Expected behaviour                                                                                                                                  |
| --- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | PRD says "only published are listed"; the service returns archived too. | One row with evidence at the service `file:line`, proposed `update-doc` or `implementation-task`; asks the user; changes nothing before the answer. |
| 2   | A test title contains `TC-OPP-99`, which exists in no document.         | A row of kind "test cites a missing case".                                                                                                          |
| 3   | The user answers `implementation-task` for a row.                       | Writes a task draft in the register, does not call any Notion tool.                                                                                 |
| 4   | All rows closed.                                                        | Shows the task drafts first, asks for confirmation, then deletes the register.                                                                      |

Expected: all four behave as stated; otherwise fix the skill, sync and repeat.

- [ ] **Step 4: Show the diff, wait for approval, commit**

```bash
git add .agents/skills/docs-code-sync .claude/skills/docs-code-sync
git commit -m "feat(skills): add docs-code-sync skill"
```

---

### Task 5: Gemini-neutrality review and repository checks

**Files:**

- Modify (only if the review finds problems): `.agents/skills/{prd,test-cases,docs-code-sync}/SKILL.md`, `docs/ai/requirements-docs.md`

- [ ] **Step 1: Static review by an independent reviewer**

Start a subagent (or, without subagents, re-read yourself once) with this prompt and the four files attached:

```
You are reviewing three agent skills and one rule file for use by Gemini CLI as well as Claude Code. You cannot run Gemini; review the text only.

Files: .agents/skills/prd/SKILL.md, .agents/skills/test-cases/SKILL.md, .agents/skills/docs-code-sync/SKILL.md, docs/ai/requirements-docs.md.

Report only findings, each with file, quote and why it breaks or may break under Gemini:
1. Claude-specific tool or product names (for example AskUserQuestion, Task tool, "subagent_type", slash commands, MCP tool names).
2. Instructions that only work when subagents exist, with no fallback.
3. Frontmatter other than `name` and `description`, or a description that does not list its trigger phrases.
4. Paths or commands that do not exist in the repository (check with the file system).
5. Rules stated in more than one file (the conventions must live only in docs/ai/requirements-docs.md).
6. Anything that tells the agent to decide a document-versus-code mismatch on its own.
Do not suggest style changes.
```

Expected: a list of findings, possibly empty.

- [ ] **Step 2: Fix findings**

For each finding, edit the file in place (`.agents/skills/...` or `docs/ai/requirements-docs.md`), never `.claude/skills`. Run `pnpm skills:sync` after skill edits. Findings you reject stay in your notes with the reason, to tell the user.

- [ ] **Step 3: Full checks**

Run: `pnpm skills:check && pnpm gemini:check && pnpm exec prettier --check AGENTS.md docs/ai/requirements-docs.md .agents/skills/prd/SKILL.md .agents/skills/test-cases/SKILL.md .agents/skills/docs-code-sync/SKILL.md`
Expected: all pass. Confirm the size: `wc -c GEMINI.md` is at most 24000 and equal to before the work (21713) because no `docs/ai` import changed.

- [ ] **Step 4: Show the diff, wait for approval, commit (only if Step 2 changed files)**

```bash
git add .agents/skills .claude/skills docs/ai/requirements-docs.md
git commit -m "fix(skills): address Gemini-neutrality review findings"
```

---

### Task 6: Pilot on Opportunities (code to PRD to test cases to sync)

**Files (created by running the skills; kept or discarded after the pilot):**

- `docs/prd/opportunities/<feature>.md`
- `docs/test-cases/opportunities/<feature>.md`
- `docs/discrepancies/opportunities/<feature>.md`
- Modify (to fix what the pilot exposes): the three `SKILL.md` files and `docs/ai/requirements-docs.md`

This task is interactive: the skills ask the user questions, and the user must be present.

Code paths for the pilot: `packages/backend/opportunities/`, `packages/uni-hub/views/dashboard/tabs/OpportunitiesTab.tsx`, `packages/uni-hub/views/dashboard/tabs/opportunities/`, `packages/uni-hub/views/dashboard/tabs/OpportunityCard.tsx`, `packages/uni-hub/services/api.opportunities.ts`, `packages/core/constants/features.ts`, `packages/core/constants/roles.ts`, `packages/ui/components/complex/{ApplyOpportunityModal,CreateOpportunityModal,OpportunityDetailModal}/`, and the Opportunity models in `packages/database/client/schema.prisma`. Existing tests: `packages/backend/opportunities/*.spec.ts`, `packages/uni-hub/services/api.opportunities.test.ts`, `packages/uni-hub/views/dashboard/tabs/OpportunityCard.test.ts`.

- [ ] **Step 1: Run `prd` in code mode**

Invoke the `prd` skill with: "Reconstruct the PRD for Opportunities from these code paths: <the list above>." Answer its questions: ask the user for the Notion project link and for the feature split (one feature or several; the file name and the feature code, for example `OPP`). Let it run its independent review.
Expected: a PRD at `docs/prd/opportunities/<feature>.md` with `origin: code`, `status: draft`, requirements with numbered acceptance criteria, defects or gaps in Open questions, and a review summary.

- [ ] **Step 2: Run `test-cases` on that PRD**

Invoke `test-cases` for the same feature. Expected: cases per criterion, proposed edge cases, intersections (for example with the gamification store or roles), `verification` values, and `automated-at` filled only where an existing test contains a `TC-` ID (probably none yet).

- [ ] **Step 3: Run `docs-code-sync`**

Invoke `docs-code-sync` for the same feature. Expected: a register with at least the "criterion without test automated" kind of rows; every evidence `file:line` exists. Walk through the user's decisions for two or three rows to exercise the apply step; do not create tasks in Notion.

- [ ] **Step 4: Record what the pilot exposed**

List, in a short note to the user: where a skill asked too much or too little, where the review caught or missed something, where the rule file was unclear, and how long each run took. For each defect in a skill or the rule file, fix the text (Task 2-4 locations), run `pnpm skills:sync`, and re-run only the step that failed.

- [ ] **Step 5: Ask the user what to keep**

Ask whether the pilot PRD and test cases stay in the repository. If they stay, they are committed as the first real documents; the register is deleted per `docs-code-sync` step 8 or kept for the team discussion. If not, delete them.

- [ ] **Step 6: Show the diff, wait for approval, commit**

```bash
git add .agents/skills .claude/skills docs/ai/requirements-docs.md docs/prd docs/test-cases docs/discrepancies
git commit -m "docs: add Opportunities PRD and test cases from the pilot; refine skills"
```

Only stage the directories that exist and that the user agreed to keep.

---

### Task 7: Docs-first check on a UniHub item and final verification

**Files:**

- Created by the run and discarded unless the user asks to keep: `docs/prd/uni-hub/student-overview-navigation.md`
- Modify: skills or the rule file only if the run exposes defects

- [ ] **Step 1: Run `prd` in idea mode on short informal input**

Invoke `prd` with this input, taken from the Notion "Улучшения/Импрувмент" page:

```
2. In UniVerse, in "Картка студента / Огляд", make the buttons "Всього дисциплін" (opens "Індивідуальний план") and "Завдань до виконань" (opens "Завдання") work.
5. In "Поточні дисципліни", clicking a discipline opens the course content.
6. In "Найближчі події та дедлайни", clicking an assignment opens it; if the event is a class, open its video-meeting link directly.
```

Expected: one candidate requirement per item; questions only about gaps (what if a class has no meeting link; what an assignment link opens for an already submitted one); the skill checks the existing code for these screens in its Intersections; no invented behaviour; `status: draft`, `origin: idea`.

- [ ] **Step 2: Fix any defect, then discard or keep**

If the run exposed a skill defect, fix the text, run `pnpm skills:sync`, and re-run Step 1. Then ask the user whether to keep the document; delete it if not.

- [ ] **Step 3: Final verification**

Run:

```bash
pnpm skills:check
pnpm gemini:check
pnpm exec prettier --check AGENTS.md docs/ai/requirements-docs.md .agents/skills/prd/SKILL.md .agents/skills/test-cases/SKILL.md .agents/skills/docs-code-sync/SKILL.md docs/superpowers/specs/2026-10-09-prd-and-test-case-skills-design.md docs/superpowers/plans/2026-10-09-prd-and-test-case-skills.md
pnpm lint && pnpm lint:style && pnpm typecheck
git status --short
```

Expected: every command passes with no warnings; `git status` shows only intended files. Walk the pre-commit checklist in `docs/ai/workflow.md` and note any item that does not apply (no source code was changed).

- [ ] **Step 4: PR description notes**

Prepare the PR description (for `develop`) covering: what the three skills and the rule file do; that `GEMINI.md` is unchanged; the pilot result and what was kept; the Review Focus scenarios and their outcome; that Gemini compatibility was checked statically only; the license note about the two reference repositories; and any violation noticed in unrelated code. Give it to the user; do not open the PR without being asked.

- [ ] **Step 5: Commit any remaining approved changes**

```bash
git add <only the approved files>
git commit -m "docs: finalize PRD and test-case skills"
```
