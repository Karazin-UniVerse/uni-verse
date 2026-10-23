# Graphify for local codebase navigation

Graphify builds a local structural graph of UniVerse code using tree-sitter AST parsing. Use it to locate symbols and explore imports and relationships before inspecting the relevant source. It complements Context7 (external library documentation), not replaces it.

## Core principles

- **Code-only analysis**: The documented extraction uses `--code-only`, followed by local clustering with `--no-label`. These steps do not need model credentials. Your coding agent's own reasoning still consumes its normal token budget; no measured token-saving percentage is promised.
- **Local artifacts**: Extracted graphs (`graphify-out/`) are purely local and ignored by Git (`.gitignore` + `.graphifyignore`).
- **No CI overhead**: Graph generation is an on-demand developer tool, not a mandatory blocking CI step.

## Prerequisites

Install Python 3.10+ and the repository's Node.js/pnpm prerequisites. The tested Graphify release is `0.9.94`. Choose one installation method:

```bash
# Recommended installation via uv
uv tool install graphifyy==0.9.94

# Or use an isolated project virtual environment (Windows PowerShell)
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install graphifyy==0.9.94

# Linux/macOS alternative
python3 -m venv .venv
.venv/bin/python -m pip install graphifyy==0.9.94
```

> **Note**: The official PyPI package name is `graphifyy` (double 'y'), while the executable command is `graphify`.

The wrapper checks `.venv/Scripts/graphify.exe`, then `.venv/bin/graphify`, then `graphify` in PATH. `.venv/` is ignored by Git and Graphify. No account, API key or OAuth sign-in is required for this local workflow. Package installation downloads dependencies; it is not an offline operation.

## Agent setup, including Antigravity

The repository provides `.agents/skills/graphify/SKILL.md`; the normal `pnpm skills:sync` command mirrors it into `.claude/skills/graphify/`. Do not edit the mirror. No upstream `graphify install` command is needed: that installer can write agent instructions and hooks outside this agreed setup.

- **Antigravity**: open UniVerse as the workspace root and start a new conversation or reload workspace skills. It discovers `.agents/skills/graphify/`. Invoke `/graphify` where supported, or explicitly ask it to read that skill and use the local pnpm commands. Review terminal command approvals normally. There is no MCP entry, Cloud connection or Antigravity-global configuration to install.
- **Claude Code**: use the synchronized `.claude/skills/graphify/` skill and `/graphify` in a new session.
- **OpenCode / other skill-aware clients**: load the repository's `graphify` workspace skill. If your client does not discover it, explicitly reference `.agents/skills/graphify/SKILL.md`; the terminal commands below work independently of skill discovery.
- **Gemini CLI**: reference the shared skill explicitly if it is not discovered by your installed version. `GEMINI.md` points to this guide; do not overwrite that generated file with upstream installers.

Example prompt for any agent:

```text
Read .agents/skills/graphify/SKILL.md. Use the existing local graph to locate
OpportunitiesService and its PrismaService relationship, then verify the returned
source references. Do not rebuild unless the graph is missing or stale.
```

Successful setup means the agent uses a bounded local query and verifies source references. Having a skill file alone does not prove it was loaded. Antigravity UI behavior must be checked in your own installed client; terminal smoke tests do not validate its UI.

## Usage via npm scripts

Run the documented pnpm commands from the repository root. Do not use the generic wrapper to invoke semantic backends, external ingestion, installers or hooks; it is not a security sandbox for arbitrary upstream commands.

### 1. Extract / Build the graph

Parses TypeScript, TSX, JavaScript, and JSON files across the monorepo:

```bash
pnpm graphify:extract
```

Outputs are saved to `graphify-out/`:

- `graph.json` — Raw graph nodes, edges, communities, and degree statistics.
- `graph.html` — Interactive force-directed visualization (open in any browser).
- `GRAPH_REPORT.md` — God nodes, community groupings, and architectural hotspots.

The command performs code extraction and `cluster-only . --no-label`. Large graphs may be displayed as an aggregated community view. Inspect extraction warnings: unsupported files, missing optional grammars and files yielding no symbols mean the graph is incomplete, not that all source has been indexed. SCSS, Prisma schemas and document/media semantics are not guaranteed by this baseline; SQL needs an optional grammar that is not installed here.

The wrapper keeps extraction output at the repository root and rejects `--out` / `--output` before starting extraction, so clustering cannot accidentally read an older graph. Use the upstream CLI directly for custom-output workflows. Query commands can pass `--graph <path>` (or `--graph=<path>`); Graphify validates that explicit path rather than the wrapper requiring the default graph.

### Refresh after changes

Run `pnpm graphify:extract` again after changing source, switching branches or pulling updates. Graphify uses its manifest/cache to avoid re-extracting unchanged files. Confirm the summary and file timestamps before querying. Do not add `--force` merely to silence a smaller-graph warning; inspect whether deleted or newly excluded files explain it.

### 2. Query the graph

Ask structural questions against the existing graph without re-reading source files:

```bash
# General query
pnpm graphify:query "how does opportunities moderation work"

# Trace relationships between two entities
pnpm graphify path "OpportunitiesService" "PrismaService"

# Explain a specific component or service
pnpm graphify explain "OpportunityDetailContent"

# Inspect top architectural hubs
pnpm graphify god-nodes
```

For broad results, prefer a smaller explicit budget, for example `pnpm graphify:query "OpportunitiesService" --budget 1500`. The graph is evidence for navigation, not a runtime trace or authorization audit. Follow the returned `source_file`/line references and read the actual code. Refresh or use focused grep/read when a query is empty; ambiguity is not permission to choose a similarly named symbol silently.

## Troubleshooting and privacy

- **Executable missing**: install the pinned package into `.venv`, or ensure an isolated tool installation exposes `graphify` in PATH. Restart the agent if its terminal inherited an older PATH.
- **Graph missing**: run `pnpm graphify:extract` with permission. Inspect errors and exit status before assuming outputs are usable.
- **Unsupported/missing files**: check `.graphifyignore` and extraction warnings. Do not claim complete styling, schema or dynamic-call coverage.
- **Cost and credentials**: no model keys are needed. Do not enable model backends, community labeling, Cloud, semantic extraction, automatic git hooks or CI generation as a workaround. The wrapper's limited environment filtering is not a blanket guarantee against arbitrary upstream commands or separately configured providers.
- **Sensitive output**: the graph contains source identifiers, relationships and local metadata. Keep `graphify-out/` and `.venv/` local; do not upload them to Notion or commit them. Only the usage guide is shared. Review third-party visualizations before opening them if network isolation is required.

## Exclusions & Configuration

The project root `.graphifyignore` excludes:

- Build artifacts (`.next/`, `dist/`, `.turbo/`, `coverage/`)
- Package managers (`node_modules/`)
- Binary media files and generated documentation

## Verification and sources

Run `pnpm test:graphify` for portable executable-selection coverage, then build the graph and verify a query/path against real source. Tests do not install Graphify or validate Antigravity UI discovery. No hooks, MCP server or CI job are added by this integration.

- [Graphify source, current v8 branch](https://github.com/Graphify-Labs/graphify/tree/v8)
- [Extraction](https://docs.graphify.com/reference/extract)
- [Incremental updates](https://docs.graphify.com/guides/incremental-updates)
- [Queries](https://docs.graphify.com/reference/query)
- [Antigravity workspace skills](https://antigravity.google/docs/skills/)
