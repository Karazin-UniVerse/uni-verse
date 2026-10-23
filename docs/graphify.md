# Graphify for local codebase navigation

Graphify turns the UniVerse codebase into a deterministic, locally queryable knowledge graph using tree-sitter AST parsing. It maps concepts, dependencies, call hierarchies, and cross-file relationships without using any LLM tokens or external cloud services.

## Core principles

- **Zero token cost (code-only)**: The AST extractor and community clustering run 100% locally with `--code-only` and `--no-label`. No embeddings, no vector databases, no remote API calls.
- **Local artifacts**: Extracted graphs (`graphify-out/`) are purely local and ignored by Git (`.gitignore` + `.graphifyignore`).
- **No CI overhead**: Graph generation is an on-demand developer tool, not a mandatory blocking CI step.

## Prerequisites

Python 3.10+ is required:

```bash
# Recommended installation via uv
uv tool install graphifyy

# Or via pip
pip install graphifyy
```

> **Note**: The official PyPI package name is `graphifyy` (double 'y'), while the executable command is `graphify`.

## Usage via npm scripts

We provide convenient wrapper scripts in `package.json` that automatically enforce offline, deterministic, zero-cost execution:

### 1. Extract / Build the graph

Parses TypeScript, TSX, JavaScript, and JSON files across the monorepo:

```bash
pnpm graphify:extract
```

Outputs are saved to `graphify-out/`:

- `graph.json` — Raw graph nodes, edges, communities, and degree statistics.
- `graph.html` — Interactive force-directed visualization (open in any browser).
- `GRAPH_REPORT.md` — God nodes, community groupings, and architectural hotspots.

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

## Exclusions & Configuration

The project root `.graphifyignore` excludes:

- Build artifacts (`.next/`, `dist/`, `.turbo/`, `coverage/`)
- Package managers (`node_modules/`)
- Binary media files and generated documentation
