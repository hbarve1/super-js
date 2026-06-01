# RFC-0001: No `any` — Introduce `dynamic`
- **Status:** Accepted
- **Date:** 2026-05-31
- **Author:** SuperJS Maintainers

## Summary

Ban the `any` type from SJS entirely and replace it with `dynamic`, an explicit escape hatch that preserves runtime safety by checking property access and method calls at runtime rather than silently disabling the type system.

## Motivation

`any` is unsound — it silently disables type checking for all downstream expressions with no runtime safety. A value typed as `any` can be passed to any function, assigned to any variable, and accessed with any property name without a single type error. In practice, real codebases accumulate `any` annotations that erode soundness guarantees over time. Once a value enters the `any` zone it infects every expression it touches, and there is no mechanism to detect how far the unsoundness has spread. SJS's value proposition is a sound, predictable type system; allowing `any` would undermine that from day one.

## Proposal

`any` is a parse error in SJS, reported as diagnostic `SJS-E004`. The `dynamic` type is the only escape from static typing.

Key semantics:

- A `dynamic` value may hold any JavaScript value at runtime.
- Property access and method calls on a `dynamic` value are wrapped in runtime checks; accessing a missing property throws a `DynamicAccessError` rather than returning `undefined` silently.
- Assigning a `dynamic` value to a statically typed variable requires explicit narrowing:

```sjs
let x: dynamic = fetchUnknown();

// Error: cannot assign dynamic to number without narrowing
let n: number = x;

// Correct: narrow first
if (typeof x === "number") {
  let n: number = x; // OK inside the narrowing guard
}
```

- `dynamic` does not propagate silently. An expression whose operands include a `dynamic` value does not automatically become `dynamic`; the compiler reports a type error and requires explicit handling.
- Library interop: when calling untyped JS via FFI, return types default to `dynamic` unless an explicit type annotation is provided.

## Alternatives Considered

**Keep `any` as an alias for `dynamic`** — rejected. Aliasing `any` to `dynamic` would let TypeScript habits carry over unchanged. Developers who write `any` thinking it behaves as in TypeScript would be surprised by the runtime checks. More importantly, accepting `any` syntax trains the habit of reaching for it first; we want `dynamic` to feel like a deliberate, slightly-verbose choice.

**Allow a `@ts-ignore`-style comment escape** — rejected. Comment-based escapes are undetectable by tooling that doesn't parse comments, are not runtime-safe, and produce no diagnostic trail. They also cannot be linted or counted in a codebase audit.

## Drawbacks

Migration from TypeScript requires replacing every `any` with either `dynamic` or a concrete type. For large TypeScript codebases this may be significant mechanical work. A codemod tool (`sjs migrate --fix-any`) will be provided to assist, defaulting to `dynamic` as a conservative replacement and flagging sites for manual review.

## Unresolved Questions

- Should `dynamic` values be allowed as index signatures (`obj[dynamicKey]`)? Tentatively yes, with a runtime check on the key.
- Should there be a lint rule `prefer-typed-over-dynamic` with a configurable threshold (e.g., warn if more than N uses of `dynamic` exist in a file)?
