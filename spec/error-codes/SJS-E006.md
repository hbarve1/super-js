# SJS-E006 — Mapped type is not allowed in SJS

**Severity:** error  
**Category:** type-check  
**Stage:** Stage 1

## Description

TypeScript mapped types (`{ [P in keyof T]: ... }`) are not valid SJS syntax. They generate types
implicitly from other types through metaprogramming, making shapes harder to audit and the type
system harder to reason about statically.

Spell out the shape you need explicitly.

## Example

```sjs
// ✗ error
type Optional<T> = {
  [P in keyof T]?: T[P]    // SJS-E006
}
```

## Fix

Declare the explicit interface:

```sjs
// ✓ correct — explicit optional shape
interface OptionalUser {
  id?: number
  name?: string
  email?: string
}
```

For library code that genuinely needs parameterised shapes, restructure as explicit generic
interfaces with optional members.

## Related codes

- `SJS-E005` — intersection types are also banned
- `SJS-E008` — conditional types are also banned
