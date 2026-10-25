# Sphinx: browser checks before pushing

[Sphinx](https://github.com/parthh01/sphinx) asks the **human developer** questions
about a committed change before letting a local `git push` continue. UniVerse
uses its Git-only workflow: no OpenCode/Claude Code/Antigravity plugin, MCP server,
commit questionnaire, CI questionnaire or application dependency.

The tracked files share policy; they **do not install hooks**. Each developer
opts in manually. Only pushes made through a Git installation with the hook
configured are covered. A different Git environment, a web merge or a hosted
agent is not covered automatically. This is a learning aid, not a security gate
or proof of unaided understanding.

## Compatibility and rollout

- **macOS/Linux/WSL:** the upstream `sphinx-understand@0.1.19` Git-only workflow
  is available. Use Node.js **22.19+** and Git.
- **Native Windows:** requires the separate Windows Git-only patch described in
  this PR. Upstream **0.1.19 rejects native Windows installation**. Do not remove
  that guard by hand: its hook dispatcher also needs a fix to preserve existing
  shell hooks such as Husky. Until a reviewed Windows-capable version is released,
  use WSL with Git, Node and Sphinx all running inside WSL.
- **Coding agents:** the browser checkpoint is independent of the coding model.
  Claude Code, OpenCode V2 and Antigravity need no native Sphinx integration when
  their push uses the configured Git. Editor-specific shell timeouts still apply;
  native Windows editor sessions have not been certified end to end.

The Windows patch is intentionally limited to Git for Windows, browser input and
an HTTP reviewer. Native agent plugins, desktop terminal launching and reviewer
CLIs installed as `.cmd` shims are outside its scope.

## Install without changing global Git hooks

Run these commands yourself in a terminal. On Windows use WSL until the Windows
patch is released. If you already have Sphinx installed, inspect your settings
before changing its machine-wide reviewer or interface.

```sh
npm install --global sphinx-understand@0.1.19
sphinx --version
```

Installing the npm package does not activate Git hooks. **Do not run the guided
`sphinx install`** for this setup: it changes global `core.hooksPath` and may add
agent integrations. The repository-only command below chains this repository's
existing hooks, including Husky, without configuring plugins or global Git hooks.

### Choose your own reviewer

The reviewer is separate from your coding agent. Sphinx does not inherit your
OpenCode or Antigravity model, subscription or conversation. Choose a provider
you are authorized to send source code to, and set its spending limits.

For an OpenAI-compatible HTTP endpoint, replace the example URL and model with
your provider's actual values:

```sh
sphinx auth --provider openai --base-url https://api.openai.com/v1
sphinx config --provider openai --model gpt-5-mini
```

The endpoint must support tool calls and JSON-schema output. `auth` prompts for
your personal key; never paste it into project files or agent chat.

Alternatively, configure OpenRouter:

```sh
sphinx auth
sphinx config --preset openrouter-free
```

Even free OpenRouter routes require a personal key and have rate limits. Sphinx
does not silently switch to a paid route. No shared team account is required.

### Enable this checkout

From the UniVerse repository root:

```sh
sphinx config --interface browser
sphinx config --max-model-calls 30
sphinx install --repo
sphinx status
```

The interface, reviewer and request cap are personal, machine-wide Sphinx settings;
the hook installation above changes only this repository's `core.hooksPath`.
The cap limits requests, not money. `pnpm install` may reapply Husky's hook path;
check `sphinx status` and rerun `sphinx install --repo` afterwards if coverage was
replaced. Reinstallation must preserve the existing hook chain.

`sphinx doctor` also checks global installation, so a repository-only setup can
report global hooks as missing. Do not install global hooks just to clear that
diagnostic. Use `sphinx status` to inspect this repository's policy and coverage.

No `sphinx init` is needed: `.sphinxconfig`, `.sphinxignore` and
`.sphinxcontext.md` are already committed.

## What happens on push

```sh
git push
```

1. Existing Git hooks still run. A rejection from them must stop the operation.
2. Sphinx checks pushes to **all branches and remotes**, including PR branches.
   Documentation-only changes can pass without a questionnaire. Tag-only pushes
   and branch deletions are not assessed by Sphinx 0.1.
3. For a check, Git waits and prints a `http://127.0.0.1:<port>/<token>` address.
   macOS can open a background tab; elsewhere open that address yourself.
4. Answer directly in the browser. After passing, choose **Continue push** to
   release the **same waiting push**, or **Stop push** to keep it from going through.

There are no questionnaires on commit, and `backgroundPreparation: false`
disables background review after commits/checkouts. GitHub statuses, comments
and answer publishing are disabled by this repository's policy.

## Pause, timeout and coding agents

Closing a tab does not stop Git. Use **Stop push** in the questionnaire to stop
the waiting operation; progress is saved. A saved pass still requires a choice
to continue when the stopped push is retried.

Sphinx waits up to 25 minutes, but an editor or agent shell can time out sooner.
If that happens, verify the original Git process has exited before starting
another push. Reopen the check by retrying only when the human asks. Never run
duplicate pushes, automatically skip a checkpoint, or treat a saved pass as
permission to retry after the human chose Stop.

Agents must not open or automate the questionnaire, answer on behalf of the
human, relay answers through chat, or read private Sphinx assessment files.
The human may inspect code while answering. In SSH/WSL remote setups, forward
the printed loopback port if necessary; keep the URL unchanged and private.

## Privacy and cost

The configured reviewer receives permitted committed source/diffs, related
evidence, your answers and `.sphinxcontext.md`. These do not go to a Sphinx-hosted
service, but they **do leave your machine** when you use a remote provider.
Review `.sphinxignore` and your provider's retention policy before enabling checks.

Sphinx excludes `.env`, common credential files and private keys by default.
Our additional exclusions remove generated artifacts and agent mirrors. Path
filters cannot catch secrets embedded in an ordinary source file. Credentials
and local assessment state belong in Sphinx's user directory, not this repository
or application `.env` files. Ask the Project coordinator about private values
and approved providers.

The browser URL contains a local access token. Do not post it, answers or private
assessment state to GitHub or Notion. Provider failures leave the check pending;
they do not count as passing. No real provider requests run during installation
verification or automated fixture tests.

## Remove the repository hook

From the same repository:

```sh
sphinx uninstall --repo
```

This restores the prior hook-path setting when Sphinx still owns it and preserves
later user edits. It does not remove personal Sphinx credentials or assessments.

## Verification evidence

The separate Windows patch tests the production CLI, a real `git push` to a local
bare remote, a loopback HTTP reviewer, browser consent, pause/resume, held passes,
ignored secrets, prior-hook rejection and uninstall. Model responses are synthetic;
this proves transport and Git lifecycle, not model judgment or provider login.

A disposable Chrome test also exercised answer submission, page reload and
Continue/Stop. The full upstream suite is not yet green on native Windows;
the focused workflow is the supported scope of the proposed patch, not a claim
of complete Windows parity. Real reviewer authentication and editor-specific
shell lifetimes require a human smoke test before broad rollout.
