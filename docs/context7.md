# Context7 for coding agents

Context7 supplies documentation and code examples for public libraries such as React, Next.js, NestJS, Prisma and TanStack Query. It complements this repository's instructions and installed-package documentation; it is not part of the application, build or CI.

## Personal sign-in

The committed configurations use the hosted Streamable HTTP endpoint `https://mcp.context7.com/mcp/oauth`. Each developer authorizes their own Context7 account in their MCP client. The repository contains no API keys, shared accounts or OAuth tokens. No Context7 package installation or `.env` change is needed.

The [Free plan](https://context7.com/plans) supports OAuth and public-library lookups with a limited quota. Check the current plan and your account's usage rather than assuming unlimited access. A paid subscription and private-source indexing are not required for this setup.

Open your agent from the repository root and use the matching instructions below. Project/workspace trust and MCP-server approval are separate from signing into Context7; accept them only after reviewing the endpoint. Do not enable blanket tool auto-approval.

| Client      | Shared configuration                                 | Personal authentication                                                                                  |
| ----------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| OpenCode V2 | `opencode.json`, under `mcp.servers.context7`        | Run `opencode mcp list`. If Context7 needs authentication, open `/mcps`, select `context7`, and sign in. |
| Claude Code | `.mcp.json`, under `mcpServers.context7`             | Approve the project server when prompted; open `/mcp`, select `context7`, and choose Authenticate.       |
| Gemini CLI  | `.gemini/settings.json`, under `mcpServers.context7` | Open `/mcp`, then run `/mcp auth context7` to sign in.                                                   |

Restart or reconnect the client if it was already running when the configuration changed. Authentication is client-local, not shared between tools or developers. A newly cloned repository does not sign you in automatically, and a saved configuration alone does not prove the server is connected. Do not copy client credential files into the repository.

Antigravity uses its own MCP configuration, not Gemini CLI's `settings.json`. Its users can add the same OAuth endpoint in their personal MCP settings following the [Antigravity MCP guide](https://antigravity.google/docs/mcp/). This PR does not modify Antigravity's global configuration.

## Verify the connection

1. Confirm the client reports Context7 as connected, not merely configured or awaiting authentication.
2. Check that it exposes `resolve-library-id` and `query-docs` (the client may namespace these names).
3. Ask a generic documentation question, for example:

   ```text
   Use Context7 to explain TanStack Query v5 query invalidation after a mutation.
   Resolve the official library first and state the documentation version used.
   ```

4. Verify that the agent actually called the tools and received relevant documentation. This is a documentation lookup, not a request to change application code.

After resolving a library, use its returned ID with `query-docs`; use a versioned ID only if it is actually listed. Check versions in the relevant workspace's `package.json` and lockfile before applying examples. For Next.js, continue reading the installed `next/dist/docs/` guides required by `packages/uni-hub/AGENTS.md` first.

## Privacy and unavailable access

The [shared documentation rules](ai/quality.md#external-library-documentation) govern what to send and how to use results. Context7 receives the tool's lookup query and library identifier plus connection/client metadata. Its [privacy documentation](https://context7.com/docs/security/data-privacy) describes query retention and third-party reranking. Do not put application source, user information, credentials or internal diagnostics in a query; this integration does not require indexing UniVerse or connecting GitHub/Notion accounts.

If the server is unavailable, sign-in is incomplete, the quota is exhausted or the installed version is missing from the index, state that limitation and consult official/local documentation. Do not claim an authenticated lookup succeeded merely because the unauthenticated endpoint responded. Do not add a shared key, buy a subscription or weaken permissions to work around a failure.

To stop using Context7, disconnect/disable it in your client's MCP manager. To withdraw authorization, use the client's sign-out/clear-authentication controls and review your Context7 account's authorized access. Keep personal credentials outside version control.

## Sources

- [Context7 overview](https://context7.com/docs/overview)
- [Context7 OAuth](https://context7.com/docs/howto/oauth)
- [Context7 privacy](https://context7.com/docs/security/data-privacy)
- [Context7 plans](https://context7.com/plans)
- [OpenCode V2 MCP configuration](https://opencode.ai/v2/docs/mcp-servers)
- [Claude Code MCP configuration](https://code.claude.com/docs/en/mcp)
- [Gemini CLI MCP configuration](https://geminicli.com/docs/tools/mcp-server/)
