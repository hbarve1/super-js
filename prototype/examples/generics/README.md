# generics/ — SJS Generics Examples

This directory shows how SJS generics work: type parameters, interface constraints,
generic classes, and generic sum types powering type-safe pipelines.

## Files (reading order)

| File | Concepts |
|------|----------|
| `01-basic.sjs` | `identity<T>`, array helpers (`first<T>`, `last<T>`), `T?` nullable return, `zip<A,B>` |
| `02-constraints.sjs` | `<T: Interface>` syntax, multiple constraints `<T: A & B>`, generic class `SortedList<T>` |
| `03-generic-sum-types.sjs` | `Result<T,E>` and `Option<T>`, `flatMapResult`, `flatMapOption`, mixed pipelines |

## Key SJS generics syntax

```sjs
// Type parameter — unconstrained
function identity<T>(x: T): T { return x }

// Constrained — T must satisfy the Ordered interface
function min<T: Ordered>(a: T, b: T): T { ... }

// Multiple constraints via &
function describe<T: Serializable & Describable>(x: T): string { ... }

// Generic sum type
type Result<T, E> = | Ok(T) | Err(E)

// Nullable return (T? = T | null)
function first<T>(arr: T[]): T? { return arr.length > 0 ? arr[0] : null }
```

## Constraint syntax note

SJS uses `<T: Interface>` — **not** `<T extends Interface>`.
The `extends` keyword does not exist in generic constraint position.

## Running examples

```sh
# From the prototype/ directory:
npx ts-node src/cli.ts run examples/generics/01-basic.sjs
npx ts-node src/cli.ts run examples/generics/02-constraints.sjs
npx ts-node src/cli.ts run examples/generics/03-generic-sum-types.sjs
```

## Cross-references

- `sum-types/03-generic-sum-types.sjs` — full treatment of `Result`/`Option` helpers
- `types/generics-advanced.sjs` — `Option<T>` in the types chapter context
- `structural-interfaces/` — interface definitions used in constraint examples
