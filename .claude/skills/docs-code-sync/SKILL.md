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
3. Compare what the user sees as well as the backend: check that data the backend produces is actually shown in the interface, and read the interface code for each criterion. Record a row for each mismatch of these kinds:
   - an acceptance criterion with no test case;
   - a case with `verification` other than `manual` and no test (`automated-at` is a dash, or the path does not exist);
   - a test that cites a `TC-` ID that is in no document;
   - behaviour in the code that no document describes;
   - a document and the code that say different things.

   When no case has a test yet, write one row for the second kind instead of one per case.
4. Write `docs/discrepancies/<project>/<feature>.md` in the register format, one row per mismatch. The proposed resolution is a suggestion backed by the evidence: when asking, name the other two options and what each would change.
5. Run the independent review (shared procedure step 7) with the checklist below, then fix its findings.
6. Ask the user about the rows, one by one or grouped, and record each answer in `Decision`. Never decide for the user.
7. Apply the decisions:
   - `update-doc`: edit the PRD or test cases.
   - `implementation-task`: write the task draft in the register's "Task drafts" section. Do not create it in Notion unless the user asks.
   - `leave`: record the reason in `Decision`.
8. When every row is closed, show the user the task drafts (skip this when there are none), ask them to copy them where needed, and ask to confirm deleting the register. Delete it only after they confirm; if they decline, keep it.

## Review checklist

- every row's evidence exists at the cited `file:line` and supports the row;
- no mismatch of the five kinds above was missed in the area compared (search again, independently);
- proposed resolutions are one of the three allowed values;
- no row mixes two different mismatches.

## Present

Give the user the register path, the number of rows by kind, the rows that need a decision, and what the review changed or left unresolved. Leave committing the register and the document edits to the user.
