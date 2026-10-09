---
name: using-git-worktrees
description: Use when starting feature work that needs isolation from current workspace or before executing implementation plans - ensures an isolated workspace exists via native tools or git worktree fallback
---

# Using Git Worktrees

## Overview

Ensure work happens in an isolated workspace. Prefer your platform's native worktree tools. Fall back to manual git worktrees only when no native tool is available.

**Core principle:** Detect existing isolation first. Then use native tools. Then fall back to git. Never fight the harness.

**Announce at start:** "I'm using the using-git-worktrees skill to set up an isolated workspace."

## Step 0: Detect Existing Isolation

**Before creating anything, check if you are already in an isolated workspace, or if a worktree for the task already exists.**

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
BRANCH=$(git branch --show-current)
```

**Submodule guard:** `GIT_DIR != GIT_COMMON` is also true inside git submodules. Before concluding "already in a worktree," verify you are not in a submodule:

```bash
# If this returns a path, you're in a submodule, not a worktree — treat as normal repo
git rev-parse --show-superproject-working-tree 2>/dev/null
```

**If `GIT_DIR != GIT_COMMON` (and not a submodule):** You are already in a linked worktree. Skip to Step 2 (Project Setup). Do NOT create another worktree.

Report with branch state:
- On a branch: "Already in isolated workspace at `<path>` on branch `<name>`."
- Detached HEAD: "Already in isolated workspace at `<path>` (detached HEAD, externally managed). Branch creation needed at finish time."

**Check for an existing worktree matching the task:** If you are in the main checkout (`GIT_DIR == GIT_COMMON`), search existing worktrees for the requested task branch before prompting or creating a new one:

```bash
git worktree list
```

If an existing worktree is already on the target task branch, switch to its directory and reuse it instead of creating another worktree:

```bash
cd "<existing-worktree-path>"
```

Then skip to Step 2 (Project Setup).

**If no existing worktree matches:** You are in a normal repo checkout.

Has the user already indicated their worktree preference in your instructions? If not, ask for consent before creating a worktree:

> "Would you like me to set up an isolated worktree? It protects your current branch from changes."

Honor any existing declared preference without asking. If the user declines consent, work in place and skip to Step 2.

## Step 1: Create Isolated Workspace

**You have two mechanisms. Try them in this order.**

### 1a. Native Worktree Tools (preferred)

The user has asked for an isolated workspace (Step 0 consent). Do you already have a way to create a worktree? It might be a dedicated worktree tool, a worktree command, or a `--worktree` flag of your platform. If you do, use it and skip to Step 2.

Native tools handle directory placement, branch creation, and cleanup automatically. Using `git worktree add` when you have a native tool creates phantom state your harness can't see or manage.

Pull requests target `develop`, so the new branch must start from `origin/develop`. A native tool may base the branch on another ref: after creating it, run `git fetch origin develop`, then compare `git rev-parse HEAD` with `git rev-parse origin/develop`. If they differ, recreate the branch from `origin/develop` before any work. Name the branch with a prefix from [workflow](../../../docs/ai/workflow.md#branches-commits-pull-requests) (`feature/`, `fix/`, `refactor/`, `chore/`, `hotfix/`).

Only proceed to Step 1b if you have no native worktree tool available.

### 1b. Git Worktree Fallback

**Only use this if Step 1a does not apply** — you have no native worktree tool available. Create a worktree manually using git.

#### Directory Selection

Follow this priority order. Explicit user preference always beats observed filesystem state.

1. **Check your instructions for a declared worktree directory preference.** If the user has already specified one, set `WORKTREE_BASE_DIR` to that path without asking.

2. **Otherwise use `.claude/worktrees/` at the project root.** Set `WORKTREE_BASE_DIR=".claude/worktrees"`. This is where the existing worktrees of this project live.

#### Safety Verification

**MUST verify directory is ignored before creating worktree:**

```bash
git check-ignore -q "$WORKTREE_BASE_DIR"
```

**If NOT ignored:** Do not commit a `.gitignore` change inside the feature branch. Tell the user and ask where to put the worktree.

**Why critical:** Prevents accidentally committing worktree contents to repository.

#### Create the Worktree

```bash
# Set BRANCH_NAME for the task (e.g. feature/my-feature, fix/my-bug)
BRANCH_NAME="<task-branch-name>"

# Determine path based on chosen location; branch names contain "/", so flatten them for the folder
path="$WORKTREE_BASE_DIR/${BRANCH_NAME//\//-}"

git fetch origin develop
git worktree add "$path" -b "$BRANCH_NAME" origin/develop
cd "$path"
```

**Sandbox fallback:** If `git worktree add` fails with a permission error (sandbox denial), inform the user that the sandbox blocked worktree creation and ask whether to proceed in the current checkout or stop. Do NOT run setup or tests in place without explicit user approval.

## Step 2: Project Setup

Install dependencies with pnpm; never `npm install`, which would create a stray `package-lock.json` in this pnpm workspace:

```bash
pnpm install
```

## Step 3: Verify Clean Baseline

Run tests to ensure workspace starts clean:

```bash
pnpm test
```

**If tests fail:** Report failures, ask whether to proceed or investigate.

**If tests pass:** Report ready.

### Report

```
Worktree ready at <full-path>
Tests passing (<N> tests, 0 failures)
Ready to implement <feature-name>
```

## Quick Reference

| Situation | Action |
|-----------|--------|
| Already in linked worktree | Skip creation (Step 0) |
| Matching worktree exists for task | Switch to it and reuse (Step 0) |
| In a submodule | Treat as normal repo (Step 0 guard) |
| Native worktree tool available | Use it (Step 1a) |
| No native tool | Git worktree fallback (Step 1b) |
| Declared directory preference | Use it |
| No preference | Use `.claude/worktrees/` (verify ignored) |
| Directory not ignored | Tell the user, do not commit a `.gitignore` change |
| Branch does not start at `origin/develop` | Recreate it from `origin/develop` |
| Permission error on create | Sandbox fallback: ask user before working in current checkout |
| Tests fail during baseline | Report failures + ask |

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "I'm obviously not in a worktree — no need to check" | Run Step 0. Harness-created isolation and submodules both fool eyeballing; the detection commands settle it. |
| "`git worktree add` is quicker than hunting for a native tool" | A native worktree tool owns placement, branching, and cleanup. Bypassing it is the #1 mistake — it creates phantom state your harness can't see or manage. |
| "The worktree directory is surely ignored already" | Run `git check-ignore`. An unignored worktree directory commits the whole tree into the repo. |
| "Any directory name works" | Explicit instructions beat the `.claude/worktrees/` default. |
| "The branch is fresh, so it surely starts at `develop`" | A native tool may base it on another ref. Compare `HEAD` with `origin/develop` before any work. |
| "The workspace is fresh — baseline tests can wait" | A dirty baseline makes every later failure ambiguous. Run the tests now; proceeding past failures is your human partner's call. |
