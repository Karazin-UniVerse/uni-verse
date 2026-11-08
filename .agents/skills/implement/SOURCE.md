# Source and RS-220 / RS-168 assessment

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

RS-168, **Cosider adding skill implementator that reads notion and do self review
critically** ([Notion source](https://www.notion.so/3f4f8cf15c618021b116cf8306f8b3f0)),
was re-read on 2026-11-05. Its body now asks to ensure this is covered by the
existing `implement` skill and links to it; the earlier empty-body assessment is
no longer current. The existing source-reading and review handoffs cover that
intent without an implementator alias or standalone Implementation validator.
The targeted addition makes the critical review explicit: assess every criterion
against the diff and evidence, challenge green tests with missing-behavior
counterexamples, and fix scoped gaps without weakening the ticket or assertions.
No tracker status changes are included.

This is a usefulness assessment from source/workflow comparison, not a measured
quality improvement. `evals/evals.json` supplies three sandbox dry-runs: approved
bounded delivery; unapproved evaluation with unsafe embedded instructions; and a
completion claim where green tests miss a violated acceptance criterion. These
scenarios are behavioral checks, not evidence by themselves; report actual
baseline/revised outputs and review results separately rather than inferring a
quality improvement from the added wording.

On 2026-11-05, separate fresh-context runs exercised the old and revised skill
against all three supplied scenarios. A separate grader assessed the six outputs:
both versions met all 16 content/attested-process expectations, with no observed
advantage for the revision. The prompts explicitly describe the defects and
approval boundaries, so this is a limited workflow sanity check, not a blind
defect-discovery or real implementation benchmark. No full execution transcripts,
per-eval timings, or token counts were available; no-action judgments rely on
executor summaries rather than independently inspected traces.

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
