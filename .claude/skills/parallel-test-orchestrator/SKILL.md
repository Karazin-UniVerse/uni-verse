---
name: parallel-test-orchestrator
description: Orchestrates parallel frontend unit test generation and migration across multiple test files in batches of up to 5 concurrent subagents with isolated file ownership, quality verification, and atomic commit management.
---

# Parallel Test Orchestrator Skill

## Overview
This skill provides an orchestration framework for parallelizing test writing, migration, and coverage enhancement across large codebases. It leverages the Antigravity `invoke_subagent` tool to spawn batches of up to **5 concurrent subagents**, where each subagent is assigned strictly **one test file** to create or upgrade.

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
2. **Subagents NEVER Commit**: Subagents MUST NOT run `git add`, `git commit`, `git push`, or `pnpm skills:sync`. Only the parent orchestrator executes git commits and repository-level sync commands.
3. **Subagents Verify Locally**: Each subagent must run Vitest targeting exclusively its assigned file:
   ```bash
   cmd /c "pnpm test path/to/MyComponent.test.tsx"
   ```
4. **Model Tier**: Inherit (`Model: "inherit"`) or `pro` for complex stateful views, `flash` for standard presentation components.
5. **Prompt Structure**: Every subagent prompt must contain:
   - Target source file path and target test file path.
   - Mode (`migrate`, `generate`, or `expand`).
   - Guardrails: Strict `'should ...'` naming, no `div role="dialog"`, no comparator-less `.sort()`, no `Math.random()`.
   - Command to verify its file.

---

## Orchestrator Loop

For each batch of files:
1. **Batch Selection**: Group remaining untested or unmigrated components into batches of up to 5 items.
2. **Launch Subagents**: Call `invoke_subagent` with the 5 subagent specifications in parallel.
3. **Await Completion**: Subagents run asynchronously in the background. The parent agent receives automatic completion notifications.
4. **Post-Batch Quality Verification**:
   - Run prettier formatting on touched files:
     ```bash
     cmd /c "pnpm exec prettier --write path/to/file1.test.tsx path/to/file2.test.tsx ..."
     ```
   - Run typecheck and linting:
     ```bash
     cmd /c "pnpm --filter @universe/ui test --run" # or targeted package
     cmd /c "pnpm typecheck"
     cmd /c "pnpm lint"
     ```
5. **Atomic Commit**: Stage modified test files and commit using conventional commits (e.g., `test(ui): add unit tests for una primitives`).

---

## Subagent Prompt Template

```markdown
You are a frontend unit test specialist working on the Uni-Verse monorepo.
Your task is to write/upgrade a unit test suite for:
- Source: <source_file_path>
- Test Target: <target_test_file_path>

Requirements:
1. Read the source component/hook carefully to understand its props, callbacks, accessibility, and behavior.
2. Use React Testing Library (@testing-library/react, @testing-library/user-event) and Happy-DOM.
3. Follow RTL best practices:
   - Query by role or label first.
   - Every single test name MUST start with 'should ...'.
   - Avoid test bloat; test user-visible behavior and interactive contracts.
   - For dialogs/modals in mocks, NEVER use <div role="dialog"> (use <dialog open aria-label={title}>).
   - NEVER use Math.random() or sort without comparator.
4. Verify your test by running:
   cmd /c "pnpm test <target_test_file_path>"
5. Do NOT run git add, git commit, or any git commands.
```
