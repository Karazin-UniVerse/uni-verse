---
name: bug-fix-assist
description: Use when the user gives a Notion bug task (and a branch) and wants the bug researched, reproduced on sandbox, fixed in logical commits, verified locally on localhost:3000, pushed safely through Grip, and optionally a PR opened and self-reviewed. Do NOT use for new features or for only reviewing a PR.
---

# Purpose & Triggers
End-to-end workflow for researching, reproducing, fixing, verifying, pushing, and opening PRs for bugs in `https://github.com/Karazin-UniVerse/uni-verse`.

**Example Prompts:**
- Minimal: `Fix /browser [З’їхав текст на відгуку](https://app.notion.com/p/405f8cf15c6180adaa4edcbf318acf4b?v=7ebf8cf15c61822fb1d4883482accce9&source=copy_link)`
- Full:
  `/browser review task - [Прибрати кнопку Створити можливість на вкладці каталог](https://app.notion.com/p/401f8cf15c61809dabe3ee6af729aaa0?v=3fbf8cf15c618067b7cf000c996ed671&source=copy_link)`
  `https://dev.universemvp.tech/wall - link where bug is`
  `https://app.notion.com/p/Environment-and-credentials-3cdf8cf15c6180cb8a81d7bc626de3e9 - env and accounts`
  `https://github.com/Karazin-UniVerse/uni-verse/tree/fix/BOP-58-delete-button - target branch`

# Global Rules
1. **Credentials Security:** Read test accounts at runtime from the Notion page "Environment and credentials" (`https://app.notion.com/p/Environment-and-credentials-3cdf8cf15c6180cb8a81d7bc626de3e9`) or the user's prompt. Those accounts are **Moodle accounts** used to log in on `https://dev.universemvp.tech` and locally. **NEVER** write or echo passwords/credentials into the skill file, implementation plan, chat replies, commits, or PR descriptions.
2. **Honest Reporting:** Follow all steps in strict sequential order. Modify only the files listed in the approved plan. **Report only verification checks that were actually run—never invent test counts or results.**
3. **Strict Git Safety:**
   - **NEVER** use `git push --force`, `git push --force-with-lease`, or `--no-verify`.
   - **NEVER** create new branches or push to `develop` or `main`. Push strictly to the user-specified target branch.
   - **NEVER** `--amend` or rebase commits that have already been pushed.
4. **Language Rule:** Write the implementation plan and chat replies in the **language of the user's prompt**. Write all git commit messages and the GitHub PR in **English** (keeping only the Notion task title in its original language inside the PR link).
5. **How to Execute `[/grill-me]` & Slash Command Fallbacks:**
   - Because IDE slash-commands cannot always be triggered programmatically by an LLM, every `/grill-me` step is a **MANDATORY HARD STOP**: invoke `/grill-me`, output the exact concise questions in chat, **IMMEDIATELY TERMINATE YOUR TURN**, and wait for the user's response.
   - Other fallbacks if a slash command is unavailable in the current environment: `/browser` = use the browser/Playwright/MCP tool; `/plan` = output the structured plan in Markdown; `/prhelper` = read and follow `.agents/skills/prhelper/SKILL.md` (or `.claude/skills/prhelper/SKILL.md`).

# Prerequisites (User's Responsibility — Skill Must NEVER Run These)
The user is responsible for running `pnpm run dev:select` (which configures `packages/uni-hub/.env.local`) and enrolling Grip via `pnpm grip:setup`.
- **NEVER** run `pnpm grip:setup`, edit `.env.local`, or answer the `dev:select` wizard yourself.
- If a prerequisite is missing or expired, **STOP immediately** and instruct the user which command to run in their terminal.

---

# Execution Workflow (Strict Sequential Order)

## Step 1: Input Validation & Missing Info Gate (HARD STOP #1)
Required inputs:
1. **Notion bug task link** (contains bug description and task code).
2. **Target GitHub branch** where the fix will be implemented (must not be `develop` or `main`).
3. **Optional inputs:** PRD document/context, specific URL where the bug occurs (if not in Notion).

**Branch Resolution & Stop Rule:**
- Do **NOT** blindly trust `git branch --show-current`. Only accept the current branch if the user explicitly named/confirmed it AND it is neither `develop` nor `main`.
- If the **Notion task link** or **Target GitHub branch** is missing or unconfirmed:
  1. **IMMEDIATELY STOP EXECUTION.** Do NOT inspect code or run tests yet.
  2. Invoke `/grill-me` and ask only for the missing items in one short message.
  3. **WAIT for the user's reply before proceeding to Step 2.**

## Step 2: Branch Prep, Task Analysis & Mandatory Sandbox Reproduction
1. **Read Notion Task & Credentials:**
   - Open the Notion task with `/browser`. (If Notion prompts for login, **STOP** and ask the user to log in). Extract the `Notion task code`, exact `Notion task title`, bug description, and target page URL.
   - Read the Moodle test credentials from the Notion "Environment and credentials" page at runtime (without printing passwords in chat).
2. **Prepare the Branch:**
   - Run `git fetch origin`, check out the confirmed target branch, and verify it is based on and up to date with `origin/develop`.
   - If the branch is not based on `develop`, is behind `origin/develop`, or has conflicts, **STOP** and ask the user via `/grill-me`.
3. **Inspect Codebase:** Inspect the relevant packages and files on the branch related to the task. (Do not run tests yet).
4. **Mandatory Sandbox Reproduction (`https://dev.universemvp.tech`):**
   - Open `https://dev.universemvp.tech` (the live `develop` sandbox) using `/browser` and log in with the Moodle account from Notion.
   - Navigate to the target page and reproduce the bug. Record the exact reproduction steps and observed broken behavior.
   - **If the bug cannot be reproduced on the sandbox:** **IMMEDIATELY STOP** and ask the user via `/grill-me` before proceeding.

## Step 3: PRD Alignment Check (HARD STOP IF CONTRADICTORY)
If a PRD was provided or referenced:
- Check whether fixing the bug contradicts the PRD requirements.
- **If the fix contradicts the PRD:**
  1. **Do NOT modify any files.**
  2. Generate the Implementation `/plan` (from Step 6) with an explicit section explaining **why the bug fix is contrary to the PRD and why the changes are unwanted**.
  3. Invoke `/grill-me` to ask the user how to proceed, **STOP EXECUTION**, and wait. (If the user explicitly overrides the PRD warning and tells you to proceed anyway, continue to Step 4).

## Step 4: Root-Cause Analysis (Causal Chain)
From Steps 2 and 3, determine the exact causal relationship of the bug: which specific files, components, styles, or handlers cause the issue and why.

## Step 5: Solution Design & Code Sketches
Design the fix and prepare code sketches for all files to be changed, based on Steps 2 and 4.

## Step 6: Implementation Plan & Approval Gate (HARD STOP #2)
Create the plan via `/plan` (in the language of the user's prompt) containing:
1. **Task, Scope & Requirements:** Summary of the Notion task, reproduction findings, PRD alignment (Step 3), and causal chain (Step 4).
2. **Base Code & Fix Sketches:** Existing code structure, proposed sketches, and explanation of changes (Steps 2 & 5).
3. **Commit Plan:** Divide the changes into logical commits on the target branch—one commit per logically connected change in file(s), with a short English commit message matching recent `git log` style.

**CRITICAL STOP RULE:**
- Send the plan to the user, **IMMEDIATELY STOP EXECUTION**, and **WAIT for explicit user approval** before modifying any files.

## Step 7: Implementation
Once approved:
- Implement the changes strictly in the approved order.
- Modify **only** the files listed in the approved plan.
- Create each planned logical commit locally (do not push yet).

## Step 8: Mandatory Local Verification & Self-Review
1. **Mandatory Local Browser Verification (`http://localhost:3000`):**
   - Check that `packages/uni-hub/.env.local` exists and contains `NEXT_PUBLIC_API_URL`. If missing, **STOP** and tell the user to run `pnpm run dev:select`.
   - Check if `http://localhost:3000` is already running; if not, start the app containing the bug in the background (e.g., `pnpm --filter @universe/uni-hub dev`; if unclear which app contains the bug, ask via `/grill-me`).
   - **Backend Rule:** Use the default remote `develop` API. Use a local backend **only** if the bug is in the API and **only** after asking via `/grill-me`.
   - Open `http://localhost:3000` with `/browser`, log in with the Moodle account, repeat the exact reproduction steps from Step 2.4, and confirm the bug is resolved.
   - Stop the background dev server once verified (`if we started it`).
2. **Self-Review Checklist:**
   - Verify `git diff origin/develop...HEAD` matches the approved plan with zero unrelated edits.
   - Run repo lint scripts (`pnpm lint` for Oxlint, and `pnpm lint:style` if styles changed).
   - Run typecheck and unit tests for the affected packages (`pnpm --filter <package> typecheck` and `pnpm --filter <package> test`). Do not run the entire monorepo test suite unless shared core packages were modified.
3. **Fixing Check Failures:**
   - If any check or local verification fails, fix the issue in a **new commit** (never `--amend` or rebase already-pushed commits) and repeat Step 8 until all checks pass.

## Step 9: Grip-Safe Push to Target Branch
1. Push the commits to the target branch using a plain `git push`.
2. **⚠️ CAUTION — GRIP PRE-PUSH POLL & TERMINAL BLOCKING:**
   - Grip may start an interactive poll in the console asking about the code changes before allowing the push to finish.
   - **If `git push` waits for interactive Grip input:** Immediately notify the user to answer the Grip poll in the console—or, if the agent's background terminal does not allow user typing, instruct the user to run `git push` directly in their own interactive terminal and let you know when done.
   - If the push fails due to a Grip authentication error or expired/retired gateway enrollment, **STOP** and ask the user to run `pnpm grip:setup`.
   - If the push is rejected because the branch is behind remote, **STOP** and ask the user via `/grill-me`.
   - **NEVER** use `git push --force`, `git push --force-with-lease`, or `--no-verify`.

## Step 10: Open PR Gate (HARD STOP #3)
After commits are pushed:
- **IMMEDIATELY STOP EXECUTION.**
- Invoke `/grill-me` and ask: **"Would you like me to open a Pull Request now using `prhelper`?"**
- **WAIT for the user's reply.**
  - If **No**: Skip Steps 11–15 and go to **Step 16 (Output)**.
  - If **Yes**: Proceed to **Step 11**.

## Step 11 & 12: Open PR via `prhelper`
- Invoke `/prhelper` by following `.agents/skills/prhelper/SKILL.md` (or `.claude/skills/prhelper/SKILL.md`).
- Pass the already-collected context directly to `prhelper`:
  - `base` = `develop`
  - `head` = target branch
  - `Notion task code`, exact `Notion task title`, and `Notion task link`
  - Exact lint, typecheck, and unit test results actually executed in Step 8.
- Ensure `prhelper` writes the body to `.pr_body.tmp.md`, creates the PR via `gh pr create ... --body-file .pr_body.tmp.md` (never inline `--body`), and deletes `.pr_body.tmp.md` immediately afterwards without committing it.
- Give the user the created PR link (`Opened PR: {link}`).

## Step 13: PR Self-Review Gate (HARD STOP #4)
After providing the PR link:
- **IMMEDIATELY STOP EXECUTION.**
- Invoke `/grill-me` and ask: **"Would you like me to run a self-review on the opened PR?"**
- **WAIT for the user's reply.**
  - If **No**: Skip Steps 14–15 and go to **Step 16 (Output)**.
  - If **Yes**: Proceed to **Step 14**.

## Step 14 & 15: PR Self-Review & Follow-up Fixes
1. Review the opened PR (checking diff, formatting, Oxlint, unit tests, and CI/quality checks); you may use `[/review-pr-comments](.agents/skills/review-pr-comments/SKILL.md)`.
2. If any errors or issues are found:
   - Fix them in a **new commit** on the target branch.
   - Repeat the verification checks from **Step 8** and push safely following the rules of **Step 9**.

## Step 16: Final Output
Output a clear summary containing:
1. **Implementation Plan**
2. **Description of What Was Done / Not Done** (reporting only checks actually run)
3. **If a PR was created:**
   `Opened PR: {Link to created PR}`
