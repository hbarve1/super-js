# SJS-W010 — `catch` binding not typed as `Error` or `unknown` — untyped catch may hide bugs

**Severity:** warning  
**Category:** Try/catch  
**Stage:** Stage 1

## Description

In JavaScript any value can be thrown — not just `Error` instances. When a `catch` clause
binds the thrown value without a type annotation, the binding is implicitly `dynamic`, which
means every subsequent use of it bypasses type checking. This can hide null dereferences,
missing properties, and incorrect error-handling branches.

SJS emits this warning on the catch binding when it lacks an explicit annotation. The two
safe annotations are:

- `Error` — asserts that only `Error` instances are thrown; use when you control the throw
  sites and they always throw an `Error`.
- `unknown` — the most honest annotation; forces you to narrow before accessing any property,
  which prevents property-access errors on non-`Error` throws.

## Example

```sjs
// ✗ warning
try {
  riskyOperation()
} catch (e) {                        // SJS-W010 — `e` is implicitly dynamic
  console.error(e.message)           // unsafe: `e` might not be an Error
}
```

## Suppression / Fix

Annotate the catch binding as `unknown` and narrow before use (recommended):

```sjs
// ✓ correct — unknown + narrowing
try {
  riskyOperation()
} catch (e: unknown) {
  if (e instanceof Error) {
    console.error(e.message)
  } else {
    console.error("Unknown error", e)
  }
}
```

Annotate as `Error` when you are certain only `Error` instances are thrown:

```sjs
// ✓ correct — Error annotation
try {
  riskyOperation()
} catch (e: Error) {
  console.error(e.message)
}
```

## Related codes

- `SJS-W001` — implicit `dynamic` on unannotated positions in `--strict` mode
- `SJS-W002` — `dynamic` value assigned to a typed position without a narrowing check
