---
name: test-cases
description: Use when creating or extending test cases for a UniVerse feature from a PRD or from existing code, including edge, error and state cases and cases for neighbouring features. Triggers on "write test cases", "test scenarios", "QA plan", "тест-кейси", "напиши тест-кейси", "тест-кейсы по PRD", "сценарії тестування", "сценарии тестирования".
---

# Test cases

Write test cases in `docs/test-cases/<project>/<feature>.md`.

Read `docs/ai/requirements-docs.md` first. It defines the layout, IDs, the test-case format and the shared procedure (context gathering and independent review). Do not restate those rules here or in the file.

## Source

- **A PRD exists** at `docs/prd/<project>/<feature>.md`: use it. Every acceptance criterion needs at least one case.
- **Only code exists**: propose running the `prd` skill first, so the cases can reference acceptance criteria. If the user declines, write the cases from the observed behaviour and tests, mark each case as the rule file says for a case without a PRD, and say so when presenting.
- **Neither exists**: ask for the feature name, documents or links and code paths (shared procedure step 5).

## Steps

1. Run shared procedure steps 1-6.
2. For each acceptance criterion write at least one case. Then add cases the criteria imply but do not state (they are `proposed`). Keep them few and meaningful: each must name a concrete risk for this feature, so skip prompts that do not apply and do not pad the list. Where the PRD defines no behaviour (for example session expiry), do not guess an expected result; ask the user what should happen. Prompts:
   - boundaries and empty or maximum inputs;
   - each role (student, lecturer, dean) and what each must not do;
   - Ukrainian and English interface;
   - repeated or concurrent actions, such as a double submit;
   - an expired session, a lost network, Moodle unavailable;
   - leaving the page and coming back.
3. Add an `Intersections` section with cases that exercise neighbouring features found in the PRD's Intersections and in the repository search. Only cases that involve another feature belong there.
4. Choose `verification` per case as the rule file defines it. For browser automation, use the `playwright-cli` skill when it is available.
5. Fill `automated-at` as the rule file says; search the repository for the `TC-` ID.
6. If the code visibly contradicts the PRD, write `expected` as the PRD says and tell the user, so the mismatch can go to `docs-code-sync`; do not decide it yourself.
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

Give the user the file path, a count of cases by `type` and `verification`, the proposed cases that need confirmation, any observed behaviour that looks like a defect, and what the review changed or left unresolved.
