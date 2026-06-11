# Error Reference

This directory contains worked examples for common SJS diagnostics — what triggers each error and three ways to fix it.

## Files

| File | Error Code | Description |
|------|------------|-------------|
| `SJS-E001-null-deref.sjs` | SJS-E001 | Null safety — assigning `null` to a non-nullable type |
| `SJS-E007-nonexhaustive.sjs` | SJS-E007 | Exhaustiveness — a `match` expression missing one or more arms |

## Error summaries

### SJS-E001 — Cannot assign null to non-nullable type

SJS distinguishes `string` (never null) from `string?` (nullable). Assigning `null` to a `string` variable is a compile-time error.

Fixes: declare the binding as `T?`, provide a non-null value, or narrow with `if (x === null)` / `??` before use.

### SJS-E007 — Non-exhaustive match

When matching a sum type, every variant must be covered. SJS enforces this statically so no variant is silently ignored at runtime.

Fixes: add the missing arm(s), use a wildcard `_` arm, or use an `assertNever` helper on the default branch to make omissions visible as type errors.

## Running the examples

```bash
superjs build --source errors/SJS-E001-null-deref.sjs --outDir /tmp/out && node /tmp/out/SJS-E001-null-deref.js
superjs build --source errors/SJS-E007-nonexhaustive.sjs --outDir /tmp/out && node /tmp/out/SJS-E007-nonexhaustive.js
```
