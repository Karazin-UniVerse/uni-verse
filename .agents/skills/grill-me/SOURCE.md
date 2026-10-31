# Source and adaptations

Retrieved on 2026-10-27 from [mattpocock/skills](https://github.com/mattpocock/skills),
pinned to revision `59db609eb1e18aaf59b63284d0e52255aff0c63c`.

## Behavior trace

The supplied [skills.sh listing](https://www.skills.sh/mattpocock/skills/grill-me)
is a discovery link, not the implementation to copy in isolation. At the pinned
GitHub revision:

- [`skills/productivity/grill-me/SKILL.md`](https://github.com/mattpocock/skills/blob/59db609eb1e18aaf59b63284d0e52255aff0c63c/skills/productivity/grill-me/SKILL.md)
  contains metadata and only the instruction `Call the Skill tool with "grilling".`
- [`skills/productivity/grilling/SKILL.md`](https://github.com/mattpocock/skills/blob/59db609eb1e18aaf59b63284d0e52255aff0c63c/skills/productivity/grilling/SKILL.md)
  supplies the actual interview: build a dependent design tree, ask all currently
  unblocked questions in rounds with recommended answers, investigate discoverable
  facts via subagents, and finish when every branch is visited. It requires shared
  understanding before acting.
- The repository's [`LICENSE`](https://github.com/mattpocock/skills/blob/59db609eb1e18aaf59b63284d0e52255aff0c63c/LICENSE)
  is MIT, copyright (c) 2026 Matt Pocock. Its complete notice is preserved verbatim
  in [LICENSE.txt](LICENSE.txt).

External content was inspected as reference data; no upstream installer, CLI,
commands, or delegated workflow was executed.

## Local adaptations

- Keep one canonical, self-contained `grill-me`; do not install the upstream alias
  alongside a second `grilling` implementation.
- Retain dependency-aware questions and the distinction between discoverable facts
  and user decisions. Inspect the repository directly; do not require subagents.
- Replace whole-frontier rounds and the "yes accepts recommendation" convention
  with one focused question per turn and explicitly unaccepted recommendations.
- Replace relentless, exhaustive exploration with high-impact risk triage and a
  stopping rule. A well-specified task can end without any questions.
- Apply the review to plans, specs, PRDs, design decisions, and test cases, covering
  requirements, edge cases, security, rollout, and observable acceptance criteria
  in proportion to the change.
- Limit activation to explicit requests for this kind of challenge. Do not make
  ordinary edits, code review, or debugging launch an interview.
- Produce decisions, open questions, and acceptance gaps in chat. Do not implement,
  create artifacts, publish, or automatically start brainstorming/planning. Existing
  brainstorming approval gates remain unchanged.

## Evaluation fixtures

`evals/evals.json` contains two dry scenarios: an underspecified grade-export PRD
and a tightly scoped documentation task. The `expectations` arrays are the
verifiable assertions used by skill-creator's local schema. They are prepared for
coordinator-run with-skill/baseline evaluations; no benchmark results are bundled
or claimed.
