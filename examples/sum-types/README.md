# Sum Types

**Theme:** Sum types — modeling values that are one of several distinct shapes, with exhaustive match.

A sum type (discriminated union) describes a value that is *exactly one* of a fixed set of named variants.
Unlike string unions or plain objects, the compiler knows every possible shape, which lets `match` check that you've handled every case.  Miss a variant and SJS raises **SJS-E007** at compile time.

## Files

| File | Description |
|------|-------------|
| `01-basics.sjs` | Declare sum types with unit, tuple, and struct variants; construct values; dispatch with `match` |
| `02-match.sjs`  | Exhaustive `match`, wildcard arm (`_`), and binding in patterns |
| `03-generic-sum-types.sjs` | `Result<T,E>` and `Option<T>` as generic sum types; `map`, `flatMap`, and `withDefault` helpers |
| `04-recursive.sjs` | Recursive sum types (`Tree<T>`, `List<T>`, `Expr`); structural recursion via `match` |

## Reading order

Follow the files numerically.  `01` and `02` cover the syntax fundamentals.
`03` shows how generics and sum types combine to model fallibility without exceptions.
`04` shows recursive types and is the most advanced.

## Running the examples

```bash
# Compile a single file
npx super-js compile prototype/examples/sum-types/01-basics.sjs
node prototype/examples/sum-types/01-basics.js

# Or compile all four
npx super-js compile prototype/examples/sum-types/01-basics.sjs
npx super-js compile prototype/examples/sum-types/02-match.sjs
npx super-js compile prototype/examples/sum-types/03-generic-sum-types.sjs
npx super-js compile prototype/examples/sum-types/04-recursive.sjs
```

## Key concepts

### Variant forms

```sjs
type Shape =
  | Point                                        // unit — no data
  | Circle    { radius: number }                 // struct — named fields
  | Rectangle { width: number; height: number }  // struct — multiple named fields

type Result<T, E> = | Ok(T) | Err(E)             // tuple — positional fields
```

### Construction

```sjs
const p: Shape = Point
const c: Shape = Circle { radius: 5 }
const ok: Result<number, string> = Ok(42)
```

### Exhaustive match

```sjs
function area(s: Shape): number {
  return match s {
    Point                      => 0
    Circle { radius }          => Math.PI * radius * radius
    Rectangle { width; height } => width * height
  }
}
```

If you remove the `Point` arm the compiler emits **SJS-E007: non-exhaustive match — missing variant Point**.

### Wildcard arm

```sjs
function isCircle(s: Shape): boolean {
  return match s {
    Circle { _ } => true
    _            => false   // catches Point and Rectangle
  }
}
```

Use `_` when you intentionally want a catch-all; otherwise prefer exhaustive arms so the compiler can catch new variants you forget to handle.
