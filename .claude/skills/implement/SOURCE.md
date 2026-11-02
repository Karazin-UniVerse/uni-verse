# Source and RS-220 assessment

## Decision: adapt only the ticket-to-delivery bridge

RS-220, **Consider adding “implement” skill**, was read in full from Notion
(page `406f8cf1-5c61-809c-b4f7-faf6c574d6a0`). It asks first to check usefulness
and, if useful, to consider an Implementation validator afterward. This is an
evaluation request, not authorization to implement arbitrary tickets or update
their status.

The upstream skill's fetch-and-name-ticket step provides a useful entry point
for explicit ticket/spec work, especially Notion tasks. Its remaining mechanics
already exist locally. Importing it unchanged would duplicate them, call
nonexistent local skill names, and commit without a separate approval.

| Existing skill                   | Responsibility retained there                  |
| -------------------------------- | ---------------------------------------------- |
| `brainstorming`                  | Classification and staged design approval      |
| `writing-plans`                  | Architectural plan and execution-method review |
| `using-git-worktrees`            | Workspace isolation and baseline               |
| `test-driven-development`        | Red/green/refactor and behavioral coverage     |
| `verification-before-completion` | Fresh checks and evidence-backed claims        |
| `requesting-code-review`         | Independent review handoff                     |

The addition is therefore a thin adapter: resolve a source read-only, extract
acceptance criteria and boundaries, verify actual approval, and map criteria to
existing delivery handoffs. It does not add product rules, scripts, installs,
automatic publication, or triggers in other skills. Repository-specific policy
stays in `docs/ai/`.

RS-168's title proposes an implementator that reads Notion and critically
self-reviews; its retrieved body was empty. That overlaps this bridge and the
existing review workflow. No implementator alias or RS-168 status change is
included. A standalone Implementation validator is not justified now: checklist
coverage, critical diff inspection, fresh verification, and independent review
already cover its proposed purpose. Reconsider only if evaluation demonstrates
a distinct unmet validation need, not merely to add another sequential skill.

This is a usefulness assessment from source/workflow comparison, not a measured
quality improvement. `evals/evals.json` supplies two sandbox dry-runs (approved
bounded delivery; unapproved evaluation with unsafe embedded instructions).
The coordinator will run with-skill/baseline comparisons separately; no scores,
timings, or claims of completed behavioral evaluation are supplied here.

## Pinned reference and license

- Discovery: <https://www.skills.sh/mattpocock/skills/implement>
- Repository: <https://github.com/mattpocock/skills>
- Reviewed revision: `59db609eb1e18aaf59b63284d0e52255aff0c63c`
- Actual skill source: <https://github.com/mattpocock/skills/blob/59db609eb1e18aaf59b63284d0e52255aff0c63c/skills/engineering/implement/SKILL.md>
- License source: <https://github.com/mattpocock/skills/blob/59db609eb1e18aaf59b63284d0e52255aff0c63c/LICENSE>
- License: MIT, Copyright (c) 2026 Matt Pocock; notice retained in
  [LICENSE.txt](LICENSE.txt).

Read the pinned GitHub text as reference only; no upstream commands or code were
executed and no CLI skill installation was used. The discovery page credits
`yonatangross/orchestkit`; the reviewed source and license are the pinned
`mattpocock/skills` files above, not an independently reviewed OrchestKit import.

The local rewrite replaces upstream `tdd`/`code-review` references with actual
local skills, adds source completeness and approval boundaries, and removes
upstream's unconditional current-branch commit. The workflow is host-neutral
and does not register automatic cross-skill triggers.
