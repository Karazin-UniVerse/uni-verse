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
3. Ask only about gaps that block a checkable acceptance criterion: the goal, the scope, who the role is, what "done" looks like. Two or three questions at a time. Propose a priority for each requirement and ask the user to confirm it.
4. Choose the feature code and file name, propose them to the user, and write the file with `status: draft`.

### From code (`origin: code`)

1. If a PRD for the feature already exists, use "Existing PRD" instead. Otherwise run shared procedure steps 1-6. The user names the code paths (packages, folders, routes); if none are given, ask.
2. Read the code, its tests and its translation keys. Describe observed behaviour as requirements with acceptance criteria.
3. Record anything that looks like a defect, a gap or an undocumented decision in Open questions. Do not silently fix it or hide it.
4. Choose the feature code and file name, propose them to the user, and write the file with `status: draft`.

### Existing PRD

Extend it with what the user asks for, following the ID and status rules in the rule file. If the PRD was `approved`, tell the user the new requirements need the team's approval.

Do not add requirements derived from code to an existing PRD, and do not rewrite it to match the code. When the code contradicts the PRD or does something the PRD does not describe, tell the user and hand it to `docs-code-sync`, which records it in the register.

## Review checklist

Before presenting, run the independent review (shared procedure step 7) with this checklist:

- every acceptance criterion is specific and can be checked without interpretation;
- no two requirements contradict each other;
- the scope says what is out;
- Intersections match the code and the other documents (verified by search, not from memory);
- security and privacy risks and edge cases are raised in Requirements or Open questions; for example, messages that reveal whether an account exists are flagged with a safer alternative, not copied as a requirement;
- IDs and front matter follow the rule file.

## Present

Give the user the file path, the open questions, and what the review changed or left unresolved.
