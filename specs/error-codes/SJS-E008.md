# SJS-E008 — Conditional type is not allowed in SJS

**Severity:** error  
**Category:** type-check  
**Stage:** Stage 1

## Description

TypeScript conditional types (`T extends U ? A : B`) are not valid SJS syntax. They add
metaprogramming complexity without soundness guarantees.

If the goal is to select a type based on a condition, use explicit overloads or separate typed
functions instead.

## Example

```sjs
// ✗ error
type Flatten<T> = T extends Array<infer U> ? U : T    // SJS-E008
```

## Fix

Write explicit typed functions or use `unknown` + narrowing:

```sjs
// ✓ correct — explicit function per case
function flattenNumber(arr: number[]): number { return arr[0] }
function flattenString(arr: string[]): string { return arr[0] }
```

For library utility types, restructure as separate explicitly-typed interfaces or generic functions
with explicit constraints.

## Related codes

- `SJS-E005` — intersection types also banned
- `SJS-E006` — mapped types also banned
- `SJS-E009` — `infer` keyword also banned
