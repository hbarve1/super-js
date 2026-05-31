# RFC-0002: Ban Complex TypeScript Type Constructs
- **Status:** Accepted
- **Date:** 2026-05-31
- **Author:** SuperJS Maintainers

## Summary

Ban four TypeScript advanced type constructs — intersection types (`A & B`), conditional types (`T extends U ? A : B`), mapped types (`{ [K in keyof T]: ... }`), and template literal types — each of which is a parse error in SJS, with explicit simpler alternatives mandated in their place.

## Motivation

These features make TypeScript's type system Turing-complete. They produce error messages that are impossible to understand without deep TypeScript expertise. They reward type-level cleverness over code clarity and create a two-tier community: developers who can read and write complex type machinery, and those who cannot. This is the opposite of what SJS is optimizing for.

Concretely:

- Intersection types silently merge incompatible shapes and can produce `never` in surprising ways.
- Conditional types (`T extends U ? A : B`) recurse through union distribution rules that even experienced TS developers misremember.
- Mapped types enable entire programs written purely at the type level, making the type checker a second compiler with its own debugging workflow.
- Template literal types interact with mapped and conditional types to produce combinatorial type explosions.
- The `infer` keyword, used only inside conditional types, is removed as a consequence.

SJS's type system should be learnable in an afternoon. None of these constructs meet that bar.

## Proposal

Each of the following is a parse error in SJS:

### Intersection types

```sjs
// SJS-E010: intersection types are not allowed
type C = A & B;
```

Use interface extension instead:

```sjs
interface C extends A, B {}
```

### Conditional types

```sjs
// SJS-E011: conditional types are not allowed
type IsString<T> = T extends string ? true : false;
```

Use sum types and `match` instead:

```sjs
type StringCheck = Yes | No;

fn checkString(x: dynamic): StringCheck {
  match typeof x {
    "string" => Yes,
    _ => No,
  }
}
```

### Mapped types

```sjs
// SJS-E012: mapped types are not allowed
type Readonly<T> = { readonly [K in keyof T]: T[K] };
```

Use explicit interfaces or the built-in `Readonly<T>` from the SJS standard library (implemented in the compiler, not user-definable):

```sjs
interface ReadonlyPoint {
  readonly x: number;
  readonly y: number;
}
```

### Template literal types

```sjs
// SJS-E013: template literal types are not allowed
type EventName = `on${string}`;
```

Use the `string` type or a sum type of string literals:

```sjs
type EventName = "onClick" | "onHover" | "onFocus";
```

### `infer` keyword

Removed along with conditional types. `SJS-E014` if encountered.

## Alternatives Considered

**Allow them behind a `--experimental` flag** — rejected. Experimental flags in type systems are dangerous because complexity leaks: a library author who uses `--experimental` features exposes those types to every consumer. Other tooling (IDE plugins, linters) would need to support the experimental mode to remain useful.

**Allow only a "safe subset"** — rejected. No principled boundary for a safe subset exists. Any subset that includes `infer` or recursive conditional types is effectively Turing-complete. Policing the boundary would require as much compiler work as implementing the full feature.

**Provide SJS-compatible equivalents for all TS utility types** — accepted as a companion action. The SJS standard library will provide `Partial<T>`, `Required<T>`, `Readonly<T>`, `Pick<T, K>`, and `Omit<T, K>` as compiler-intrinsic generics that do not require mapped types to implement.

## Drawbacks

Code that relies heavily on generic programming patterns (TS utility types like `Partial<T>`, `Record<K, V>`) must be rewritten using explicit interfaces or the SJS-provided intrinsic generics. This is the largest migration burden of any SJS restriction. A codemod (`sjs migrate --fix-complex-types`) will flag each use and suggest the preferred alternative where one exists.

## Unresolved Questions

- Should `Record<K, V>` be an intrinsic generic or sugar for `{ [key: K]: V }`? Tentatively an intrinsic, since `{ [key: K]: V }` syntax looks like a mapped type.
- How should `keyof` be handled? It is used in mapped types but also stands alone (e.g., `keyof Point`). Tentatively: `keyof T` as a standalone type expression is allowed; it is only banned inside mapped-type brackets.
