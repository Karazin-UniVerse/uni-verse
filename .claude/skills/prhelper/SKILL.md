---
name: prhelper
description: Automates creating a GitHub Pull Request using .github/pull_request_template.md. Triggers when the user or another skill invokes /prhelper (or [/prhelper.md]) or asks to "open/create a PR/pull request". Do NOT trigger for reviewing PRs or general PR questions.
---

# Purpose & Triggers
Creates a formatted GitHub Pull Request for the work completed in the current session.
Triggers when:
1. Direct invocation by user or another skill: `[/prhelper.md]`, `/prhelper`, e.g., `[/prhelper.md] Open/create PR/pull request.`
2. Keyword match in a single prompt: `{create, open, make}` + `{PR, pull request}`, e.g., `"Now from what we have done open PR"` or `"Now create me a pull request"`.

# Execution Workflow (Strict Sequential Order)

## Step 1: Lightweight Context & Git Inspection (DO NOT RUN TESTS YET)
1. **Analyze Conversation & Plan:** Review the current session history, implementation plan (if stated), Notion task details, and any verification checks (`pnpm test`, `pnpm lint`, `pnpm typecheck`) that were *already* executed in this conversation. **Do NOT execute new test/lint runs during Step 1.**
2. **Inspect Git State Automatically:**
   - Run `git status` and `git branch --show-current` to identify the active branch.
   - Run `git remote get-url origin` to identify the repository.
   - Run `git log origin/develop..HEAD --oneline` and `git diff origin/develop...HEAD` to inspect all commits and code changes.
   - Read `.github/pull_request_template.md` from the repository root (use the Fallback Template below only if the file is missing).

## Step 2: Missing Information Gate (MANDATORY HARD STOP)
Required fields:
- `Notion task code` (e.g., `BOP-69`, `OP-241`) — try to extract from conversation or branch name first, but **never guess**.
- `Notion task link` (full `https://...notion...` URL).
- `Notion task title` (exact original title from Notion).
- `GitHub branch with commits` (if cannot be resolved from local git state).

**CRITICAL STOP RULE:**
If ANY required field (such as `Notion task link` or `Notion task title`) is missing:
1. **IMMEDIATELY STOP EXECUTION.**
2. **DO NOT** run `pnpm lint`, `pnpm typecheck`, or `pnpm test` yet.
3. **DO NOT** generate a placeholder PR draft yet.
4. Flag the missing fields as `not stated` and immediately invoke `/grill-me` (or ask the user directly in a short, focused message if `/grill-me` cannot be triggered programmatically) to request ONLY the missing values.
5. **WAIT for the user's reply before proceeding to Step 3.**

## Step 3: Base Branch & Stash/Stacked PR Check (MANDATORY HARD STOP IF NOT DEVELOP)
1. Fetch latest remote refs (`git fetch origin develop`) and verify whether the current branch was branched directly off `origin/develop` or off another unmerged feature branch.
2. **If branched directly off `develop`:** Set target base branch = `develop` and proceed to Step 4.
3. **If NOT based directly on `develop` (another parent branch detected):**
   - **IMMEDIATELY STOP EXECUTION.**
   - Invoke `/grill-me` (or ask directly in chat) to confirm with the user:
     - Is this a **stash / stacked PR**?
     - Which target base branch should the PR point to (the parent feature branch or `develop`)?
     - Should it be opened as a Draft PR?
   - **WAIT for confirmation before proceeding to Step 4.**

## Step 4: Format PR Title & Body

### Language Rule
Write the PR Title and Body in **English**. Keep the Notion task title inside the markdown link in its **exact original language** (e.g., Ukrainian or English) as written in Notion.

### PR Title Format
`{Notion task code}: {small description of changes}`
- Lowercase description after the colon, imperative mood, concise (~50–70 chars).
- **Example:** `BOP-69: align ContactTags text vertically with icons`

### PR Body Rules (`.github/pull_request_template.md`)
1. **Notion Task:** Must be at the very top:
   `- Link: [{Notion task code}: {Notion Task Title}]({Notion task link})`
2. **Description:**
   - Opening summary sentence explaining the root cause and fix/feature.
   - `### Key Changes`: Bulleted breakdown per modified file with exact class/component/test details.
   - `### Review Considerations & Verification`: Exact commands and results for Unit Tests, Linters, and Typecheck run during the session. **CRITICAL:** Never invent test counts or results; if a check was not run, either run it now (only after Steps 2 & 3 are resolved) or explicitly state `not run`.
   - `### Screenshots / Video`: Keep the HTML comment `<!-- Required for visual UI changes: attach or link screenshots/video. Otherwise write N/A. -->` for UI/visual tasks so the user can attach media, or write `N/A` for non-visual tasks.
3. **Type of Change:** Check `[x]` for all applicable categories (`feat`, `fix`, `style`, `refactor`, `chore`). Multiple selections are allowed.
4. **Pre-merge Checklist:** Check `[x] I have conducted a self-review of my code and verified the diff` ONLY after verifying `git diff`.

### Fallback Template
```markdown
## Notion Task

- Link: [TR-XXX: Task Name](https://www.notion.so/...)

<!-- Replace placeholders with the real task code/link. Include the code in the PR title. -->

## Description

<!-- Explain the actual changes, review considerations and checks run or not run. -->

-

### Screenshots / Video

<!-- Required for visual UI changes: attach or link screenshots/video. Otherwise write N/A. -->

## Type of Change

- [ ] `feat`: new feature
- [ ] `fix`: bug fix
- [ ] `style`: UI / styling changes
- [ ] `refactor`: code optimization / refactoring
- [ ] `chore`: dependencies, CI/CD, or documentation update

## Pre-merge Checklist

- [ ] I have conducted a self-review of my code and verified the diff
```

### Reference Example (Gold Standard Output)
**Title:**
`BOP-69: align ContactTags text vertically with icons`

**Body:**
```markdown
## Notion Task

- Link: [BOP-69: З’їхав текст на відгуку](https://app.notion.com/p/405f8cf15c6180adaa4edcbf318acf4b?v=7ebf8cf15c61822fb1d4883482accce9&source=copy_link)

## Description

Fixes the vertical optical alignment of contact text inside `ContactTags` pills where email and phone/handle strings sat visually lower than the adjacent centered 12×12px icons.

### Key Changes
- **`ContactTags.module.scss`**:
  - Increased `.contactTag` line-height from `1` to `1.25` for optical alignment.
  - Added `.contactText` class with `min-width: 0`, `overflow-wrap: anywhere`, and `line-height: inherit`.
- **`ContactTags.tsx`**:
  - Wrapped `{email}` and `{contact}` text nodes in dedicated `<span className={styles.contactText}>` elements.
- **`ContactTags.test.tsx`**:
  - Added unit test asserting that contact text is wrapped within the span without regressions to titles or accessibility attributes.

### Review Considerations & Verification
- **Unit Tests:** `pnpm --filter @universe/ui test ContactTags` (12/12 passed) & `pnpm --filter @universe/uni-hub test ApplicantsModal` (12/12 passed).
- **Linters:** `pnpm lint` and `pnpm lint:style` (0 errors, 0 warnings).
- **Typecheck:** `pnpm --filter @universe/ui typecheck` (clean exit code 0).

### Screenshots / Video

<!-- Required for visual UI changes: attach or link screenshots/video. Otherwise write N/A. -->

## Type of Change

- [ ] `feat`: new feature
- [x] `fix`: bug fix
- [x] `style`: UI / styling changes
- [ ] `refactor`: code optimization / refactoring
- [ ] `chore`: dependencies, CI/CD, or documentation update

## Pre-merge Checklist

- [x] I have conducted a self-review of my code and verified the diff
```

## Step 5: Push Verification & PR Creation (Strictly via `--body-file`)
1. Ensure the local branch is pushed to `origin` (`git status -sb`). If unpushed commits or uncommitted changes exist, ask the user before committing or pushing. **Never force-push or merge.**
2. **STRICT RULE — NEVER use inline `--body "..."`:** Passing multi-line Markdown with backticks via CLI strings in PowerShell/cmd/bash corrupts formatting and interprets `\t`, `\f`, `\b`, `\a` as control characters.
3. Write the formatted PR body to a temporary UTF-8 file named `.pr_body.tmp.md` using your native file-writing tool (never via shell `echo`).
4. Create the Pull Request using `--body-file`:
   ```bash
   gh pr create --base <base_branch> --head <current_branch> --title "<title>" --body-file .pr_body.tmp.md
   ```
   *(If `gh` CLI is unavailable or unauthenticated, use the configured GitHub MCP tool).*
5. Immediately delete `.pr_body.tmp.md` after the PR is created (ensure it is never committed to git).
6. Verify the created PR body via `gh pr view --json body` to confirm Markdown backticks, headers, and checkboxes rendered cleanly.

## Step 6: Output Format
Output strictly one final line containing the created PR URL:
`Opened PR: {Link to created PR}`

**Example:**
`Opened PR: https://github.com/Karazin-UniVerse/uni-verse/pull/325`
