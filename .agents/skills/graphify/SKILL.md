---
name: graphify
description: >-
  Use for local UniVerse codebase navigation with Graphify: locating symbols,
  tracing dependencies or call relationships, and refreshing the saved code-only
  graph. Triggers on Graphify, graph queries, dependency paths, and architecture
  exploration. Not for external library documentation (use Context7) or proving
  runtime behavior.
---

# Local Graphify navigation

Read `docs/graphify.md` from the repository root for installation, supported inputs and limitations. This workspace skill also works in Antigravity; it does not require a Graphify MCP connection or account.

1. Run commands from the repository root. If Graphify is missing, explain the documented installation options; do not install or upgrade tools without permission.
2. Check whether `graphify-out/graph.json` exists. If missing or stale after source edits, branch switches or pulls, ask to run `pnpm graphify:extract`. Do not rebuild for every question.
3. Use a concrete symbol and a bounded query first:

   ```bash
   pnpm graphify:query "OpportunitiesService" --budget 1500
   pnpm graphify explain "OpportunitiesService"
   pnpm graphify path "OpportunitiesService" "PrismaService"
   ```

4. Follow the returned source references and inspect the relevant code before making a claim or edit. A graph edge is structural evidence, not proof of runtime calls, permissions or correctness. Narrow truncated queries; report missing and ambiguous matches rather than inventing relationships.
5. When graph access fails, report the limitation and use focused source searches. Do not read the entire graph JSON or large report into context by default.

Use only the documented local extraction/query path. Do not run upstream `graphify install`, install git hooks, start watch/MCP servers, connect Cloud, index documents/media with a model, or generate semantic labels. Those are separate opt-in workflows and can change agent configuration or spend model tokens. The agent's own reasoning still consumes its normal model budget.
