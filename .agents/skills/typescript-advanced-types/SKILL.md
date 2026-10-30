---
name: typescript-advanced-types
description: Use for genuine advanced TypeScript typing work in UniVerse, such as preserving key/payload correlation across unions, diagnosing conditional-type distribution or inference loss, and deriving mapped or template-literal types from existing sources. Do not trigger for routine .ts edits, simple interfaces, DTO fields, shared domain-contract placement, ordinary CRUD, or generic framework creation.
license: MIT; see LICENSE.txt
---

# TypeScript Advanced Types

Solve a concrete compile-time relationship, not an opportunity to introduce a type framework. Repository instructions and canonical [code style](../../../docs/ai/code-style.md), [architecture](../../../docs/ai/architecture.md), [quality](../../../docs/ai/quality.md), and [shared contracts](../../../docs/ai/data-and-contracts.md) take precedence. Use those documents for placement and policy rather than treating upstream examples as repository conventions.

## Establish the relationship

1. Find the existing contract, value map, and callers. Write down which combinations must compile and which must fail before changing a signature.
2. Identify the lost information: a literal widened to `string`, an independent pair of unions, an optional property, or a conditional applied to each union member instead of the whole union.
3. Try a direct discriminated union, indexed access, or built-in utility first. Add a custom mapped or conditional type only when it expresses a relationship those simpler forms cannot retain.
4. Check callers that already hold unions, not just literal arguments. A generic key parameter can itself be a union; `Values[Key]` then becomes a union of values and may accept mismatched pairs.

## Keep correlated values together

When a reusable API derives alternatives from an existing map, map each key to a complete alternative, then index that map to get a union. Independent unions of keys and values lose the connection. For two positional arguments, use a mapped union of tuples as the rest parameter; for queued/stored values, prefer a discriminated object union.

This standalone, non-domain example demonstrates the object form:

```typescript
type SettingValues = {
  caption: string;
  refreshSeconds: number;
};

type SettingChange = {
  [Setting in keyof SettingValues]: {
    setting: Setting;
    value: SettingValues[Setting];
  };
}[keyof SettingValues];

function describeChange(change: SettingChange): string {
  switch (change.setting) {
    case 'caption':
      return change.value.toUpperCase();
    case 'refreshSeconds':
      return change.value.toFixed(0);
  }

  const unhandled: never = change;

  return unhandled;
}

describeChange({ setting: 'caption', value: 'Overview' });
describeChange({ setting: 'refreshSeconds', value: 30 });
// @ts-expect-error The value belongs to a different setting.
describeChange({ setting: 'caption', value: 30 });
```

Keep the discriminant and its value together while narrowing. If a generic implementation cannot prove the relationship, use control-flow narrowing or simplify its representation rather than casting the result. A type assertion does not repair a runtime mismatch.

## Choose transformations deliberately

- **Literal inference:** use `satisfies` to check a value against a target without replacing its inferred type. It does not guarantee literal preservation in every context; use `as const` only when literal/readonly inference is intended. Neither validates external data or freezes objects at runtime.
- **Optional and readonly fields:** mapped types can preserve modifiers. Decide whether optional map entries should produce optional alternatives or payloads containing `undefined`; use `-?` only when removing optionality is part of the requirement.
- **Conditional types:** a checked naked type parameter distributes over unions. Use `[Value] extends [Constraint]` when the question concerns the entire union. Include `never` and optional/nullable members in scratch checks because distribution can change their outcome.
- **Inference:** use built-ins such as `Awaited`, `ReturnType`, `Parameters`, and `Extract` before writing an `infer` helper. Use `infer` only to extract structure that is actually present, not to invent a contract.
- **Template literals:** derive finite string keys from existing literal sets. Avoid recursive path generators unless a current caller needs them; define supported object/array boundaries and a depth limit before attempting recursion.
- **Exhaustiveness:** use a `never` assignment after narrowing when adding a variant should force callers to handle it. Keep runtime validation at the existing data boundary; compile-time types do not validate JSON.

## Verify without weakening the project

Use the installed compiler and the affected package's configuration; do not relax compiler options to make a signature pass. For an illustrative snippet, run a standalone strict, no-emit check in a temporary sandbox with no product imports. Include accepted calls and intentional failures using descriptive `@ts-expect-error` comments; an unused directive should fail the check. Confirm a failure is about the intended relationship, not an unrelated syntax/import error. Do not add a permanent type-only test suite; follow the repository's behavior-testing policy.

Check literal and union callers, optional fields, and exhaustiveness where relevant. Report the invariant, why the simpler alternative was insufficient, compiler/version and checks actually run, and any unresolved runtime boundary. Stop if the proposed type machinery costs more to understand than direct alternatives.

For source assessment, pinned upstream URLs, and license attribution, read [provenance](references/provenance.md). Evaluation prompts live in `evals/evals.json`; they are sandbox-only tasks, not permission to edit product code.
