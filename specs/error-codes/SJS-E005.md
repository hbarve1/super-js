# SJS-E005 — Intersection type `A & B` is not allowed

**Severity:** error  
**Category:** type-check  
**Stage:** Stage 1

## Description

TypeScript intersection types (`A & B`) are not valid SJS syntax. They allow types to be merged
silently, producing shapes that are difficult to reason about and can be unsound.

Use interface extension (`extends`) to compose named shapes explicitly.

## Example

```sjs
// ✗ error
type AdminUser = User & { role: string }    // SJS-E005
```

## Fix

```sjs
// ✓ correct — explicit extension
interface AdminUser extends User {
  role: string
}
```

If the two interfaces are from separate sources and you cannot extend them, define a new interface
that includes both sets of properties explicitly.

## Related codes

- `SJS-E008` — conditional types are also banned
- `SJS-E006` — mapped types are also banned
