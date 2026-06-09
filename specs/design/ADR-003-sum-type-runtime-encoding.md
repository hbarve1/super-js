# ADR-003 — Sum type runtime encoding as `{ _tag, _0, ... }`

**Status:** Accepted  
**Date:** 2026-06-09  
**Deciders:** SuperJS core team

## Context

SJS has first-class sum types (tagged unions / algebraic data types): `type Result<T,E> = Ok(T) | Err(E)`. The compiler must choose how these values are represented at runtime in the JS prototype backend, and this representation must also be coherent with the LLVM backend's memory model.

Several design pressures apply simultaneously:

- Pattern matching (`match`) must discriminate variants cheaply and reliably at runtime.
- The representation must be transparent and inspectable — developers debugging in browser devtools or Node.js REPL should be able to understand what they're looking at.
- Constructor expressions should compile efficiently — ideally to inline object literals with no function call overhead.
- The scheme must have a stable LLVM mapping (tagged union, `{ i8 tag, [N x i8] payload }`).
- The representation should not require a runtime library — zero-dep distribution is a goal.

## Decision

Sum type values are encoded as plain JavaScript objects with a mandatory `_tag` property containing the variant name as a string. Payload fields follow a fixed naming convention by variant form:

- **Unit variant** (`| None`): `{ _tag: "None" }` — no payload fields.
- **Tuple variant** (`| Ok(T)`): `{ _tag: "Ok", _0: value }` — positional payload under `_0`, `_1`, etc.
- **Record variant** (`| Circle { radius: number }`): `{ _tag: "Circle", radius: value }` — named fields used directly.

`_tag` is always the first property (V8/SpiderMonkey hidden-class optimization). Constructors are lowered to inline object literals at call sites — no helper functions are emitted. Higher-order use (e.g., `arr.map(Ok)`) emits an arrow wrapper: `arr.map(v => ({ _tag: "Ok", _0: v }))`.

## Rationale

1. **Plain objects, no prototype chains.** Custom classes or constructor functions would require a runtime library and create prototype overhead. Plain object literals are the simplest possible representation, are transparently inspectable in any JS environment, and interoperate with `JSON.stringify`/`JSON.parse` without surprises.

2. **`_tag` as the discriminant.** The discriminant must be a stable string key. Using a string (the variant name) rather than a numeric tag makes values self-describing: `{ _tag: "Ok", _0: 42 }` is immediately readable. Numeric tags would require a lookup table to interpret. The underscore prefix (`_`) distinguishes the discriminant from user-declared field names while remaining valid JS.

3. **`_tag` first for engine optimization.** V8 and SpiderMonkey optimize property access on objects whose property order is consistent across construction sites. Placing `_tag` first on every variant object ensures the discriminant check hits the fastest path (inline cache hit on the first property slot).

4. **Inline object literals, no constructor functions.** Emitting constructors as inline literals (`{ _tag: "Ok", _0: 42 }`) rather than function calls (`Ok(42)` → `new Ok(42)`) enables:
   - Dead-code elimination: an unused `Ok(42)` expression has no side-effect barrier.
   - Engine shape specialization: the JIT sees the full object shape at the creation site.
   - Zero call overhead: no function dispatch or prototype allocation.

5. **Canonical LLVM mapping.** The JS `_tag` string maps directly to an `i8` tag index in LLVM IR (variant declaration order, starting at 0). The payload maps to a byte array sized to the largest variant. This 1:1 mapping means the two backends have identical invariants about sum type structure — the same `match` compilation logic applies to both.

6. **`--frozen-tags` opt-in.** By default, objects are not frozen, preserving engine optimization freedom. The `--frozen-tags` compiler flag wraps each constructor output in `Object.freeze(...)`, enabling strict immutability at a small runtime cost for codebases that prefer it.

## Alternatives Considered

| Alternative | Why rejected |
|-------------|-------------|
| Class instances with a shared `SJSVariant` prototype | Requires a runtime library. Prototype chain overhead. Cannot be tree-shaken or inlined by bundlers. |
| Numeric tag (e.g., `{ _tag: 0, _0: 42 }`) | Requires a lookup table for debugging. Values are not self-describing. No benefit over strings for the JS backend — V8 handles small integers and strings similarly for property values. |
| TypeScript discriminated union pattern (`{ kind: "Ok", value: 42 }`) | Using `kind` instead of `_tag` conflicts with user-declared `kind` fields in record variants. The `_`-prefix convention reserves the discriminant namespace. `_0` for positional payload is similarly unambiguous. |
| Constructor functions (`function Ok(v) { return { _tag: "Ok", _0: v }; }`) | Still emits helper functions per sum type, requiring either global registration or per-file emission. Inline literals are strictly better for tree-shaking and engine optimization. |
| Symbol discriminant (`Symbol("Ok")`) | Symbols are not serializable via `JSON.stringify`. Breaks transparency in devtools. Cannot be pattern-matched with `===` on the field name. |

## Consequences

**Easier:** Sum type values are self-describing plain objects. Pattern matching compiles to fast `_tag === "VariantName"` checks. The representation survives `JSON.stringify`/`JSON.parse` round-trips (useful for IPC, logging, serialization). No runtime library is needed — the compiler is zero-dep at runtime.

**Harder:** The `_tag`, `_0`, `_1` names are reserved as payload keys — user-declared record variant fields cannot be named `_tag`, `_0`, `_1`, etc. (the compiler enforces this). The encoding is a stable API contract: changing the tag format is a breaking change requiring a major version bump.

**Off the table:** Changing the encoding without a major version bump. `specs/language/052-sum-type-encoding.md` is the authoritative normative specification — all code generation and pattern matching in all backends must conform to it.

## Related

- `specs/language/052-sum-type-encoding.md` — normative encoding specification (authoritative)
- `specs/language/002-sum-types.md` — sum type syntax, semantics, type rules
- `specs/language/003-match.md` — pattern matching compilation
- RFC-0003 (`rfcs/0003-sum-type-tag-representation.md`)
