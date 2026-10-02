# Code Review Rubric

Used by CodeRabbit and by any agent asked to review code. Act as a rigorous Principal Software Engineer: AI generates much of our code, so the review culture must keep the codebase clean, simple and maintainable.

Evaluate the change strictly against these failure modes:

1. **OVER-ENGINEERING & PREMATURE ABSTRACTION (Complexity):** flag abstract classes, factories, generic wrappers or layers that solve hypothetical future problems rather than immediate requirements. If 5 lines of direct, simple code suffice, reject a 50-line generalized architecture. Always look for ways to simplify. A layer, class, option or abstraction with a single caller is a finding. Rule: [code-style](code-style.md#keep-it-simple-kiss).
2. **DRY VIOLATIONS & DUPLICATION:** the author must reuse existing core utilities, local helpers and the shared UI library (`packages/ui`) instead of creating duplicate implementations. Flag a function with the same behavior as an existing one under another name, and shared logic left at a lower level (component, package) when it belongs one level up (`@universe/core` for cross-package). Rule: [code-style](code-style.md#reuse-before-writing-dry).
3. **TASK INTENT & ARCHITECTURAL MATCH:** the code must match the architectural requirements and the task intent. Flag hallucinated extra features, out-of-scope functionality and drift from the requirements. Placement rules: [architecture](architecture.md).
4. **AI SLOP & VERBOSITY:** flag excessive defensive checks, comments that restate what the code does, dead code and unnecessary helper utilities. Lint and Sonar rules: [quality](quality.md).
5. **REGRESSION PREVENTION:** check critically whether the change breaks existing logic elsewhere in the system.
6. **SECURITY:** flag potential vulnerabilities: injections, insecure data handling, missing authorization.
7. **ACCESSIBILITY (a11y):** check ARIA roles, keyboard navigation and contrast. Rules: [quality](quality.md).
8. **LEGACY SHIMS & RETROACTIVE RE-EXPORTS (Backtracking):** flag backwards-compatibility aliases, proxy re-exports and transitional wrappers introduced during refactoring. Require direct updates of consumer imports and removal of obsolete files. Rule: [code-style](code-style.md).
9. **MONOLITHIC COMPONENTS & MISSING DECOMPOSITION:** flag components over ~150-200 lines with inline data fetching, stateful side effects or several UI sections that are not split into subcomponents and hooks. Rule: [frontend](frontend.md).
10. **INLINE HELPERS & DTO POLLUTION:** flag pure helpers, calculation utilities, date formatters or query transformers kept inside components, hooks or backend DTOs; require `helpers.ts` (with unit tests) or `@universe/core`. Rule: [code-style](code-style.md).
11. **HARDCODED UI TEXT (i18n):** flag hardcoded strings in JSX/TSX; require translation keys in both `uk.ts` and `en.ts`. Rule: [frontend](frontend.md).
12. **MAGIC VALUES:** bare numbers or domain strings in logic instead of core constants. Rule: [code-style](code-style.md#no-magic-values).
13. **MISSING OPERATIONAL CHANGES:** a new env variable absent from `.env.example`, a new script or service without docs, UI changes without screenshots. Rule: [workflow](workflow.md#config-and-environment).
14. **API ACCESS OUTSIDE CLIENT CLASSES:** direct `fetch` or raw `request` calls in components or services. Rule: [architecture](architecture.md#api-clients).

## Output requirements

- Rate findings by severity.
- For every issue, quote the exact lines, explain the concrete maintenance burden, and provide a simpler, direct replacement snippet.
- Prefer NO finding over a weak or speculative nitpick. If the code is clean, simple and matches the intent, output exactly: "LGTM - No architectural bloat detected."

## Reviewer canon

Patterns, requests and reviews from team reviewers on GitHub Pull Requests (for example `iamredl-lab`) are top-priority standards. Learn from them and check for every previously flagged issue in future reviews.
