# types/ — SJS Type System Examples

This directory demonstrates the SJS type system: interfaces, sum types, generics,
tuples, type aliases, and union types.

## Files (reading order)

| File | Concepts |
|------|----------|
| `interfaces.sjs` | Structural (Go-style) interfaces, optional `implements`, intersection `&` |
| `union-types.sjs` | `A\|B` unions with `typeof` narrowing; when to use sum types instead |
| `literal-and-enum.sjs` | Sum types replacing `enum`; string constants for named values |
| `type-aliases.sjs` | Primitive aliases, function type aliases, `dynamic` for escape hatch |
| `tuple-types.sjs` | Fixed-length `[A, B]` tuples, destructuring, multi-return |
| `generics-advanced.sjs` | `<T: Interface>` constraints, generic classes, `Option<T>` sum type |

## Key SJS differences from TypeScript

- **No `enum`** — use sum types: `type Direction = | North | South | East | West`
- **No `Partial<T>`** — declare an explicit interface with optional fields using `?:`
- **No mapped types** — `{ [K in keyof T]: ... }` does not exist; model transformations as functions
- **No conditional types** — `T extends U ? A : B` does not exist
- **No `keyof` or `infer`**
- **`T?` means nullable** — `T | null`, not `T | undefined`
- **`dynamic`** replaces `any` — use sparingly for third-party/escape-hatch scenarios
- **Constraints use `<T: Interface>`** not `<T extends Interface>`

## Running examples

```sh
# From the prototype/ directory:
npx ts-node src/cli.ts run examples/types/interfaces.sjs
npx ts-node src/cli.ts run examples/types/union-types.sjs
npx ts-node src/cli.ts run examples/types/literal-and-enum.sjs
npx ts-node src/cli.ts run examples/types/type-aliases.sjs
npx ts-node src/cli.ts run examples/types/tuple-types.sjs
npx ts-node src/cli.ts run examples/types/generics-advanced.sjs
```
