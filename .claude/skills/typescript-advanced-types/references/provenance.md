# Provenance and assessment — RS-218

Adapted from Seth Hobson's `typescript-advanced-types` skill in [`wshobson/agents`](https://github.com/wshobson/agents), discovered through the [skills.sh listing](https://www.skills.sh/wshobson/agents/typescript-advanced-types).

## Reviewed revision

- Commit: `0874a27b17a22e2b7c2e2bcd725768e0803cad06` (upstream `main` when inspected on 2026-10-27).
- [Skill source](https://github.com/wshobson/agents/blob/0874a27b17a22e2b7c2e2bcd725768e0803cad06/plugins/javascript-typescript/skills/typescript-advanced-types/SKILL.md).
- [Detailed examples](https://github.com/wshobson/agents/blob/0874a27b17a22e2b7c2e2bcd725768e0803cad06/plugins/javascript-typescript/skills/typescript-advanced-types/references/details.md).
- [MIT license](https://github.com/wshobson/agents/blob/0874a27b17a22e2b7c2e2bcd725768e0803cad06/LICENSE), copyright (c) 2024 Seth Hobson. The notice is retained in [LICENSE.txt](../LICENSE.txt).

The listing, both source documents, and repository license were read as reference data. No upstream commands, installation CLI, or third-party code were executed.

## Adaptation decision

Useful concepts retained: constrained relationships, mapped/indexed unions, conditional distribution, built-in extraction utilities, discriminated narrowing, and bounded template-literal derivation. The local skill adds an explicit union-caller check: a generic key can be inferred or supplied as a union, so separately typed key/payload arguments are not necessarily correlated.

Direct installation was rejected because the upstream scope also includes event-emitter, API-client, builder, and form-validation frameworks; several examples rely on `any`, non-null assertions, or unchecked casts. Its custom `ReturnType`, `Parameters`, `Partial`, and `Readonly` examples duplicate built-ins. Its `AssertEqual` aliases do not by themselves enforce success, and its `ExpectError` example is not a substitute for checking actual rejected calls. Its recommendation to skip production type checking conflicts with this repository's verification workflow.

Instead of copying that catalog, the adaptation uses one small, standalone example and a decision workflow. It does not introduce domain contracts, runtime helpers, dependencies, or compiler configuration. Repository policies remain in `docs/ai/`; this skill links to them rather than reproducing them.

## Evaluation handoff

`../evals/evals.json` contains two independent dry tasks: a queue API with correlated union arguments and a near-miss request to reuse an existing moderation contract. Assertions use the skill-creator schema's `expectations` field. Both prompts prohibit product edits and dependency installation; save any compiler fixtures only in the evaluation runner's temporary output directory.

The coordinator runs with-skill and baseline evaluations separately. No comparative results or trigger-accuracy claims are implied by this source assessment.
