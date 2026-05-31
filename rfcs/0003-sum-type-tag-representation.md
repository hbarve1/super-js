# RFC-0003: Sum Type Tag Representation
- **Status:** Accepted
- **Date:** 2026-05-31
- **Author:** SuperJS Maintainers

## Summary

Sum types (variant types) in SJS compile to discriminated union objects using `_tag` and `_0` fields, giving a simple, inspectable JavaScript representation that integrates naturally with `match` for exhaustive pattern matching.

## Motivation

SJS needs a first-class algebraic data type construct that satisfies three requirements:

1. Compiles to idiomatic JS objects — no magic symbols, no prototype chains, no WeakMap registries.
2. Is inspectable at runtime without SJS tooling — a developer can `console.log` a value and immediately understand what variant it is.
3. Integrates with `match` for exhaustive pattern matching — the compiler can verify all variants are handled.

TypeScript's existing discriminated union pattern (`{ kind: "ok"; value: T } | { kind: "err"; error: E }`) satisfies (1) and (2) but is verbose to write and requires the developer to manually maintain the discriminant field name and string literal type. SJS should make this first-class.

## Proposal

### Declaration syntax

```sjs
type Result<T, E> = Ok(T) | Err(E);
type Shape = Circle({ radius: number }) | Rect({ width: number; height: number }) | Point;
type Option<T> = Some(T) | None;
```

### Compiled representation

**Tuple variants** (positional payload):

```sjs
Ok(42)
```
compiles to:
```js
{ _tag: "Ok", _0: 42 }
```

Multiple positional fields use `_0`, `_1`, `_2`, etc.:
```sjs
Pair(1, 2)
```
compiles to:
```js
{ _tag: "Pair", _0: 1, _1: 2 }
```

**Record variants** (named fields):

```sjs
Circle({ radius: 5 })
```
compiles to:
```js
{ _tag: "Circle", radius: 5 }
```

**Unit variants** (no payload):

```sjs
None
```
compiles to:
```js
{ _tag: "None" }
```

### Pattern matching

The `match` expression destructures variants exhaustively:

```sjs
let area = match shape {
  Circle({ radius }) => 3.14159 * radius * radius,
  Rect({ width, height }) => width * height,
  Point => 0.0,
};
```

The compiler verifies all variants are covered. A missing arm is a compile error (`SJS-E020`).

### Encapsulation of `_tag`

The `_tag` and `_0` fields are considered internal. SJS code that accesses `._tag` directly receives lint warning `SJS-L005` ("use match instead of direct tag access"). This preserves the ability to rename the internal representation in a future edition without breaking SJS-authored code. Code that consumes SJS-compiled output from TypeScript or plain JS may read `_tag` freely — no restriction is placed on JS consumers.

### Constructor functions

Each variant compiles to a constructor function in the output module:

```js
// generated
const Ok = (_0) => ({ _tag: "Ok", _0 });
const Err = (_0) => ({ _tag: "Err", _0 });
```

These are plain functions and can be used as values (passed to `map`, `filter`, etc.):

```sjs
let results = values.map(Ok);
```

## Alternatives Considered

**Use TypeScript discriminated unions directly** — rejected. This requires the developer to write `{ kind: "ok"; value: T } | { kind: "err"; error: E }` with all field names explicit. The discriminant field name (`kind`, `type`, `tag`) is not standardized across codebases. There is no exhaustiveness checking at the grammar level without additional plugin configuration.

**Use symbols instead of strings for tags** — rejected. Symbol-tagged objects are not JSON-serializable, which breaks a common JS workflow (storing, logging, sending over the wire). Debugging is also harder: a symbol prints as `Symbol(Ok)` in some environments rather than the plain string `"Ok"`.

**Use class instances with a `type` property** — rejected. Classes add prototype overhead and make structural comparison harder. Plain objects are simpler, more portable across VM boundaries (e.g., worker threads, `structuredClone`), and more idiomatic in modern JS functional style.

## Drawbacks

Output objects have a `_tag` field that TypeScript consumers see when they import SJS-compiled code. This is a deliberate design — the field is internal-looking by convention but visible. A future SJS-to-TypeScript declaration emitter will emit proper discriminated union types so TypeScript consumers get full type safety without seeing the implementation detail.

Using `_0`, `_1` for positional fields is less readable than named fields in the compiled output. This is intentional: positional variants are expected to be used with `match` destructuring, not direct property access, so the output field names are never user-facing.

## Unresolved Questions

- Should nested variant patterns be supported in `match` arms (e.g., `Ok(Some(x))`)? Tentatively yes for Stage 1, but the initial implementation may require intermediate bindings.
- Should unit variants be singletons (same object reference) or freshly allocated each time? Tentatively freshly allocated for simplicity; singleton optimization can be added later.
