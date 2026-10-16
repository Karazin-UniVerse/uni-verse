---
name: parallel-test-orchestrator
description: Orchestrates parallel frontend unit test generation and migration across multiple test files in batches of up to 5 concurrent subagents with isolated file ownership, quality verification, and atomic commit management.
---

# Parallel Test Orchestrator Skill

## Overview
This skill provides an orchestration framework for parallelizing test writing, migration, and coverage enhancement across large codebases. It leverages the `invoke_subagent` tool to spawn batches of up to **5 concurrent subagents**, where each subagent is assigned strictly **one test file** to create or upgrade following [`unit-test-writing`](../unit-test-writing/SKILL.md) (for new tests) or [`rtl-test-migrator`](../rtl-test-migrator/SKILL.md) (for legacy migrations).

---

## Architecture & Subagent Isolation Rules

```
                      +-----------------------------+
                      | Parent Orchestrator Agent   |
                      | - Selects batch (up to 5)   |
                      | - Spawns subagents          |
                      | - Runs prettier & linter    |
                      | - Makes atomic git commits  |
                      +--------------+--------------+
                                     |
         +-------------+-------------+-------------+-------------+
         |             |             |             |             |
         v             v             v             v             v
   [Subagent 1]   [Subagent 2]  [Subagent 3]  [Subagent 4]  [Subagent 5]
   File A only    File B only   File C only   File D only   File E only
   Vitest verify  Vitest verify Vitest verify Vitest verify Vitest verify
```

### Strict Isolation Rules:
1. **One File Per Subagent**: Each subagent has strict, exclusive ownership over **one single test file** (e.g. `ComponentA.test.tsx`). No two subagents may ever touch or modify the same file.
2. **Subagents NEVER Commit or Rename via Git**: Subagents MUST NOT run `git add`, `git commit`, `git mv`, `git push`, or `pnpm skills:sync`. Only the parent orchestrator executes git commands (including any `.test.ts` to `.test.tsx` `git mv` renames prior to spawning subagents) and repository-level sync commands.
3. **Subagents Verify Locally**: Each subagent must run Vitest and Oxlint targeting exclusively its assigned file:
   ```bash
   pnpm --filter <pkg> test <TestName> --run
   pnpm exec oxlint path/to/MyComponent.test.tsx
   ```
4. **Model Tier**: Always use `Model: "inherit"` unless the user explicitly specifies a tier.
5. **Prompt Structure**: Every subagent prompt must contain:
   - Target source file path and target test file path.
   - Reference to [`unit-test-writing`](../unit-test-writing/SKILL.md) (or [`rtl-test-migrator`](../rtl-test-migrator/SKILL.md)).
   - Guardrails: Strict `'should ...'` naming, no `div role="dialog"`, no comparator-less `.sort()`, no `Math.random()`, and `universe/vertical-spacing` compliance.
   - Command to verify its file.

---

## Orchestrator Loop

For each batch of files:
1. **Batch Selection & Pre-Batch Git Renames**: Group remaining untested or unmigrated components into batches of up to 5 items. If any legacy `.test.ts` file in the batch requires JSX, the parent orchestrator runs `git mv path/to/File.test.ts path/to/File.test.tsx` before spawning subagents.
2. **Launch Subagents**: Call `invoke_subagent` with the 5 subagent specifications in parallel.
3. **Await Completion**: Subagents run asynchronously in the background. Wait for automatic completion notifications without polling in a loop.
4. **Post-Batch Quality Verification**:
   - Run prettier formatting on touched files:
     ```bash
     pnpm exec prettier --write path/to/file1.test.tsx path/to/file2.test.tsx ...
     ```
   - Run package tests, typecheck, and linting:
     ```bash
     pnpm --filter @universe/ui test --run # or @universe/uni-hub
     pnpm --filter @universe/ui typecheck
     pnpm lint
     ```
5. **Atomic Commit**: Stage modified test files and commit using conventional commits (e.g., `test(ui): add unit tests for una primitives`).

---

## Subagent Prompt Template

```markdown
You are a frontend unit test specialist working in the Uni-Verse monorepo.
Follow [unit-test-writing](../unit-test-writing/SKILL.md) to write a comprehensive unit test suite for:
- Source: <source_file_path>
- Test Target: <target_test_file_path>

Requirements:
1. Read the source component/hook carefully to understand its props, callbacks, providers, accessibility, and behavior.
2. Use React Testing Library (@testing-library/react, @testing-library/user-event) and Happy-DOM.
3. Follow strict conventions:
   - Query by role or label first.
   - Every single test name MUST start with 'should ...'.
   - Avoid test bloat; test user-visible behavior, edge cases, a11y, and security (rel="noopener noreferrer", XSS escaping).
   - For dialogs/modals in mocks, NEVER use <div role="dialog"> (use <dialog open aria-label={title}>).
   - NEVER use Math.random() or sort without comparator.
   - Keep oxlint happy: blank line after variable declarations and before return (universe/vertical-spacing).
4. Verify your test by running:
   pnpm --filter <pkg> test <TestName> --run
   pnpm exec oxlint <target_test_file_path>
5. Do NOT run git add, git commit, git mv, or any git commands.
```
