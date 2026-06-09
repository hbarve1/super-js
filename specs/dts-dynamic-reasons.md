# `@sjs:dynamic` Reason Values

When the SJS compiler emits a `.d.ts` file for a library that uses TypeScript features not
supported in SJS, it annotates each translated type with `@sjs:dynamic reason=<value>` to
document **why** the type was degraded to `dynamic`.

This closed set of reason values is defined here (Stage 2 gate: M8).

---

## Closed set of reason values

| Reason value | TypeScript source construct | Notes |
|---|---|---|
| `intersection-not-mergeable` | `A & B` intersection type | Merged shape cannot be expressed in SJS without a named interface. Emitted when the interface cannot be auto-named. |
| `mapped-type` | `{ [P in keyof T]: ... }` mapped type | No SJS equivalent; shape is unknown without evaluating the mapping. |
| `conditional-type` | `T extends U ? A : B` | No SJS equivalent; type depends on type-level branching. |
| `infer-in-conditional` | `infer R` inside a conditional type | Subset of `conditional-type`; listed separately for diagnostics. |
| `recursive-mapped` | Recursive mapped type (e.g. `DeepPartial<T>`) | Self-referential mapped types cannot be unrolled. |
| `overloaded-call-signature` | Multiple call signatures on the same type | SJS does not have overloads on the type level; use `dynamic` + narrowing at call site. |
| `namespace` | TypeScript `namespace` declaration | No SJS equivalent; convert to ES module. |
| `enum-value` | TypeScript `enum` | Numeric/string enum values cannot be expressed as sum types without user intervention. |
| `unknown-ts-extension` | Any TypeScript feature not in the above list | Catch-all for TypeScript features introduced after this list was authored. |

---

## Annotation format

```ts
// in emitted .d.ts
/** @sjs:dynamic reason=mapped-type */
export type Partial<T> = dynamic
```

The annotation is consumed by the SJS type checker when importing from a `.d.ts` file.
It suppresses `SJS-W001` (implicit dynamic) for the specific annotated symbol, since the
degradation is intentional and documented.

---

## Adding new reason values

Reason values are part of the compiler's public API once Stage 2 ships — changing them is a
breaking change. To add a new value:

1. Open an RFC issue.
2. Add a row to the table above.
3. Update `compiler/src/translator/dynamic-reasons.ts` (Stage 2).
4. Add a test fixture under `packages/compiler/tests/translator/fixtures/`.
