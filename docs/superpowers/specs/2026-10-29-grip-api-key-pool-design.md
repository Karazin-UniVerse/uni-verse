# Grip Gemini API key pool

## Intent and approval boundary

Reduce failed team Grip checks by distributing model requests across server-only
Gemini API keys and making one bounded failover attempt after a transient failure.
The user will provision another key and configure the production environment.
The user approved this approach and an isolated worktree in chat.

The user approved this written design in chat and requested a PR. Write an
implementation plan and agree its execution method before changing product code.
Branch publication and PR creation are authorized after verification; deployment,
production secret changes, and automating the human Grip assessment are not.

## Evidence and current behavior

- `GeminiClientService` forwards one non-streaming request with one configured
  key. A non-success upstream status other than 401, 403, or 429 becomes the
  sanitized `502 Upstream model error` response.
- The supplied failing push contains that exact response. This establishes the
  gateway error path, but not the original provider status or its cause. Provider
  overload is a hypothesis, not a verified diagnosis.
- The existing upstream deadline is 60 seconds. The gateway permits two concurrent
  logical completions globally and applies database-backed user/global quotas.
- Tests now live in `packages/backend/grip/tests/`; local launcher tests live in
  `scripts/grip/tests/`.
- Google's [rate-limit documentation](https://ai.google.dev/gemini-api/docs/rate-limits)
  states that quotas are per project, not per API key. Additional keys within the
  same project do not add quota. Separate projects still share provider failure
  domains; this feature does not guarantee recovery from a Gemini outage.

## Options and decision

1. **Key pool at the existing gateway (selected):** least-active selection,
   round-robin tie breaking, temporary cooldowns, and one failover. Keeps secrets
   on the server and preserves the local client protocol.
2. Primary/backup keys only: simpler, but does not distribute healthy requests as
   requested.
3. Independent providers/endpoints: better outage isolation, but requires additional
   model, compatibility, privacy, and cost decisions. Outside this change.

## Configuration and rollout

Replace `GEMINI_API_KEY` with the single canonical variable `GEMINI_API_KEYS`:

```env
GEMINI_API_KEYS="first-key,second-key"
```

- Parse a comma-separated list and trim each entry. Support one or more keys.
- Reject missing/blank lists, empty entries, duplicate keys, and whitespace inside
  a key with a sanitized configuration error. Never include supplied values in an
  error message. Disabled gateway configuration continues to require no keys.
- Change `GripConfig.geminiApiKey` to `geminiApiKeys` and update all active callers
  and test fixtures. No legacy env fallback or compatibility alias.
- Update `.env.example` and `docs/grip.md` in the implementation commit. Historical
  specs/plans remain records of their original designs, not active config guides.
- The local launcher continues to use only its gateway token. Strip the new pool
  variable from its child environment; retain stripping of the old secret name as
  an explicit secret-hygiene measure, not as a supported configuration option.
- Operators must migrate the existing key into the new list before deploying the
  new backend, then restart/redeploy to load configuration. Rollback requires
  restoring the old environment variable for the old binary. Do not read, edit,
  print, or commit actual secret values during implementation.

## Placement and state

Keep HTTP transport, response validation, retry classification, and safe attempt
logging inside the existing injectable `GeminiClientService`. Add a focused
module-local key-pool implementation only to own shared selection state and
cooldown bookkeeping; it must not become a generic provider framework.

Initialize pool state once per service instance after configuration is required,
not on every request. Each configured key has an active-attempt count and an
available-after timestamp. Maintain a rotating selection cursor. State is local
to one backend process and resets on restart; do not claim globally coordinated
per-key balancing across replicas. Existing database-backed team quotas and
concurrency enforcement remain unchanged.

Selection must synchronously reserve an eligible key before the first await:

1. Exclude keys still cooling down and keys already attempted for this completion.
2. Choose the eligible key with the fewest active attempts.
3. Break ties by scanning from the rotating cursor, then advance the cursor.
4. Release the active count in `finally`, after reading or cancelling the body,
   on success, error, deadline, and client cancellation.

If every key is cooling down before the first attempt, fail promptly with a
sanitized 503 rather than waiting or bypassing cooldown. If no untried eligible
key exists after a failed attempt, return that attempt's sanitized error.

## Attempts, cooldown, and deadline

- At most two sequential upstream attempts per logical completion; never hedge
  or send parallel duplicate requests. Never retry with the same key. One-key
  deployments therefore make exactly one attempt.
- Retry only network/response-read transport failures and upstream HTTP 429, 500,
  502, 503, and 504. Distinguish these using the original upstream status or a
  typed internal failure category, not the public mapped status alone.
- Do not retry upstream 400/401/403/404 or other non-retryable statuses, malformed
  JSON/choices, oversized responses, configuration errors, local quota failures,
  client cancellation, or the exhausted overall deadline. Invalid whiteboard
  content is validated by Grip, not repaired by gateway key rotation.
- Cool down a key for 30 seconds after a retryable transport/5xx failure, including
  a failed final attempt. For 429 use a 60-second minimum and honor a longer valid
  `Retry-After` delta-seconds or HTTP date. Invalid/past values use the minimum.
  Parse defensively without exposing raw header values in logs. Extend an existing
  cooldown rather than shortening it when concurrent attempts fail.
- Upstream 401/403 keeps the existing sanitized 503 mapping and puts that key on a
  60-second cooldown, but does not trigger a retry for the current completion.
- Before failover, use an abortable 250 ms backoff. Recheck eligibility after the
  wait because another request may have cooled down the candidate key.
- Both attempts, response reads, and backoff share the existing 60-second deadline
  created once per logical completion. Failover never resets it and starts only
  if client and deadline signals are still live. A failure that consumes the
  deadline returns 504 with no fallback attempt.
- Client disconnect must abort fetch, body reads, and backoff promptly. Always
  release the key reservation and the existing logical completion lease.
- Cancel non-success response bodies without relaying or logging them; preserve
  the existing bounded successful-body reader and response sanitization.
- Preserve public error mappings: 429 to 429, upstream 401/403 to 503, deadline to
  504, and other upstream/transport/format failures to 502. A failed fallback
  returns its own sanitized mapping.
- Reserve user/global quota once for the logical completion. Failover does not
  reserve another logical request, but may consume extra provider quota or cost;
  a network failure does not prove the first attempt was never processed.

Use named module constants for new timing and attempt limits. Do not add an env
variable for each tuning value or change existing model/token/payload limits.

## Diagnostics and privacy

Emit structured, sanitized attempt diagnostics using the existing Nest logger:
key slot number (not key text or a key prefix/hash), attempt number, upstream HTTP
status when available, elapsed milliseconds, a fixed outcome category, and whether
failover is being attempted. Record successes at debug level and failures/failover
at warning level. Never serialize the config, URL, authorization headers, raw
errors/causes, provider response body, prompts, diffs, answers, or raw request IDs.
No key values or attempt metadata are added to public completion responses.

## Verification and acceptance criteria

Use Jest tests with mocked fetch responses, controlled clocks/signals, and deferred
promises; no real provider calls or secrets are necessary.

1. Config accepts one/multiple trimmed keys and rejects invalid lists without
   exposing values. Disabled configuration still needs no secrets. Legacy-only
   configuration is not accepted.
2. Sequential healthy calls rotate keys. Overlapping calls choose the least-active
   eligible key, including when a previously used key is still busy. Reservations
   return to zero for every exit path.
3. Each retryable status and transport failure switches to a different healthy
   key once, with unchanged request payload and the correct replacement bearer.
   Single-key and exhausted pools do not retry; three-key pools still make no
   more than two attempts.
4. Non-retryable statuses, malformed/oversized responses, client abort, and overall
   deadline do not cause extra calls. Preserve existing fixed host/model,
   redirect policy, size limits, and output field filtering.
5. Cooldown skip/recovery, all-cooled behavior, concurrent cooldown extension,
   `Retry-After` seconds/date/invalid/past values, abort during backoff, and a
   candidate becoming unavailable during backoff are tested deterministically.
6. Prove that a late first failure leaves only the remaining deadline for the
   fallback; do not merely assert that both fetch calls receive an AbortSignal.
   Exercise body-read cancellation as well as fetch cancellation.
7. Verify safe logs expose the original upstream status but no sentinel secrets,
   prompt text, provider response text, or raw exception messages.
8. Existing gateway quota/lease tests still pass and establish one quota
   reservation per logical completion. Local launcher tests prove neither the
   new pool nor the legacy secret is inherited by the Grip subprocess.
9. Run focused backend and launcher tests, then uncached workspace tests, lint,
   style lint, typecheck, build, backend coverage, and changed-file Prettier checks.
   Report existing toolchain warnings or blocked checks rather than claiming a
   warning-free result. PostgreSQL-only concurrency tests require the disposable
   database variable; disclose if unavailable.

## Scope exclusions and known limitations

No database/schema changes, quota increases, new providers/models, local hook
bypasses, whiteboard prompt changes, deployment, or secret provisioning. No
guaranteed increase in throughput or elimination of 502 errors. Per-process
least-active counts are not measurements of Google's backend load. More projects
must be used within provider terms and legitimate allocated quotas, not to bypass
service restrictions.
