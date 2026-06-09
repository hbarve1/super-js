# Basics

Introductory SJS examples covering the core language features.

## Files (suggested reading order)

| File | Demonstrates |
|------|-------------|
| `hello-world.sjs` | Minimal SJS program, template literals |
| `variables.sjs` | `const`, `let`, `T?` nullable, destructuring, `??` |
| `functions.sjs` | Typed functions, optional params, generics, higher-order |
| `arrays.sjs` | Typed arrays, map/filter/reduce, `T?[]`, destructuring |
| `objects.sjs` | Interfaces, object literals, spread, optional chaining |
| `loops.sjs` | `for...of`, `while`, `forEach`, functional iteration |
| `control-flow.sjs` | `if/else`, ternary, `??`, sum types + `match` |
| `template-literals.sjs` | Interpolation, multi-line, tagged templates |
| `types.sjs` | Type aliases, interfaces, union types, generics |
| `classes.sjs` | Class syntax, constructor, methods |

## Key SJS Idioms

```sjs
// Nullable — T? not T|null
const name: string? = null
const display = name ?? 'Guest'

// Optional chaining
const city = user.address?.city ?? 'unknown'

// Sum type enum replacement
type Direction = | North | South | East | West
match dir { North => 0  South => 180  East => 90  West => 270 }
```
