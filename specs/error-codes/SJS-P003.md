# SJS-P003 — Invalid syntax in type annotation

**Severity:** error  
**Category:** parser  
**Stage:** Stage 1

## Description

A type annotation in a variable declaration, function parameter, return type position, or
object-type or class member contains syntax that the SJS type grammar does not accept.

This diagnostic is emitted in preference to the general `SJS-P001` when the parser has
already consumed a `:` (or `->` in a function return position) and has entered type-annotation
context, so it is clear that the user intended to write a type but the token sequence does not
form a valid SJS type expression.

Common triggers:

- Using TypeScript-specific type syntax that SJS does not support: intersection types (`A & B`),
  conditional types (`T extends U ? A : B`), mapped types (`{ [K in keyof T]: ... }`), `infer`,
  or the built-in utility types built on those constructs (`Partial<T>`, `Required<T>`,
  `ReturnType<T>`, etc.).
- Writing a union type with `|` at the start (before any type term): `| string | number`.
- Nesting type-level constructs that are only valid at declaration level, such as a full
  `type X = …` alias inline in a parameter position.
- An empty type annotation (bare `:` at end of parameter list with no following type).
- Forgetting to close a generic argument list inside a type expression (a separate location
  from `SJS-P002` at EOF).

## Example

```sjs
// ✗ error — intersection type is not allowed in SJS (use object-type extension)
function merge(a: Foo & Bar): void { }
//                    ^ SJS-P003: Invalid syntax in type annotation; '&' intersection types
//                               are not allowed — use object-type extension instead (SJS-E005)

// ✗ error — conditional type is not allowed
type NonNull<T> = T extends null ? never : T
//               ^^^^^^^^^^^^^^^^^^^^^^^^^^^ SJS-P003: Invalid syntax in type annotation;
//                                           conditional types are not allowed (SJS-E008)

// ✗ error — leading '|' is not valid
let status: | "ok" | "err"
//          ^ SJS-P003: Invalid syntax in type annotation; expected type expression, got '|'

// ✗ error — empty annotation
function foo(x: ): void { }
//              ^ SJS-P003: Invalid syntax in type annotation; expected type expression, got ')'
```

## Fix

Replace disallowed TypeScript-specific constructs with their SJS equivalents:

```sjs
// ✓ correct — object-type extension instead of intersection
type Merged extends Foo, Bar { }
function merge(a: Merged): void { }

// ✓ correct — explicit nullable union instead of conditional type
type NonNull<T> = T   // SJS non-nullable by default; just use T directly

// ✓ correct — union type without leading '|'
let status: "ok" | "err"

// ✓ correct — explicit annotation
function foo(x: string): void { }
```

## Related codes

- `SJS-P001` — unexpected token (general; SJS-P003 is its type-annotation specialisation)
- `SJS-P004` — invalid sum type declaration (for `type X = A | B` declaration context)
- `SJS-E004` — `any` is not a valid type in SJS
- `SJS-E005` — intersection type `A & B` is not allowed
- `SJS-E008` — conditional type is not allowed
- `SJS-E009` — `infer` keyword is not allowed
