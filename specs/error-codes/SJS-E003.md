# SJS-E003 — Property access on possibly-null value

**Severity:** error  
**Category:** null-safety  
**Stage:** Stage 0 (prototype)

## Description

Accessing a property or calling a method on a value of type `T?` without first narrowing away the
null case is a type error. SJS does not support optional chaining as a suppressor — narrow
explicitly.

## Example

```sjs
// ✗ error
function getLength(s: string?): number {
  return s.length    // SJS-E003: s might be null
}
```

## Fix

Narrow with a null check first:

```sjs
// ✓ correct
function getLength(s: string?): number {
  if (s === null) return 0
  return s.length    // s: string here
}
```

Or use optional chaining only as an expression (not as a suppressor of the error — narrow the
result):

```sjs
const len: number = s?.length ?? 0   // ✓
```

## Related codes

- `SJS-E001` — null assigned to non-nullable type
- `SJS-E011` — non-null assertion (`!`) is banned
