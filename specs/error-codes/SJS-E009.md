# SJS-E009 — `infer` keyword is not allowed in SJS

**Severity:** error  
**Category:** type-check  
**Stage:** Stage 1

## Description

The TypeScript `infer` keyword is part of conditional types and is not valid SJS syntax.

## Example

```sjs
// ✗ error
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never    // SJS-E009
```

## Fix

Annotate return types explicitly rather than inferring them from function signatures at the type
level:

```sjs
// ✓ correct — annotate explicitly
function fetchUser(id: number): Promise<User> { ... }

// consumer: use the known return type directly
const result: Promise<User> = fetchUser(1)
```

## Related codes

- `SJS-E008` — conditional types are also banned
