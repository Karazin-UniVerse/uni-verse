# RS-213: local Grip checks with a team Gemini gateway

## Intent and scope

Replace the optional Sphinx integration in PR #285 with Grip 0.5.0. A local
Husky pre-push hook waits while the human answers a local browser whiteboard.
A module in the existing NestJS backend forwards the model calls to Gemini
3.5 Flash-Lite. The shared Gemini key never reaches collaborators' computers.
Only people with write access to Karazin-UniVerse/uni-verse may use the gateway.

The user requested both the gateway and local integration in the existing PR
branch, with the PR description updated to the repository template. This design
does not authorize deploying production, creating a GitHub OAuth app, setting
production secrets, or answering a human questionnaire automatically.

## Options and decision

1. **Authenticated gateway (selected):** central Gemini key, individual revocable
   gateway tokens, server-side repository authorization. Adds login and server
   configuration, but satisfies access restricted to the team.
2. Individual Gemini keys: least infrastructure, but does not provide the shared
   account the user requested.
3. A shared secret in each developer's environment: simpler but cannot revoke a
   person's access individually or establish GitHub membership. Not selected.

## Existing architecture

- Backend feature modules live at `packages/backend/<domain>/`; controllers are
  thin, external HTTP clients are injectable services, tests use Jest.
- Portal access-token authentication is global. Gateway routes must deliberately
  bypass portal JWT verification but use their own mandatory authentication;
  `@Public()` alone never authorizes a model call.
- PostgreSQL/Prisma already exists. Gateway sessions and quotas use that database,
  not per-process maps that reset on restart or diverge across server replicas.
- The backend remains available when its database is unavailable. The disabled
  gateway adds no startup network calls or required configuration. An enabled
  gateway fails closed when its dependencies are unavailable, without changing
  existing portal behavior.
- This branch has no saved Graphify graph. Navigation used focused source reads;
  extraction is not required for this change and was not run.

## Identity and access

Use a dedicated GitHub OAuth app with device flow enabled. Request no repository
write scope: GitHub is used only to establish the caller's identity. A local Node
setup command obtains the device/user codes directly from GitHub, prints the
verification URL and code, and polls at GitHub's returned interval. Handle
pending, slowdown, denial, expiration and interruption; never print bearer tokens.

After login, the helper sends the GitHub access token once, in an Authorization
header, to `POST /dev-tools/grip/sessions`. The backend calls GitHub `/user` to
establish the numeric identity and current login. A separate, server-only,
repository-scoped GitHub credential with Administration read permission checks
`/repos/{owner}/{repo}/collaborators/{login}/permission`. Accept write/admin base
permissions (maintain maps to write), not public read access or claimed usernames.
GitHub token and profile payloads are not stored or returned.

The gateway issues a cryptographically random token, returned only at creation.
Store its SHA-256 digest, GitHub user ID/login, creation/expiry and revocation
timestamps. Tokens expire after 30 days; `DELETE /dev-tools/grip/sessions/current`
revokes the current token. An operator can revoke a session by its database ID.
The helper stores the token outside the repository in the user's configuration
directory, attempts owner-only permissions on POSIX, and documents Windows ACL
inheritance rather than claiming Unix mode bits protect Windows files.

Every completion request authenticates the gateway token and checks current
repository permissions through GitHub. No long-lived permission cache: removal
from the repository prevents subsequent model calls, subject to GitHub's own
permission propagation. Invalid, expired or revoked tokens return 401; missing
write access returns 403; GitHub unavailability fails closed with a sanitized 503.
An ordinary portal JWT must not grant gateway access.

## Model endpoint

Expose `POST /dev-tools/grip/v1/chat/completions`, matching the request format
Grip's `openai` provider sends. The upstream URL is server configuration, never
request input; redirects are rejected. The only allowed model is the configured
`gemini-3.5-flash-lite`, with no paid/model/provider fallback.

Accept only the bounded non-streaming subset Grip 0.5.0 needs: text system/user
messages and `response_format` JSON schema. Reject unknown top-level fields,
tool execution, URLs for fetching content, streaming, malformed schemas and
oversized data. Preserve the schema contents required by Grip's board and grade
formats; use a route-local validation strategy, not a change to global portal DTO
validation. A model name does not establish that a request is genuinely a quiz;
the gateway is a restricted team model endpoint, not proof of quiz-only use.

Enforce 256 KiB request bytes before parsing for this route, 2 MiB upstream
response bytes, at most two messages with at most 200,000 combined UTF-8 bytes,
a 32 KiB serialized output schema, max output 8192 tokens and a 60-second upstream
deadline. Abort upstream work on client disconnect and release concurrency slots.
Enforce endpoint-specific body limits without changing the existing 10 MiB limits
on student routes. Return only the validated Chat Completions result fields Grip
consumes: choices/message/content and bounded usage metadata.

Do not relay provider errors verbatim. Map authentication errors to sanitized
gateway availability failures, quota errors to 429, timeout to 504, and malformed
or otherwise failed upstream responses to 502. Never report a provider failure as
a passing assessment.

## Quotas and production isolation

Use atomic database reservations before calling Gemini: per GitHub numeric user
ID (not per token) 10 model calls/minute and 100/day, and 500/day globally. Quota
days are UTC and failed attempts still consume reservations. Use expiring database
leases for a maximum of two concurrent model calls globally; expired leases recover
after process termination. Do not keep a database transaction open during network
requests. Rate and lease acquisition must work across multiple instances.

Also bound session exchanges to five/minute per source IP and 100/minute globally
using database reservations to prevent unauthenticated GitHub API abuse, with
explicit deployment proxy trust configuration; do not blindly trust
client X-Forwarded-For. Document that application quotas are not Google's free-tier
guarantee and that shared-process resource isolation is not a separate deployment.
The production module is disabled by default and has an operator kill switch.

No request-body, diff, rubric, answer, Authorization header, Gemini key or GitHub
token logging. Operational logging is limited to sanitized request IDs/status,
duration and usage totals. Neither gateway nor local setup publishes assessment
answers to GitHub/Notion. Free-tier Google data-use terms still apply.

## Configuration and deployment

Document all settings in the existing root `.env.example`: gateway enable flag,
Gemini key/model/base URL, GitHub OAuth client ID, repository owner/name, the
server membership-check credential and explicit trusted proxy configuration.
No real secrets or production-specific secret values are committed. Ask the
Project coordinator for private values. An absent/false enable flag disables
gateway routes (404). When enabled but required configuration is missing, the
gateway returns sanitized 503 responses without making upstream calls; portal
startup and existing routes remain available.

GitHub OAuth app registration/device-flow activation, permission-check credential,
production Gemini secret, deployment URL and deployment itself are manual operator
prerequisites. Merge into develop alone does not activate the service. For local
end-to-end testing the same module can run on loopback; use explicit local settings
without an authentication bypass or a separate production secret copy in Git.

## Local integration

- Pin the supported external tool to `grip-hook==0.5.0`; no frontend/application
  runtime dependency and no fork or vendored Grip source.
- A cross-platform Node setup/login helper stores per-user gateway URL and token
  outside the repository and never modifies global Git hooks, Git credentials or
  agent configuration. Require HTTPS except for explicit loopback development.
- A repository script reads local settings and launches the installed Grip command
  with provider `openai`, model `gemini-3.5-flash-lite`, the gateway base URL and
  the gateway token in its child environment. No secrets in arguments or output.
  Validate executable discovery on native Windows rather than relying on POSIX
  shebangs or interpolating command strings.
- `.husky/pre-push` calls the repository wrapper with Git's original arguments and
  forwards stdin. Never modify `.husky/_`, use `grip install --append`, or replace
  existing pre-commit behavior. Preserve previous hook rejection.
- Enable once through the helper. Developers who have not opted in see a concise
  setup notice and keep the existing optional policy. Once enabled, missing Grip,
  credentials or gateway errors fail the check instead of silently skipping.
- `.grip.toml` shares whiteboard mode, fail_open=false, require_tty=true, a pass
  mark of 70 and 24-hour remembered passes. Preserve the upstream generated-file
  exclusions while adding .env/private keys, generated agent mirrors, build
  output, local reports and schema clients. Document that path exclusions cannot
  remove secrets embedded in ordinary source or commit messages.
- CI intentionally has no interactive questionnaire. Document bypassability;
  local hooks are a learning aid, not an enforced security or merge gate.
- Remove Sphinx-specific files and links in the same PR, regenerate GEMINI.md from
  docs/ai changes, and provide `docs/grip.md` with setup, privacy and removal.

## Human interaction and known differences

The local browser receives the questionnaire, never the shared Gemini key.
Human answers stay outside the coding conversation. An agent must not answer,
automate a real questionnaire, read private assessment files, run duplicate pushes
or retry an interrupted push without an explicit human request.

Unlike Sphinx, passing Grip immediately releases the original push; there is no
separate Continue/Stop consent step. SSH/headless terminal fallback is not certified
by the Windows browser probe. A previous fake-provider test verifies transport,
not real model judgment. No claim of support in every editor/environment is made.

## Verification and acceptance

1. Unit tests for GitHub identity/permission checks, session hashing/revocation/
   expiry, quota boundaries and atomic reservation, request validation and upstream
   timeout/error/sanitization. No network model calls in automated tests.
2. HTTP tests using real Nest request parsing and global portal guard: unauthenticated
   and portal-only requests cannot reach Gemini; writer succeeds; read-only,
   revoked and expired users fail; route-specific byte limits are enforced.
3. Synthetic loopback fixtures exercise the real Grip executable through the local
   wrapper and real Husky, preserving stdin/arguments, hooks, nonzero exits,
   cancellation and opt-in/remove behavior. No automation of the user's quiz.
4. Run repository lint/style/typecheck/tests/build and changed-file formatting;
   record actual failures rather than inheriting earlier Sphinx verification.
5. Human smoke: local backend + real GitHub login + local Grip + Gemini; before
   sending actual committed source confirm exclusions and human consent, start
   one push, and wait while the user answers. Verify remote commit after completion.
6. Update PR #285 description using `.github/PULL_REQUEST_TEMPLATE.md`, retaining
   the RS-213 Notion task link, naming Grip/gateway instead of Sphinx, and listing
   tested behavior, setup prerequisites and remaining manual deployment checks.

## Review gate

This is a proposed written design, not completed implementation. User review of
this file is required before writing the implementation plan. The plan must then
be reviewed before implementation begins.
